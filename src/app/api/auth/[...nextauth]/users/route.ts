// src/app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { logAudit } from '@/lib/audit';

// Schema for creating a user
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(['EMT', 'ADMIN']).default('EMT'),
  certificationEndDate: z.string().optional(),
  region: z.string().optional(),
});

// GET - List users (admins only)
export async function GET(_request: NextRequest) {
  void _request;
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
