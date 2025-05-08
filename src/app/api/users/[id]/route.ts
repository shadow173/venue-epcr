// src/app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { logAudit } from '@/lib/audit';
import { eq, sql } from 'drizzle-orm';

// Schema for updating a user
const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(['EMT', 'ADMIN']).optional(),
  certificationEndDate: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
});

// GET - Get a specific user
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // EMTs can only view their own profile, admins can view any
  if (session.user.role !== 'ADMIN' && session.user.id !== params.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  try {
    const userResult = await db.execute(sql`SELECT * FROM ${users} WHERE ${users.id} = ${params.id} LIMIT 1`);
    const user = userResult.rows[0];
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    await logAudit(session.user.id, 'READ', 'USER', params.id);
    
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

// PATCH - Update a user
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // EMTs can only update their own profile, admins can update any
  if (session.user.role !== 'ADMIN' && session.user.id !== params.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  try {
    const body = await request.json();
    const validatedData = updateUserSchema.parse(body);
    
    // If EMT is updating, they cannot change their role
    if (session.user.role !== 'ADMIN') {
      delete validatedData.role;
    }
    
    const updatedUser = await db.update(users)
      .set({
        ...validatedData,
        certificationEndDate: validatedData.certificationEndDate ? new Date(validatedData.certificationEndDate) : null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, params.id))
      .returning();
    
    if (!updatedUser.length) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    await logAudit(session.user.id, 'UPDATE', 'USER', params.id);
    
    return NextResponse.json(updatedUser[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE - Delete a user (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const deletedUser = await db.delete(users)
      .where(eq(users.id, params.id))
      .returning();
    
    if (!deletedUser.length) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    await logAudit(session.user.id, 'DELETE', 'USER', params.id);
    
    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}