import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { patients, assessments, vitals, treatments, staffAssignments, events } from '@/db/schema';
import { logAudit } from '@/lib/audit';
import { eq, and, desc } from 'drizzle-orm';
import { generateS3Key, uploadToS3, deleteFromS3 } from '@/lib/s3';

// Schema for updating a patient
const updatePatientSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  dob: z.string().min(1).optional(),
  alcoholInvolved: z.boolean().optional(),
  triageTag: z.string().optional().nullable(),
});

// Define the update data type
type PatientUpdateData = {
  firstName?: string;
  lastName?: string;
  dob?: Date;
  alcoholInvolved?: boolean;
  triageTag?: string | null;
  updatedAt: Date;
  updatedBy: string;
  fileAttachmentUrl?: string;
  s3Key?: string;
};

// Check if user has access to the patient
async function userHasPatientAccess(userId: string, userRole: string, eventId: string, patientId: string) {
  // Admin has full access
  if (userRole === 'ADMIN') {
    return true;
  }
  
  // Check if user is assigned to the event
  const assignments = await db.select()
    .from(staffAssignments)
    .where(
      and(
        eq(staffAssignments.userId, userId),
        eq(staffAssignments.eventId, eventId)
      )
    )
    .limit(1);
  
  if (assignments.length === 0) {
    return false;
  }
  
  // For EMTs, check time restrictions (24 hours or same day access)
  const patientRecord = await db.select({
    createdAt: patients.createdAt,
    eventStartDate: events.startDate,
  })
  .from(patients)
  .innerJoin(events, eq(patients.eventId, events.id))
  .where(
    and(
      eq(patients.id, patientId),
      eq(patients.eventId, eventId)
    )
  )
  .limit(1);
  
  if (patientRecord.length === 0) {
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

// GET - Get a specific patient with assessment data
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string, patientId: string } }
) {
  const session = await auth();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Check access
    const hasAccess = await userHasPatientAccess(
      session.user.id,
      session.user.role,
      params.eventId,
      params.patientId
    );
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get patient with assessment
    const patientData = await db.select({
      id: patients.id,
      firstName: patients.firstName,
      lastName: patients.lastName,
      dob: patients.dob,
      alcoholInvolved: patients.alcoholInvolved,
      triageTag: patients.triageTag,
      fileAttachmentUrl: patients.fileAttachmentUrl,
      createdAt: patients.createdAt,
      assessment: {
        id: assessments.id,
        chiefComplaint: assessments.chiefComplaint,
        narrative: assessments.narrative,
        disposition: assessments.disposition,
        hospitalName: assessments.hospitalName,
        emsUnit: assessments.emsUnit,
        patientSignature: assessments.patientSignature,
        patientSignatureTimestamp: assessments.patientSignatureTimestamp,
        emtSignature: assessments.emtSignature,
        emtSignatureTimestamp: assessments.emtSignatureTimestamp,
        status: assessments.status,
      }
    })
    .from(patients)
    .leftJoin(assessments, eq(patients.id, assessments.patientId))
    .where(
      and(
        eq(patients.id, params.patientId),
        eq(patients.eventId, params.eventId)
      )
    )
    .limit(1);
    
    if (!patientData.length) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    
    // Get vitals if assessment exists
    const patientVitals = patientData[0].assessment?.id 
      ? await db.select()
          .from(vitals)
          .where(eq(vitals.assessmentId, patientData[0].assessment.id))
          .orderBy(desc(vitals.timestamp))
      : [];
    
    // Get treatments if assessment exists
    const patientTreatments = patientData[0].assessment?.id
      ? await db.select()
          .from(treatments)
          .where(eq(treatments.assessmentId, patientData[0].assessment.id))
          .orderBy(desc(treatments.timestamp))
      : [];
    
    // Combine all data
    const result = {
      ...patientData[0],
      assessment: patientData[0].assessment
        ? {
            ...patientData[0].assessment,
            vitals: patientVitals,
            treatments: patientTreatments,
          }
        : null
    };
    
    await logAudit(session.user.id, 'READ', 'PATIENT', params.patientId);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching patient:', error);
    return NextResponse.json({ error: 'Failed to fetch patient' }, { status: 500 });
  }
}

// PATCH - Update patient information
export async function PATCH(
  request: NextRequest,
  { params }: { params: { eventId: string, patientId: string } }
) {
  const session = await auth();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Check access
    const hasAccess = await userHasPatientAccess(
      session.user.id,
      session.user.role,
      params.eventId,
      params.patientId
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
      triageTag: formData.get('triageTag') as string || null,
    };
    
    // Validate the data
    const validatedData = updatePatientSchema.parse(patientData);
    
    // Prepare update data
    const updateData: PatientUpdateData = {
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      alcoholInvolved: validatedData.alcoholInvolved,
      triageTag: validatedData.triageTag,
      updatedAt: new Date(),
      updatedBy: session.user.id,
    };
    
    // Convert DOB to Date object if present
    if (validatedData.dob) {
      updateData.dob = new Date(validatedData.dob);
    }
    
    // Handle file upload if present
    const file = formData.get('fileAttachment') as File;
    if (file && file.size > 0) {
      // Get existing patient record to check for old file
      const existingPatient = await db.select({
        s3Key: patients.s3Key
      })
      .from(patients)
      .where(eq(patients.id, params.patientId))
      .limit(1);
      
      // Delete old file if exists
      if (existingPatient.length > 0 && existingPatient[0].s3Key) {
        await deleteFromS3(existingPatient[0].s3Key);
      }
      
      // Upload new file
      const buffer = Buffer.from(await file.arrayBuffer());
      const s3Key = generateS3Key('patient-attachments', file.name);
      const fileAttachmentUrl = await uploadToS3(buffer, file.type, s3Key);
      
      updateData.fileAttachmentUrl = fileAttachmentUrl;
      updateData.s3Key = s3Key;
    }
    
    // Update patient record
    const updatedPatient = await db.update(patients)
      .set(updateData)
      .where(
        and(
          eq(patients.id, params.patientId),
          eq(patients.eventId, params.eventId)
        )
      )
      .returning();
    
    if (!updatedPatient.length) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    
    await logAudit(session.user.id, 'UPDATE', 'PATIENT', params.patientId);
    
    return NextResponse.json(updatedPatient[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    
    console.error('Error updating patient:', error);
    return NextResponse.json({ error: 'Failed to update patient' }, { status: 500 });
  }
}

// DELETE - Delete a patient (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string, patientId: string } }
) {
  const session = await auth();
  
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Get patient record to check for S3 file
    const patientRecord = await db.select({
      s3Key: patients.s3Key
    })
    .from(patients)
    .where(
      and(
        eq(patients.id, params.patientId),
        eq(patients.eventId, params.eventId)
      )
    )
    .limit(1);
    
    if (!patientRecord.length) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    
    // Delete file from S3 if exists
    if (patientRecord[0].s3Key) {
      await deleteFromS3(patientRecord[0].s3Key);
    }
    
    // Delete patient record
    await db.delete(patients)
      .where(
        and(
          eq(patients.id, params.patientId),
          eq(patients.eventId, params.eventId)
        )
      );
    
    await logAudit(session.user.id, 'DELETE', 'PATIENT', params.patientId);
    
    return NextResponse.json({ message: 'Patient deleted successfully' });
  } catch (error) {
    console.error('Error deleting patient:', error);
    return NextResponse.json({ error: 'Failed to delete patient' }, { status: 500 });
  }
}