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
    
    // Convert to array of IDs
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

export default async function AssignStaffPage(
  props: {
    params: Promise<{ eventId: string }>
  }
) {
  const params = await props.params;
  // Get the current session
  const session = await getServerSession();

  // Only admins can assign staff
  if (!session || session.user.role !== "ADMIN") {
    redirect("/");
  }

  // Extract eventId from params
  const { eventId } = params;

  // Fetch data in parallel
  const [event, availableUsers] = await Promise.all([
    getEvent(eventId),
    getAvailableUsers(eventId),
  ]);

  if (!event) {
    notFound();
  }

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="flex items-center justify-start">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link href={`/events/${eventId}`}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to event</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Assign Staff to {event.name}</h1>
      </div>
      
      <div className="grid gap-6">
        {availableUsers.length === 0 ? (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900/30 dark:bg-yellow-900/10">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">No Available Users</h3>
                <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                  <p>All users have already been assigned to this event.</p>
                </div>
                <div className="mt-4">
                  <div className="-mx-2 -my-1.5 flex">
                    <Button asChild variant="outline" size="sm">
                      <Link href="/users/new">
                        Create New User
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <StaffAssignmentForm 
            eventId={eventId} 
            users={availableUsers} 
          />
        )}
      </div>
    </div>
  );
}