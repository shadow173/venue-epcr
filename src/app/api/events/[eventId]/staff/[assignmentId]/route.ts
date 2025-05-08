import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { staffAssignments } from '@/db/schema';
import { logAudit } from '@/lib/audit';
import { eq, and } from 'drizzle-orm';

// DELETE - Remove staff assignment (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string, assignmentId: string } }
) {
  const session = await auth();
  
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const deletedAssignment = await db.delete(staffAssignments)
      .where(
        and(
          eq(staffAssignments.id, params.assignmentId),
          eq(staffAssignments.eventId, params.eventId)
        )
      )
      .returning();
    
    if (!deletedAssignment.length) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }
    
    await logAudit(
      session.user.id,
      'DELETE',
      'EVENT',
      params.eventId,
      { subresource: 'STAFF', assignmentId: params.assignmentId }
    );
    
    return NextResponse.json({ message: 'Staff assignment removed successfully' });
  } catch (error) {
    console.error('Error removing staff assignment:', error);
    return NextResponse.json({ error: 'Failed to remove staff assignment' }, { status: 500 });
  }
}