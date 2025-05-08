// src/app/api/users/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { hashPassword } from '@/lib/auth/password';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(8),
  role: z.enum(['EMT', 'ADMIN']).default('EMT'),
  certificationEndDate: z.string().optional(),
  region: z.string().optional(),
});

export async function POST(request: NextRequest) {
  // Only admins can create users
  const session = await auth(request);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const validatedData = createUserSchema.parse(body);
    
    // Hash the password
    const hashedPassword = await hashPassword(validatedData.password);
    
    // Check if user already exists
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.email, validatedData.email.toLowerCase()))
      .limit(1);
      
    if (existingUser.length > 0) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }
    
    // Create the new user
    const newUser = await db.insert(users).values({
      id: crypto.randomUUID(),
      email: validatedData.email.toLowerCase(),
      name: validatedData.name,
      password: hashedPassword,
      role: validatedData.role,
      certificationEndDate: validatedData.certificationEndDate ? new Date(validatedData.certificationEndDate) : null,
      region: validatedData.region,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      certificationEndDate: users.certificationEndDate,
      region: users.region,
      createdAt: users.createdAt,
    });
    
    return NextResponse.json(newUser[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}