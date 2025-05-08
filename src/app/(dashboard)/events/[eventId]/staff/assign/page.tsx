// src/app/(dashboard)/events/[eventId]/staff/assign/page.tsx
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "@/lib/auth";
import { db } from "@/db";
import { events, users, staffAssignments } from "@/db/schema";
import { eq, not, inArray } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { StaffAssignmentForm } from "@/components/staff/staff-assignment-form";

// Get event data
async function getEvent(eventId: string) {
  try {
    const eventData = await db.select({
      id: events.id,
      name: events.name,
    })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
    
    return eventData.length ? eventData[0] : null;
  } catch (error) {
    console.error("Error fetching event:", error);
    return null;
  }
}

// Get available users (those not already assigned)
async function getAvailableUsers(eventId: string) {
  try {
    // First get the list of already assigned users
    const assignedUsers = await db.select({ userId: staffAssignments.userId })
      .from(staffAssignments)
      .where(eq(staffAssignments.eventId, eventId));
    
    const assignedUserIds = assignedUsers.map(a => a.userId);
    
    // Then get all users who are not in that list
    if (assignedUserIds.length > 0) {
      return await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(not(inArray(users.id, assignedUserIds)))
      .orderBy(users.name);
    } else {
      // If no users are assigned yet, return all users
      return await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .orderBy(users.name);
    }
  } catch (error) {
    console.error("Error fetching available users:", error);
    return [];
  }
}

export default async function AssignStaffPage({
  params,
}: {
  params: { eventId: string }
}) {
  const session = await getServerSession();
  
  // Only admins can assign staff
  if (!session || session.user.role !== "ADMIN") {
    redirect("/");
  }
  
  const [event, availableUsers] = await Promise.all([
    getEvent(params.eventId),
    getAvailableUsers(params.eventId),
  ]);
  
  if (!event) {
    notFound();
  }
  
  return (
    <div className="animate-fadeIn space-y-6">
      <div className="flex items-center justify-start">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link href={`/events/${params.eventId}`}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to event</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Assign Staff to {event.name}</h1>
      </div>
      
      <div className="grid gap-6">
        <StaffAssignmentForm 
          eventId={params.eventId} 
          users={availableUsers} 
        />
      </div>
    </div>
  );
}