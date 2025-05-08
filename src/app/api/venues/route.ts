// src/app/api/venues/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { venues } from '@/db/schema';
import { logAudit } from '@/lib/audit';

// Schema for creating a venue
const createVenueSchema = z.object({
  name: z.string().min(2),
  address: z.string().min(5),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  notes: z.string().optional(),
});

// GET - List venues
export async function GET() {
  const session = await auth();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const allVenues = await db.select().from(venues);
    
    await logAudit(session.user.id, 'READ', 'VENUE');
    
    return NextResponse.json(allVenues);
  } catch (error) {
    console.error('Error fetching venues:', error);
    return NextResponse.json({ error: 'Failed to fetch venues' }, { status: 500 });
  }
}

// POST - Create a new venue (admin only)
export async function POST(request: NextRequest) {
  const session = await auth();
  
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const validatedData = createVenueSchema.parse(body);
    
    const newVenue = await db.insert(venues).values({
      id: crypto.randomUUID(),
      name: validatedData.name,
      address: validatedData.address,
      city: validatedData.city,
      state: validatedData.state,
      zipCode: validatedData.zipCode,
      notes: validatedData.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: session.user.id,
    }).returning();
    
    await logAudit(session.user.id, 'CREATE', 'VENUE', newVenue[0].id);
    
    return NextResponse.json(newVenue[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    
    console.error('Error creating venue:', error);
    return NextResponse.json({ error: 'Failed to create venue' }, { status: 500 });
  }
}
