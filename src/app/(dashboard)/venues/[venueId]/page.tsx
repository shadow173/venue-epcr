// src/app/(dashboard)/venues/[venueId]/page.tsx
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { venues, events } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  MapPin, 
  CalendarDays,
  Edit,
  PlusCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// Get venue data
async function getVenue(venueId: string) {
  try {
    const venueData = await db.select({
      id: venues.id,
      name: venues.name,
      address: venues.address,
      city: venues.city,
      state: venues.state,
      zipCode: venues.zipCode,
      notes: venues.notes,
      createdAt: venues.createdAt,
    })
    .from(venues)
    .where(eq(venues.id, venueId))
    .limit(1);
    
    return venueData.length ? venueData[0] : null;
  } catch (error) {
    console.error("Error fetching venue:", error);
    return null;
  }
}

// Get upcoming events at this venue
async function getVenueEvents(venueId: string) {
  try {
    const now = new Date();
    
    return await db.select({
      id: events.id,
      name: events.name,
      startDate: events.startDate,
      endDate: events.endDate,
      state: events.state,
    })
    .from(events)
    .where(
      and(
        eq(events.venueId, venueId),
        gte(events.endDate, now)
      )
    )
    .orderBy(events.startDate);
  } catch (error) {
    console.error("Error fetching venue events:", error);
    return [];
  }
}

// Helper to get event status
function getEventStatus(startDate: Date | string, endDate: Date | string): string {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (now < start) return "Upcoming";
  if (now >= start && now <= end) return "In Progress";
  return "Completed";
}

// Helper to get badge variant based on status
function getEventStatusBadge(status: string): "default" | "secondary" | "success" {
  switch (status) {
    case "Upcoming":
      return "secondary";
    case "In Progress":
      return "success";
    case "Completed":
    default:
      return "default";
  }
}

// Venue information component
async function VenueInfo({ venueId }: { venueId: string }) {
  const venue = await getVenue(venueId);
  if (!venue) {
    notFound();
  }
  
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{venue.name}</h1>
          <div className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
            <MapPin className="mr-1 h-4 w-4" />
            {venue.address}
            {venue.city && `, ${venue.city}`}
            {venue.state && `, ${venue.state}`}
            {venue.zipCode && ` ${venue.zipCode}`}
          </div>
        </div>
        
        {isAdmin && (
          <Button asChild variant="outline">
            <Link href={`/venues/${venueId}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Venue
            </Link>
          </Button>
        )}
      </div>
      
      {venue.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-line">{venue.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Upcoming events component
async function UpcomingEvents({ venueId }: { venueId: string }) {
  const events = await getVenueEvents(venueId);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Upcoming Events</h2>
        <Button asChild>
          <Link href="/events/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Event
          </Link>
        </Button>
      </div>
      
      {events.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
            <CalendarDays className="h-6 w-6 text-blue-500 dark:text-blue-400" />
          </div>
          <h3 className="mt-4 text-lg font-medium">No upcoming events</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            There are no upcoming events scheduled at this venue.
          </p>
          <Button asChild className="mt-6">
            <Link href="/events/new">Schedule an Event</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => {
            const status = getEventStatus(event.startDate, event.endDate);
            return (
              <Link 
                key={event.id} 
                href={`/events/${event.id}`}
                className="block"
              >
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium">{event.name}</h3>
                        <div className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <CalendarDays className="mr-1 h-4 w-4" />
                          {format(new Date(event.startDate), "PPP")} at {format(new Date(event.startDate), "h:mm a")}
                        </div>
                      </div>
                      <Badge variant={getEventStatusBadge(status)}>
                        {status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default async function VenueDetailPage({ 
  params 
}: { 
  params: { venueId: string } 
}) {
  const session = await auth();
  if (!session) return null;
  
  return (
    <div className="animate-fadeIn space-y-6">
      <div className="flex items-center justify-start">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link href="/venues">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to venues</span>
          </Link>
        </Button>
      </div>
      
      <Suspense fallback={<Skeleton className="h-32 w-full" />}>
        <VenueInfo venueId={params.venueId} />
      </Suspense>
      
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <UpcomingEvents venueId={params.venueId} />
      </Suspense>
    </div>
  );
}