// src/app/api/patients/[patientId]/assessment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/auth';
import { db } from '@/db';
import { assessments, patients, events, staffAssignments } from '@/db/schema';
import { logAudit } from '@/lib/audit';
import { eq, and } from 'drizzle-orm';

// Schema for updating assessment
const updateAssessmentSchema = z.object({
  chiefComplaint: z.string().optional().nullable(),
  narrative: z.string().optional().nullable(),
  disposition: z.string().optional().nullable(),
  hospitalName: z.string().optional().nullable(),
  emsUnit: z.string().optional().nullable(),
  patientSignature: z.string().optional().nullable(),
  emtSignature: z.string().optional().nullable(),
  status: z.enum(['incomplete', 'complete']).optional(),
});

// Define the type for updateData based on the schema
type UpdateAssessmentData = z.infer<typeof updateAssessmentSchema> & {
  updatedAt: Date;
  updatedBy: string;
  patientSignatureTimestamp?: Date;
  emtSignatureTimestamp?: Date;
};

// Check if user has access to the patient
async function userHasPatientAccess(userId: string, userRole: string, patientId: string) {
  // Admin has full access
  if (userRole === 'ADMIN') {
    return true;
  }
  
  // Get patient and event info
  const patientRecord = await db
    .select({
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
  const assignments = await db
    .select()
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

// PATCH - Update assessment
export async function PATCH(request: NextRequest, props: { params: Promise<{ patientId: string }> }) {
  const params = await props.params;
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
    
    const body = await request.json();
    const validatedData = updateAssessmentSchema.parse(body);
    
    // Prepare update data
    const updateData: UpdateAssessmentData = {
      ...validatedData,
      updatedAt: new Date(),
      updatedBy: session.user.id,
    };
    
    // Add timestamps for signatures if provided
    if (validatedData.patientSignature) {
      updateData.patientSignatureTimestamp = new Date();
    }
    
    if (validatedData.emtSignature) {
      updateData.emtSignatureTimestamp = new Date();
    }
    
    // Update assessment
    const updatedAssessment = await db.update(assessments)
      .set(updateData)
      .where(eq(assessments.patientId, params.patientId))
      .returning();
    
    if (!updatedAssessment.length) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }
    
    await logAudit(session.user.id, 'UPDATE', 'ASSESSMENT', updatedAssessment[0].id, {
      patientId: params.patientId,
      status: updatedAssessment[0].status,
    });
    
    return NextResponse.json(updatedAssessment[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    
    console.error('Error updating assessment:', error);
    return NextResponse.json({ error: 'Failed to update assessment' }, { status: 500 });
  }
}