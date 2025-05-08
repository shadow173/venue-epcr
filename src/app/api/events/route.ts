// src/app/api/events/[eventId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { logAudit } from '@/lib/audit';
import { sql, SQLWrapper } from 'drizzle-orm';

// Schema for updating an event
const updateEventSchema = z.object({
  name: z.string().min(2).optional(),
  venueId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  state: z.string().min(2).optional(),
  timezone: z.string().optional(),
  notes: z.string().optional(),
});

// Type for database records
type EventRecord = Record<string, unknown>;
type VenueNestedResult = EventRecord & {
  venue_id?: string;
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  state: string;
  timezone: string;
  notes?: string;
  createdAt: string;
  'venue.id'?: string;
  'venue.name'?: string;
  'venue.address'?: string;
  'venue.city'?: string;
  'venue.state'?: string;
  'venue.zipCode'?: string;
};

// Check if user has access to the event
async function userHasEventAccess(userId: string, userRole: string, eventId: string): Promise<boolean> {
  if (userRole === 'ADMIN') {
    return true;
  }
  
  // Use the execute method with raw SQL query
  const result = await db.execute<EventRecord>(
    sql`SELECT * FROM staff_assignments 
        WHERE user_id = ${userId} AND event_id = ${eventId} 
        LIMIT 1`
  );
  
  return result.rows.length > 0;
}

// GET - Get a specific event with venue details
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const session = await auth();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Check access
    const hasAccess = await userHasEventAccess(
      session.user.id,
      session.user.role,
      params.eventId
    );
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Use execute method with SQL for query
    const result = await db.execute<VenueNestedResult>(
      sql`SELECT 
            e.id, e.name, e.start_date as "startDate", e.end_date as "endDate", 
            e.state, e.timezone, e.notes, e.created_at as "createdAt",
            v.id as "venue.id", v.name as "venue.name", v.address as "venue.address", 
            v.city as "venue.city", v.state as "venue.state", v.zip_code as "venue.zipCode"
          FROM events e
          LEFT JOIN venues v ON e.venue_id = v.id
          WHERE e.id = ${params.eventId}
          LIMIT 1`
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    // Get the first row
    const eventData = result.rows[0];
    
    // Transform the flat result into a nested object structure
    const transformedEvent = {
      id: eventData.id,
      name: eventData.name,
      startDate: eventData.startDate,
      endDate: eventData.endDate,
      state: eventData.state,
      timezone: eventData.timezone,
      notes: eventData.notes,
      createdAt: eventData.createdAt,
      venue: {
        id: eventData['venue.id'],
        name: eventData['venue.name'],
        address: eventData['venue.address'],
        city: eventData['venue.city'],
        state: eventData['venue.state'],
        zipCode: eventData['venue.zipCode']
      }
    };
    
    await logAudit(session.user.id, 'READ', 'EVENT', params.eventId);
    
    return NextResponse.json(transformedEvent);
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
  }
}

// PATCH - Update an event (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const session = await auth();
  
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const validatedData = updateEventSchema.parse(body);
    
    // Create update data object directly, transforming dates at point of use
    const updatedAt = new Date();
    
    // Build the SET clause dynamically
    const setClauses: SQLWrapper[] = [];
    if (validatedData.name !== undefined) setClauses.push(sql`name = ${validatedData.name}`);
    if (validatedData.venueId !== undefined) setClauses.push(sql`venue_id = ${validatedData.venueId}`);
    if (validatedData.startDate !== undefined) setClauses.push(sql`start_date = ${new Date(validatedData.startDate)}`);
    if (validatedData.endDate !== undefined) setClauses.push(sql`end_date = ${new Date(validatedData.endDate)}`);
    if (validatedData.state !== undefined) setClauses.push(sql`state = ${validatedData.state}`);
    if (validatedData.timezone !== undefined) setClauses.push(sql`timezone = ${validatedData.timezone}`);
    if (validatedData.notes !== undefined) setClauses.push(sql`notes = ${validatedData.notes}`);
    setClauses.push(sql`updated_at = ${updatedAt}`);
    
    // Join all SET clauses with commas
    const setClause = sql.join(setClauses, sql`, `);
    
    // Execute the update query
    const result = await db.execute<EventRecord>(
      sql`UPDATE events SET ${setClause} WHERE id = ${params.eventId} RETURNING *`
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    await logAudit(session.user.id, 'UPDATE', 'EVENT', params.eventId);
    
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    
    console.error('Error updating event:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

// DELETE - Delete an event (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const session = await auth();
  
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const result = await db.execute<EventRecord>(
      sql`DELETE FROM events WHERE id = ${params.eventId} RETURNING *`
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    await logAudit(session.user.id, 'DELETE', 'EVENT', params.eventId);
    
    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}