// src/app/(dashboard)/events/new/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { venues } from "@/db/schema";
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

export default async function NewEventPage() {
  const session = await auth();
  
  // Only admins can create events
  if (!session || session.user.role !== "ADMIN") {
    redirect("/");
  }
  
  const venuesList = await getVenues();
  
  return (
    <div className="animate-fadeIn space-y-6">
      <div className="flex items-center justify-start">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link href="/events">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to events</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Create New Event</h1>
      </div>
      
      <div className="grid gap-6 md:grid-cols-1">
        <EventForm venues={venuesList} />
      </div>
    </div>
  );
}