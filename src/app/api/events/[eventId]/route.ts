// src/app/api/events/[eventId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from "@/lib/auth";
import { db } from "@/db";
import { events, venues, staffAssignments, patients, assessments, users } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { eq, and, count } from "drizzle-orm";

// Schema for updating an event
const updateEventSchema = z.object({
  name: z.string().min(2).optional(),
  venueId: z.string().uuid().optional().nullable(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  state: z.string().min(2).optional(),
  timezone: z.string().optional(),
  notes: z.string().optional().nullable(),
});

// Helper function to check if user has access to event
async function userHasAccess(userId: string, userRole: string, eventId: string): Promise<boolean> {
  // Admin has full access
  if (userRole === 'ADMIN') {
    return true;
  }
  
  // Check if user is assigned to the event
  const assignment = await db.select()
    .from(staffAssignments)
    .where(
      and(
        eq(staffAssignments.userId, userId),
        eq(staffAssignments.eventId, eventId)
      )
    )
    .limit(1);
    
  return assignment.length > 0;
}

// GET - Get a specific event with venue details and counts
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const session = await getServerSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Check access
    const hasAccess = await userHasAccess(
      session.user.id,
      session.user.role,
      params.eventId
    );
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get event with venue
    const eventData = await db.select({
      id: events.id,
      name: events.name,
      startDate: events.startDate,
      endDate: events.endDate,
      state: events.state,
      timezone: events.timezone,
      notes: events.notes,
      createdAt: events.createdAt,
      venue: {
        id: venues.id,
        name: venues.name,
        address: venues.address,
        city: venues.city,
        state: venues.state,
        zipCode: venues.zipCode,
        notes: venues.notes,
      }
    })
    .from(events)
    .leftJoin(venues, eq(events.venueId, venues.id))
    .where(eq(events.id, params.eventId))
    .limit(1);
    
    if (eventData.length === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Get staff count
    const staffCount = await db.select({
      count: count()
    })
    .from(staffAssignments)
    .where(eq(staffAssignments.eventId, params.eventId));
    
    // Get patient count
    const patientCount = await db.select({
      count: count()
    })
    .from(patients)
    .where(eq(patients.eventId, params.eventId));
    
    // Get staff details
    const staffData = await db.select({
      id: staffAssignments.id,
      eventId: staffAssignments.eventId,
      userId: staffAssignments.userId,
      role: staffAssignments.role,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      }
    })
    .from(staffAssignments)
    .innerJoin(users, eq(staffAssignments.userId, users.id))
    .where(eq(staffAssignments.eventId, params.eventId));
    
    // Get patient details with status
    const patientData = await db.select({
      id: patients.id,
      firstName: patients.firstName,
      lastName: patients.lastName,
      dob: patients.dob,
      triageTag: patients.triageTag,
      status: assessments.status,
      createdAt: patients.createdAt,
    })
    .from(patients)
    .leftJoin(assessments, eq(patients.id, assessments.patientId))
    .where(eq(patients.eventId, params.eventId));
    
    // Determine if user can edit this event
    const canEdit = session.user.role === 'ADMIN';
    
    // Combine all data
    const result = {
      ...eventData[0],
      staff: staffData,
      patients: patientData,
      staffCount: staffCount[0].count,
      patientCount: patientCount[0].count,
      canEdit,
    };
    
    await logAudit(session.user.id, 'READ', 'EVENT', params.eventId);
    
    return NextResponse.json(result);
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
  const session = await getServerSession();
  
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const validatedData = updateEventSchema.parse(body);
    
    // Create update data object with only the fields provided
    const updateData: Record<string, string | Date | null> = {
      updatedAt: new Date(),
    };
    
    // Only add provided fields to the update object
    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name;
    }
    
    if (validatedData.venueId !== undefined) {
      updateData.venueId = validatedData.venueId;
    }
    
    if (validatedData.state !== undefined) {
      updateData.state = validatedData.state;
    }
    
    if (validatedData.timezone !== undefined) {
      updateData.timezone = validatedData.timezone;
    }
    
    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes;
    }
    
    // Convert string dates to Date objects
    if (validatedData.startDate !== undefined) {
      updateData.startDate = new Date(validatedData.startDate);
    }
    
    if (validatedData.endDate !== undefined) {
      updateData.endDate = new Date(validatedData.endDate);
    }
    
    // Update event
    const updatedEvent = await db.update(events)
      .set(updateData)
      .where(eq(events.id, params.eventId))
      .returning();
    
    if (!updatedEvent.length) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    await logAudit(session.user.id, 'UPDATE', 'EVENT', params.eventId);
    
    return NextResponse.json(updatedEvent[0]);
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
  const session = await getServerSession();
  
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Delete event - Note: This assumes cascading deletes are set up in the database
    const deletedEvent = await db.delete(events)
      .where(eq(events.id, params.eventId))
      .returning();
    
    if (!deletedEvent.length) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    await logAudit(session.user.id, 'DELETE', 'EVENT', params.eventId);
    
    return NextResponse.json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}