
// src/app/api/venues/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { get } from '@/lib/auth';
import { db } from '@/db';
import { venues } from '@/db/schema';
import { logAudit } from '@/lib/audit';
import { eq } from 'drizzle-orm';

// Schema for updating a venue
const updateVenueSchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().min(5).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  notes: z.string().optional(),
});

// GET - Get a specific venue
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const venue = await db.select().from(venues).where(eq(venues.id, params.id)).limit(1);
    
    if (!venue.length) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }
    
    await logAudit(session.user.id, 'READ', 'VENUE', params.id);
    
    return NextResponse.json(venue[0]);
  } catch (error) {
    console.error('Error fetching venue:', error);
    return NextResponse.json({ error: 'Failed to fetch venue' }, { status: 500 });
  }
}

// PATCH - Update a venue (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession();
  
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const validatedData = updateVenueSchema.parse(body);
    
    const updatedVenue = await db.update(venues)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(venues.id, params.id))
      .returning();
    
    if (!updatedVenue.length) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }
    
    await logAudit(session.user.id, 'UPDATE', 'VENUE', params.id);
    
    return NextResponse.json(updatedVenue[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    
    console.error('Error updating venue:', error);
    return NextResponse.json({ error: 'Failed to update venue' }, { status: 500 });
  }
}

// DELETE - Delete a venue (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession();
  
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const deletedVenue = await db.delete(venues)
      .where(eq(venues.id, params.id))
      .returning();
    
    if (!deletedVenue.length) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }
    
    await logAudit(session.user.id, 'DELETE', 'VENUE', params.id);
    
    return NextResponse.json({ message: 'Venue deleted successfully' });
  } catch (error) {
    console.error('Error deleting venue:', error);
    return NextResponse.json({ error: 'Failed to delete venue' }, { status: 500 });
  }
}