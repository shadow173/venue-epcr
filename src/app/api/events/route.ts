// src/app/api/events/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/auth';
import { db } from '@/db';
import { events } from '@/db/schema';
import { logAudit } from '@/lib/audit';
import { sql } from 'drizzle-orm';

// Schema for creating an event
const createEventSchema = z.object({
  name: z.string().min(2),
  venueId: z.string().uuid().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  state: z.string().min(2),
  timezone: z.string(),
  notes: z.string().optional(),
});

// GET - Get all events (for admin or based on user's access)
export async function GET() {
  const session = await getServerSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // For admin, show all events
    if (session.user.role === 'ADMIN') {
      const allEvents = await db.select().from(events).orderBy(events.startDate);
      return NextResponse.json(allEvents);
    }
    
    // For non-admin, show events they're assigned to
    const result = await db.execute(
      sql`SELECT e.* 
          FROM events e
          INNER JOIN staff_assignments sa ON e.id = sa.event_id
          WHERE sa.user_id = ${session.user.id}
          ORDER BY e.start_date DESC`
    );
    
    await logAudit(session.user.id, 'READ', 'EVENT');
    
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

// POST - Create a new event (admin only)
export async function POST(request: NextRequest) {
  const session = await getServerSession();
  
  // Verify admin access
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const validatedData = createEventSchema.parse(body);
    
    // Create event with validated data
    const newEvent = await db.insert(events).values({
      id: crypto.randomUUID(),
      name: validatedData.name,
      venueId: validatedData.venueId || null,
      startDate: new Date(validatedData.startDate),
      endDate: new Date(validatedData.endDate),
      state: validatedData.state,
      timezone: validatedData.timezone,
      notes: validatedData.notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: session.user.id,
    }).returning();
    
    await logAudit(session.user.id, 'CREATE', 'EVENT', newEvent[0].id);
    
    return NextResponse.json(newEvent[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    
    console.error('Error creating event:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}