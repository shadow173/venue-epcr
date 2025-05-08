// src/app/api/events/[eventId]/staff/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { staffAssignments, users } from '@/db/schema';
import { logAudit } from '@/lib/audit';
import { eq, and, sql } from 'drizzle-orm';

// Schema for assigning staff
const assignStaffSchema = z.object({
  userId: z.string().uuid(),
  role: z.string(),
});

// GET - List staff assigned to an event
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const session = await auth();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // For admin or assigned staff only
    if (session.user.role !== 'ADMIN') {
      // Check if user is assigned to this event
      const isAssigned = await db
        .select()
        .from(staffAssignments)
        .where(sql`${staffAssignments.eventId} = ${params.eventId} AND ${staffAssignments.userId} = ${session.user.id}`)
        .limit(1);
      
      if (isAssigned.length === 0) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    
    // Get staff with user details
    const staff = await db
      .select({
        id: staffAssignments.id,
        role: staffAssignments.role,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
        },
      })
      .from(staffAssignments)
      .innerJoin(users, sql`${staffAssignments.userId} = ${users.id}`)
      .where(sql`${staffAssignments.eventId} = ${params.eventId}`);
    
    await logAudit(session.user.id, 'READ', 'EVENT', params.eventId, { subresource: 'STAFF' });
    
    return NextResponse.json(staff);
  } catch (error) {
    console.error('Error fetching staff assignments:', error);
    return NextResponse.json({ error: 'Failed to fetch staff assignments' }, { status: 500 });
  }
}

// POST - Assign staff to an event (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const session = await auth();
  
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const validatedData = assignStaffSchema.parse(body);
    
    // Check if assignment already exists
    const existingAssignment = await db
      .select()
      .from(staffAssignments)
      .where(sql`${staffAssignments.eventId} = ${params.eventId} AND ${staffAssignments.userId} = ${validatedData.userId}`)
      .limit(1);
    
    if (existingAssignment.length > 0) {
      return NextResponse.json(
        { error: 'User is already assigned to this event' },
        { status: 400 }
      );
    }
    
    // Create the assignment
    const newAssignment = await db.insert(staffAssignments).values({
      id: crypto.randomUUID(),
      userId: validatedData.userId,
      eventId: params.eventId,
      role: validatedData.role,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    
    await logAudit(
      session.user.id,
      'CREATE',
      'EVENT',
      params.eventId,
      { subresource: 'STAFF', assignedUserId: validatedData.userId }
    );
    
    return NextResponse.json(newAssignment[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    
    console.error('Error assigning staff:', error);
    return NextResponse.json({ error: 'Failed to assign staff' }, { status: 500 });
  }
}