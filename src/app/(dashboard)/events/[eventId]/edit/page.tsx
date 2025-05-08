// src/app/(dashboard)/events/[eventId]/edit/page.tsx
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "@/lib/auth";
import { db } from "@/db";
import { events, venues } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { EventForm } from "@/components/forms/event-form";

// Fetch venues for the dropdown
async function getVenues() {
  try {
    const venuesList = await db.select({
      id: venues.id,
      name: venues.name,
    })
    .from(venues)
    .orderBy(venues.name);
    
    return venuesList;
  } catch (error) {
    console.error("Error fetching venues:", error);
    return [];
  }
}

// Fetch event data
async function getEvent(eventId: string) {
  try {
    const eventData = await db.select({
      id: events.id,
      name: events.name,
      startDate: events.startDate,
      endDate: events.endDate,
      state: events.state,
      timezone: events.timezone,
      venueId: events.venueId,
      notes: events.notes,
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

interface EditEventPageProps {
  params: {
    eventId: string;
  };
}

export default async function EditEventPage({ params }: EditEventPageProps) {
  // Extract eventId from params first
  const { eventId } = params;

  const session = await getServerSession();
  
  // Only admins can edit events
  if (!session || session.user.role !== "ADMIN") {
    redirect("/");
  }
  
  const [event, venuesList] = await Promise.all([
    getEvent(eventId),
    getVenues(),
  ]);
  
  if (!event) {
    notFound();
  }
  
  // Convert dates to format expected by the form
  const formattedEvent = {
    ...event,
    startDate: event.startDate,
    endDate: event.endDate,
  };
  
  return (
    <div className="animate-fadeIn space-y-6">
      <div className="flex items-center justify-start">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link href={`/events/${eventId}`}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to event</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Edit Event</h1>
      </div>
      
      <div className="grid gap-6 md:grid-cols-1">
        <EventForm 
          eventId={eventId} 
          initialData={formattedEvent} 
          venues={venuesList} 
        />
      </div>
    </div>
  );
}