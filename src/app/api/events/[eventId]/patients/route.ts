// src/app/api/events/[eventId]/patients/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/auth';
import { db } from '@/db';
import { patients, assessments } from '@/db/schema';
import { logAudit } from '@/lib/audit';
import { sql } from 'drizzle-orm';
import { generateS3Key, uploadToS3 } from '@/lib/s3';

// Schema for creating a patient
const createPatientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dob: z.string().min(1),
  alcoholInvolved: z.boolean().default(false),
  triageTag: z.string().optional(),
  fileAttachment: z.any().optional(), // Base64 encoded file
});

// Check if user has access to the event using native SQL
async function userHasEventAccess(userId: string, userRole: string, eventId: string) {
  if (userRole === 'ADMIN') {
    return true;
  }
  
  const assignmentQuery = sql`
    SELECT id FROM staff_assignments 
    WHERE user_id = ${userId} AND event_id = ${eventId}
    LIMIT 1
  `;
  
  const result = await db.execute(assignmentQuery);
  return result.rows.length > 0;
}

// GET - List patients for an event with time-based access control
export async function GET(request: NextRequest, props: { params: Promise<{ eventId: string }> }) {
  const params = await props.params;
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check event access
    const hasAccess = await userHasEventAccess(
      session.user.id,
      session.user.role,
      params.eventId
    );
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get event details if needed for time restriction
    let timeRestrictionClause = sql``;
    
    if (session.user.role !== 'ADMIN') {
      // Get the event details to check date using native SQL
      const eventQuery = sql`
        SELECT start_date FROM events
        WHERE id = ${params.eventId}
        LIMIT 1
      `;
      
      const eventResult = await db.execute(eventQuery);
      
      if (eventResult.rows.length === 0) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }
      
      // Calculate access cutoff time (24 hours ago)
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setHours(yesterday.getHours() - 24);
      
      // Parse the event date from the result - using start_date as the column name
      const eventDay = new Date(eventResult.rows[0].start_date as string);
      eventDay.setHours(0, 0, 0, 0);
      
      // Calculate end of day for event date
      const eventDayEnd = new Date(eventDay);
      eventDayEnd.setHours(23, 59, 59, 999);
      
      // Build time restriction clause
      timeRestrictionClause = sql` AND (
        patients.created_at >= ${yesterday.toISOString()} OR 
        (patients.created_at >= ${eventDay.toISOString()} AND patients.created_at <= ${eventDayEnd.toISOString()})
      )`;
    }
    
    // Query patients using native SQL
    const patientQuery = sql`
      SELECT 
        patients.id,
        patients.first_name AS "firstName",
        patients.last_name AS "lastName",
        patients.dob AS "dob",
        patients.alcohol_involved AS "alcoholInvolved",
        patients.triage_tag AS "triageTag",
        patients.file_attachment_url AS "fileAttachmentUrl",
        patients.created_at AS "createdAt",
        assessments.status AS "status"
      FROM patients
      LEFT JOIN assessments ON patients.id = assessments.patient_id
      WHERE patients.event_id = ${params.eventId}
      ${timeRestrictionClause}
      ORDER BY patients.created_at DESC
    `;
    
    const result = await db.execute(patientQuery);
    const patientList = result.rows;
    
    await logAudit(session.user.id, 'READ', 'EVENT', params.eventId, { subresource: 'PATIENTS' });
    
    return NextResponse.json(patientList);
  } catch (error) {
    console.error('Error fetching patients:', error);
    return NextResponse.json({ error: 'Failed to fetch patients' }, { status: 500 });
  }
}

// POST - Create a new patient
export async function POST(request: NextRequest, props: { params: Promise<{ eventId: string }> }) {
  const params = await props.params;
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check event access
    const hasAccess = await userHasEventAccess(
      session.user.id,
      session.user.role,
      params.eventId
    );
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Parse the multipart form data
    const formData = await request.formData();
    const patientData = {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      dob: formData.get('dob') as string,
      alcoholInvolved: formData.get('alcoholInvolved') === 'true',
      triageTag: formData.get('triageTag') as string || undefined,
    };
    
    // Validate the data
    const validatedData = createPatientSchema.parse(patientData);
    
    // Handle file upload if present
    let fileAttachmentUrl = null;
    let s3Key = null;
    
    const file = formData.get('fileAttachment') as File;
    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      s3Key = generateS3Key('patient-attachments', file.name);
      fileAttachmentUrl = await uploadToS3(buffer, file.type, s3Key);
    }
    
    // Create patient record
    const patientId = crypto.randomUUID();
    const newPatient = await db.insert(patients).values({
      id: patientId,
      eventId: params.eventId,
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      dob: new Date(validatedData.dob),
      alcoholInvolved: validatedData.alcoholInvolved,
      triageTag: validatedData.triageTag,
      fileAttachmentUrl,
      s3Key,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: session.user.id,
      updatedBy: session.user.id,
    }).returning();
    
    // Create initial assessment record
    await db.insert(assessments).values({
      id: crypto.randomUUID(),
      patientId,
      status: 'incomplete',
      createdAt: new Date(),
      updatedAt: new Date(),
      updatedBy: session.user.id,
    });
    
    await logAudit(session.user.id, 'CREATE', 'PATIENT', patientId, {
      eventId: params.eventId,
    });
    
    return NextResponse.json(newPatient[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    
    console.error('Error creating patient:', error);
    return NextResponse.json({ error: 'Failed to create patient' }, { status: 500 });
  }
}