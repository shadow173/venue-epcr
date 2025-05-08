// src/app/api/patients/[patientId]/vitals/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/auth';
import { db } from '@/db';
import { vitals, assessments, patients, events, staffAssignments } from '@/db/schema';
import { logAudit } from '@/lib/audit';
import { eq, and, desc } from 'drizzle-orm';

// Schema for creating vitals
const createVitalsSchema = z.object({
  bloodPressure: z.string().optional(),
  heartRate: z.number().optional(),
  respiratoryRate: z.number().optional(),
  oxygenSaturation: z.number().optional(),
  temperature: z.number().optional(),
  glucoseLevel: z.number().optional(),
  painScale: z.number().min(0).max(10).optional(),
  notes: z.string().optional(),
  timestamp: z.string().datetime().optional(),
});

// Check if user has access to the patient
async function userHasPatientAccess(userId: string, userRole: string, patientId: string) {
  // Admin has full access
  if (userRole === 'ADMIN') {
    return true;
  }
  
  // Get patient and event info
  const patientRecord = await db.select({
    eventId: patients.eventId,
    createdAt: patients.createdAt,
    eventStartDate: events.startDate,
  })
  .from(patients)
  .innerJoin(events, eq(patients.eventId, events.id))
  .where(eq(patients.id, patientId))
  .limit(1);
  
  if (patientRecord.length === 0) {
    return false;
  }
  
  // Check if user is assigned to the event
  const assignments = await db.select()
    .from(staffAssignments)
    .where(
      and(
        eq(staffAssignments.userId, userId),
        eq(staffAssignments.eventId, patientRecord[0].eventId)
      )
    )
    .limit(1);
  
  if (assignments.length === 0) {
    return false;
  }
  
  // Calculate time thresholds
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setHours(yesterday.getHours() - 24);
  
  const patientCreatedAt = new Date(patientRecord[0].createdAt);
  
  // Check if created within last 24 hours
  if (patientCreatedAt >= yesterday) {
    return true;
  }
  
  // Check if created on the same day as the event
  const eventDay = new Date(patientRecord[0].eventStartDate);
  eventDay.setHours(0, 0, 0, 0);
  
  const patientDay = new Date(patientCreatedAt);
  patientDay.setHours(0, 0, 0, 0);
  
  return patientDay.getTime() === eventDay.getTime();
}

// GET - Get vitals for a patient
export async function GET(
  request: NextRequest,
  { params }: { params: { patientId: string } }
) {
  const session = await getServerSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Check access
    const hasAccess = await userHasPatientAccess(
      session.user.id,
      session.user.role,
      params.patientId
    );
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get assessment ID
    const assessment = await db.select({
      id: assessments.id
    })
    .from(assessments)
    .where(eq(assessments.patientId, params.patientId))
    .limit(1);
    
    if (!assessment.length) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }
    
    // Get vitals
    const patientVitals = await db.select()
      .from(vitals)
      .where(eq(vitals.assessmentId, assessment[0].id))
      .orderBy(desc(vitals.timestamp));
    
    await logAudit(session.user.id, 'READ', 'VITAL', undefined, {
      patientId: params.patientId,
      assessmentId: assessment[0].id,
    });
    
    return NextResponse.json(patientVitals);
  } catch (error) {
    console.error('Error fetching vitals:', error);
    return NextResponse.json({ error: 'Failed to fetch vitals' }, { status: 500 });
  }
}

// POST - Create vitals
export async function POST(
  request: NextRequest,
  { params }: { params: { patientId: string } }
) {
  const session = await getServerSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Check access
    const hasAccess = await userHasPatientAccess(
      session.user.id,
      session.user.role,
      params.patientId
    );
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get assessment ID
    const assessment = await db.select({
      id: assessments.id
    })
    .from(assessments)
    .where(eq(assessments.patientId, params.patientId))
    .limit(1);
    
    if (!assessment.length) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }
    
    const body = await request.json();
    const validatedData = createVitalsSchema.parse(body);
    
    // Convert temperature to string if provided
    const temperatureValue = validatedData.temperature ? 
      validatedData.temperature.toString() : 
      undefined;
    
    // Create vitals record - don't manually specify ID
    const newVitals = await db.insert(vitals).values({
      assessmentId: assessment[0].id,
      bloodPressure: validatedData.bloodPressure,
      heartRate: validatedData.heartRate,
      respiratoryRate: validatedData.respiratoryRate,
      oxygenSaturation: validatedData.oxygenSaturation,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      temperature: temperatureValue as any, // Type cast to resolve schema mismatch
      glucoseLevel: validatedData.glucoseLevel,
      painScale: validatedData.painScale,
      notes: validatedData.notes,
      timestamp: validatedData.timestamp ? new Date(validatedData.timestamp) : new Date(),
      createdAt: new Date(),
      createdBy: session.user.id,
    }).returning();
    
    await logAudit(session.user.id, 'CREATE', 'VITAL', newVitals[0].id, {
      patientId: params.patientId,
      assessmentId: assessment[0].id,
    });
    
    return NextResponse.json(newVitals[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    
    console.error('Error creating vitals:', error);
    return NextResponse.json({ error: 'Failed to create vitals' }, { status: 500 });
  }
}