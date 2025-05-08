// src/app/api/events/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { events, staffAssignments } from '@/db/schema';
import { logAudit } from '@/lib/audit';
import { eq, and, gte, lte, inArray } from 'drizzle-orm';

// Schema for creating an event
const createEventSchema = z.object({
  name: z.string().min(2),
  venueId: z.string().uuid(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  state: z.string().min(2),
  timezone: z.string(),
  notes: z.string().optional(),
});

// GET - List events with access control
export async function GET(request: NextRequest) {
  const session = await auth();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const searchParams = request.nextUrl.searchParams;
  const dateFilter = searchParams.get('date');
  
  try {
    let allEvents: typeof events.$inferSelect[] = [];
    
    // For non-admin users, we need to get their assigned events
    if (session.user.role !== 'ADMIN') {
      // Get all events where the user is assigned
      const assignedEvents = await db.select({ eventId: staffAssignments.eventId })
        .from(staffAssignments)
        .where(eq(staffAssignments.userId, session.user.id));
      
      const assignedEventIds = assignedEvents.map((e: { eventId: string }) => e.eventId);
      
      // If no assignments, return empty array
      if (assignedEventIds.length === 0) {
        return NextResponse.json([]);
      }
      
      // Apply date filter if provided
      if (dateFilter) {
        const filterDate = new Date(dateFilter);
        const nextDay = new Date(filterDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        allEvents = await db.select()
          .from(events)
          .where(and(
            inArray(events.id, assignedEventIds),
            gte(events.startDate, filterDate),
            lte(events.startDate, nextDay)
          ));
      } else {
        // No date filter, just get all assigned events
        allEvents = await db.select()
          .from(events)
          .where(inArray(events.id, assignedEventIds));
      }
    } else {
      // For admin users - they can see all events
      if (dateFilter) {
        const filterDate = new Date(dateFilter);
        const nextDay = new Date(filterDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        allEvents = await db.select()
          .from(events)
          .where(and(
            gte(events.startDate, filterDate),
            lte(events.startDate, nextDay)
          ));
      } else {
        // No date filter, get all events
        allEvents = await db.select().from(events);
      }
    }
    
    // Sort events by startDate
    const sortedEvents = [...allEvents].sort((a, b) => {
      const dateA = new Date(a.startDate);
      const dateB = new Date(b.startDate);
      return dateA.getTime() - dateB.getTime();
    });
    
    await logAudit(session.user.id, 'READ', 'EVENT');
    
    return NextResponse.json(sortedEvents);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

// POST - Create a new event (admin only)
export async function POST(request: NextRequest) {
  const session = await auth();
  
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const validatedData = createEventSchema.parse(body);
    
    const newEvent = await db.insert(events).values({
      id: crypto.randomUUID(),
      name: validatedData.name,
      venueId: validatedData.venueId,
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