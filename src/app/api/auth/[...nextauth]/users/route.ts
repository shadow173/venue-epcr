// src/app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { logAudit } from '@/lib/audit';
import { eq } from 'drizzle-orm';

// Schema for creating a user
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(['EMT', 'ADMIN']).default('EMT'),
  certificationEndDate: z.string().optional(),
  region: z.string().optional(),
});

// GET - List users (admins only)
export async function GET(request: NextRequest) {
  const session = await auth();
  
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const allUsers = await db.select().from(users);
    
    await logAudit(session.user.id, 'READ', 'USER');
    
    return NextResponse.json(allUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST - Create a new user (admins only)
export async function POST(request: NextRequest) {
  const session = await auth();
  
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const validatedData = createUserSchema.parse(body);
    
    const newUser = await db.insert(users).values({
      id: crypto.randomUUID(),
      email: validatedData.email,
      name: validatedData.name,
      role: validatedData.role,
      certificationEndDate: validatedData.certificationEndDate ? new Date(validatedData.certificationEndDate) : null,
      region: validatedData.region,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    
    await logAudit(session.user.id, 'CREATE', 'USER', newUser[0].id);
    
    return NextResponse.json(newUser[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

// src/app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { logAudit } from '@/lib/audit';
import { eq } from 'drizzle-orm';

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
    const user = await db.select().from(users).where(eq(users.id, params.id)).limit(1);
    
    if (!user.length) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    await logAudit(session.user.id, 'READ', 'USER', params.id);
    
    return NextResponse.json(user[0]);
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