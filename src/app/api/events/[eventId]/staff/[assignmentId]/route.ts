// src/app/api/events/[eventId]/staff/[assignmentId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "@/lib/auth";
import { db } from "@/db";
import { staffAssignments } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { eq, and } from "drizzle-orm";

// DELETE - Remove staff assignment (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string, assignmentId: string } }
) {
  const session = await getServerSession();
  
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Extract params
    const { eventId, assignmentId } = params;
    
    // Delete the assignment
    const deletedAssignment = await db.delete(staffAssignments)
      .where(
        and(
          eq(staffAssignments.id, assignmentId),
          eq(staffAssignments.eventId, eventId)
        )
      )
      .returning();
      
    if (deletedAssignment.length === 0) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }
    
    await logAudit(
      session.user.id,
      'DELETE',
      'EVENT',
      eventId,
      { subresource: 'STAFF', assignmentId: assignmentId }
    );
    
    return NextResponse.json({ message: 'Staff assignment removed successfully' });
  } catch (error) {
    console.error('Error removing staff assignment:', error);
    return NextResponse.json({ error: 'Failed to remove staff assignment' }, { status: 500 });
  }
}