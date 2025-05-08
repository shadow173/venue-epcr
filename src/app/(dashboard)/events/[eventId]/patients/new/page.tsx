import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { events, venues } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PatientForm } from "@/components/forms/patient-form";

// Get event data for form context
async function getEvent(id: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const result = await db.select({
    id: events.id,
    name: events.name,
    startDate: events.startDate,
    endDate: events.endDate,
    state: events.state,
    venueName: venues.name,
  })
  .from(events)
  .leftJoin(venues, eq(events.venueId, venues.id))
  .where(eq(events.id, id))
  .limit(1);
  
  if (result.length === 0) return null;
  
  return result[0];
}

export default async function NewPatientPage({ params }: { params: { eventId: string } }) {
  const session = await auth();
  if (!session) {
    redirect("/auth/signin");
  }
  
  const event = await getEvent(params.eventId);
  
  if (!event) {
    notFound();
  }
  
  // Check if event has ended and user is not an admin - prevent adding new patients 
  const now = new Date();
  const endDate = new Date(event.endDate);
  
  if (now > endDate && session.user.role !== "ADMIN") {
    redirect(`/events/${params.eventId}`);
  }
  
  return (
    <div className="max-w-4xl mx-auto animate-fadeIn">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">New Patient Record</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Event: {event.name}
        </p>
      </div>
      
      <PatientForm eventId={params.eventId} eventState={event.state} />
    </div>
  );
}