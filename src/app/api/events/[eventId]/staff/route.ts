// src/app/api/events/[eventId]/staff/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from '@/lib/auth';
import { db } from '@/db';
import { logAudit } from '@/lib/audit';
import { sql } from 'drizzle-orm';

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
  const session = await getServerSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // For admin or assigned staff only
    if (session.user.role !== 'ADMIN') {
      // Check if user is assigned to this event using raw SQL
      const isAssigned = await db.execute(sql`
        SELECT * FROM staff_assignments 
        WHERE event_id = ${params.eventId} AND user_id = ${session.user.id}
        LIMIT 1
      `);
      
      if (isAssigned.rows.length === 0) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    
    // Get staff with user details using raw SQL
    const staff = await db.execute(sql`
      SELECT 
        sa.id, 
        sa.role, 
        u.id as user_id, 
        u.name as user_name, 
        u.email as user_email, 
        u.role as user_role
      FROM staff_assignments sa
      INNER JOIN users u ON sa.user_id = u.id
      WHERE sa.event_id = ${params.eventId}
    `);
    
    // Transform the result to match the expected format
    const formattedStaff = staff.rows.map(row => ({
      id: row.id,
      role: row.role,
      user: {
        id: row.user_id,
        name: row.user_name,
        email: row.user_email,
        role: row.user_role,
      }
    }));
    
    await logAudit(session.user.id, 'READ', 'EVENT', params.eventId, { subresource: 'STAFF' });
    
    return NextResponse.json(formattedStaff);
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
  const session = await getServerSession();
  
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const validatedData = assignStaffSchema.parse(body);
    
    // Check if assignment already exists using raw SQL
    const existingAssignment = await db.execute(sql`
      SELECT * FROM staff_assignments
      WHERE event_id = ${params.eventId} AND user_id = ${validatedData.userId}
      LIMIT 1
    `);
    
    if (existingAssignment.rows.length > 0) {
      return NextResponse.json(
        { error: 'User is already assigned to this event' },
        { status: 400 }
      );
    }
    
    // Create the assignment using raw SQL
    const newId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const newAssignment = await db.execute(sql`
      INSERT INTO staff_assignments (id, user_id, event_id, role, created_at, updated_at)
      VALUES (${newId}, ${validatedData.userId}, ${params.eventId}, ${validatedData.role}, ${now}, ${now})
      RETURNING *
    `);
    
    await logAudit(
      session.user.id,
      'CREATE',
      'EVENT',
      params.eventId,
      { subresource: 'STAFF', assignedUserId: validatedData.userId }
    );
    
    return NextResponse.json(newAssignment.rows[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    
    console.error('Error assigning staff:', error);
    return NextResponse.json({ error: 'Failed to assign staff' }, { status: 500 });
  }
}