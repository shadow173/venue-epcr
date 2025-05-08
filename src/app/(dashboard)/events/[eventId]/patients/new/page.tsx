// src/app/(dashboard)/events/[eventId]/patients/new/page.tsx
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { events, staffAssignments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { PatientForm } from "@/components/forms/patient-form";

// Check if user has access to the event
async function checkEventAccess(eventId: string, userId: string, userRole: string) {
  try {
    // Admin has access to all events
    if (userRole === "ADMIN") {
      const event = await db.select({
        id: events.id,
        name: events.name,
        state: events.state,
      })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);
      
      return event.length ? event[0] : null;
    }
    
    // For EMTs, check if assigned to the event
    const eventWithAssignment = await db.select({
      id: events.id,
      name: events.name,
      state: events.state,
    })
    .from(events)
    .innerJoin(
      staffAssignments,
      and(
        eq(staffAssignments.eventId, events.id),
        eq(staffAssignments.userId, userId)
      )
    )
    .where(eq(events.id, eventId))
    .limit(1);
    
    return eventWithAssignment.length ? eventWithAssignment[0] : null;
  } catch (error) {
    console.error("Error checking event access:", error);
    return null;
  }
}

export default async function NewPatientPage({
  params,
}: {
  params: { eventId: string }
}) {
  const session = await auth();
  
  if (!session) {
    redirect("/auth/signin");
  }
  
  // Check event access
  const event = await checkEventAccess(
    params.eventId,
    session.user.id,
    session.user.role
  );
  
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
        <h1 className="text-2xl font-bold tracking-tight">Add New Patient</h1>
      </div>
      
      <div className="grid gap-6">
        <PatientForm 
          eventId={params.eventId} 
          eventState={event.state} 
        />
      </div>
    </div>
  );
}