// src/app/api/admin/reports/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { logAudit } from '@/lib/audit';
import { sql } from 'drizzle-orm';

// Schema for search parameters
const searchParamsSchema = z.object({
  eventId: z.string().uuid().optional(),
  venueId: z.string().uuid().optional(),
  patientName: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['incomplete', 'complete']).optional(),
  page: z.number().default(1),
  limit: z.number().default(20),
});

// GET - Admin search and reporting endpoint
export async function GET(request: NextRequest) {
  const session = await auth();
  
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse and validate query parameters
    const validatedParams = searchParamsSchema.parse({
      eventId: searchParams.get('eventId') || undefined,
      venueId: searchParams.get('venueId') || undefined,
      patientName: searchParams.get('patientName') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      status: searchParams.get('status') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
    });
    
    // Calculate pagination
    const offset = (validatedParams.page - 1) * validatedParams.limit;
    
    // Build SQL query directly with parameters
    // This approach bypasses the TypeScript issues with the query builder
    const sqlQuery = sql`
      WITH filtered_patients AS (
        SELECT 
          patients.id,
          patients.first_name,
          patients.last_name,
          patients.dob,
          patients.created_at,
          events.id AS event_id,
          events.name AS event_name,
          events.start_date AS event_start_date,
          venues.id AS venue_id,
          venues.name AS venue_name,
          assessments.id AS assessment_id,
          assessments.status,
          assessments.disposition,
          patients.created_by
        FROM patients
        INNER JOIN events ON patients.event_id = events.id
        INNER JOIN venues ON events.venue_id = venues.id
        LEFT JOIN assessments ON patients.id = assessments.patient_id
        WHERE 1=1
        ${validatedParams.eventId ? sql` AND events.id = ${validatedParams.eventId}` : sql``}
        ${validatedParams.venueId ? sql` AND venues.id = ${validatedParams.venueId}` : sql``}
        ${validatedParams.patientName ? sql` AND (
          patients.first_name ILIKE ${'%' + validatedParams.patientName + '%'} OR 
          patients.last_name ILIKE ${'%' + validatedParams.patientName + '%'}
        )` : sql``}
        ${validatedParams.startDate ? sql` AND patients.created_at >= ${new Date(validatedParams.startDate)}` : sql``}
        ${validatedParams.endDate ? sql` AND patients.created_at <= ${new Date(validatedParams.endDate).setHours(23, 59, 59, 999)}` : sql``}
        ${validatedParams.status ? sql` AND assessments.status = ${validatedParams.status}` : sql``}
        ORDER BY patients.created_at DESC
        LIMIT ${validatedParams.limit} OFFSET ${offset}
      )
      SELECT 
        fp.*,
        users.id AS creator_id,
        users.name AS creator_name
      FROM filtered_patients fp
      LEFT JOIN users ON fp.created_by = users.id
    `;
    
    // Execute the query
    const results = await db.execute(sqlQuery);
    
    // Get the total count using a similar query without pagination
    const countQuery = sql`
      SELECT COUNT(*) AS total
      FROM patients
      INNER JOIN events ON patients.event_id = events.id
      INNER JOIN venues ON events.venue_id = venues.id
      LEFT JOIN assessments ON patients.id = assessments.patient_id
      WHERE 1=1
      ${validatedParams.eventId ? sql` AND events.id = ${validatedParams.eventId}` : sql``}
      ${validatedParams.venueId ? sql` AND venues.id = ${validatedParams.venueId}` : sql``}
      ${validatedParams.patientName ? sql` AND (
        patients.first_name ILIKE ${'%' + validatedParams.patientName + '%'} OR 
        patients.last_name ILIKE ${'%' + validatedParams.patientName + '%'}
      )` : sql``}
      ${validatedParams.startDate ? sql` AND patients.created_at >= ${new Date(validatedParams.startDate)}` : sql``}
      ${validatedParams.endDate ? sql` AND patients.created_at <= ${new Date(validatedParams.endDate).setHours(23, 59, 59, 999)}` : sql``}
      ${validatedParams.status ? sql` AND assessments.status = ${validatedParams.status}` : sql``}
    `;
    
    const countResult = await db.execute(countQuery);
    const total = Number(countResult.rows[0]?.total || 0);    
    // Format results for response
    const formattedResults = results.rows.map(row => ({
      patientId: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      dob: row.dob,
      createdAt: row.created_at,
      eventId: row.event_id,
      eventName: row.event_name,
      eventStartDate: row.event_start_date,
      venueId: row.venue_id,
      venueName: row.venue_name,
      assessmentId: row.assessment_id,
      status: row.status,
      disposition: row.disposition,
      creator: row.creator_id ? {
        id: row.creator_id,
        name: row.creator_name
      } : null
    }));
    
    // Audit log
    await logAudit(session.user.id, 'READ', 'PATIENT', undefined, {
      action: 'REPORT',
      filters: validatedParams,
    });
    
    return NextResponse.json({
      data: formattedResults,
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        total,
        totalPages: Math.ceil(total / validatedParams.limit),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    
    console.error('Error generating report:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}