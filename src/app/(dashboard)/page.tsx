import { Suspense } from "react";
import Link from "next/link";
import { getServerSession  } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { db } from "@/db";
import { events, venues, patients } from "@/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { formatDistanceToNow } from "date-fns";
import { CalendarDays, MapPin, FilePlus, Users } from "lucide-react";

// Dashboard data fetching component with suspense
async function EventsList() {
  const session = await getServerSession();
  if (!session?.user?.id) return null;

  // Fetch events for this user (recent 5 events)
  const userEvents = await db.select({
    id: events.id,
    name: events.name,
    startDate: events.startDate,
    endDate: events.endDate,
    state: events.state,
    createdAt: events.createdAt,
    venueName: venues.name,
    venueAddress: venues.address,
    patientCount: count(patients.id),
  })
  .from(events)
  .leftJoin(venues, eq(events.venueId, venues.id))
  .leftJoin(patients, eq(patients.eventId, events.id))
  .where(
    session.user.role === "ADMIN" 
      ? undefined 
      : eq(events.createdBy, session.user.id)
  )
  .groupBy(events.id, venues.id)
  .orderBy(desc(events.startDate))
  .limit(5);

  if (userEvents.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
          <CalendarDays className="h-6 w-6 text-blue-500 dark:text-blue-400" />
        </div>
        <h3 className="mt-4 text-lg font-medium">No events yet</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Get started by creating your first event.
        </p>
        <Button asChild className="mt-6">
          <Link href="/events/new">Create New Event</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {userEvents.map((event) => (
        <Card key={event.id} className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">{event.name}</CardTitle>
              <CardDescription className="mt-1">
                <time className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <CalendarDays className="mr-1 h-3 w-3" />
                  {new Date(event.startDate).toLocaleDateString()}
                </time>
              </CardDescription>
            </div>
            <Badge variant={getEventStatusBadge(event.startDate, event.endDate)}>
              {getEventStatus(event.startDate, event.endDate)}
            </Badge>
          </CardHeader>
          <CardContent>
            {event.venueName && (
              <div className="mb-3 flex items-start">
                <MapPin className="mr-2 mt-0.5 h-4 w-4 text-gray-400" />
                <div>
                  <p className="font-medium">{event.venueName}</p>
                  {event.venueAddress && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{event.venueAddress}</p>
                  )}
                </div>
              </div>
            )}
            <div className="flex items-center mt-2">
              <Users className="mr-2 h-4 w-4 text-gray-400" />
              <span>
                {event.patientCount} patient{event.patientCount === 1 ? "" : "s"}
              </span>
            </div>
          </CardContent>
          <CardFooter className="bg-gray-50 dark:bg-gray-800/50">
            <div className="flex w-full justify-between">
              <Link href={`/events/${event.id}`} className="text-sm font-medium text-blue-600 dark:text-blue-400">
                View Event
              </Link>
              <Link 
                href={`/events/${event.id}/patients/new`} 
                className="flex items-center text-sm font-medium text-blue-600 dark:text-blue-400"
              >
                <FilePlus className="mr-1 h-4 w-4" />
                Add Patient
              </Link>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

async function VenuesList() {
  const session = await getServerSession();
  if (!session?.user?.id) return null;

  // Fetch venues for this user (recent 5 venues)
  const userVenues = await db.select({
    id: venues.id,
    name: venues.name,
    address: venues.address,
    city: venues.city,
    state: venues.state,
    createdAt: venues.createdAt,
  })
  .from(venues)
  .where(
    session.user.role === "ADMIN" 
      ? undefined 
      : eq(venues.createdBy, session.user.id)
  )
  .orderBy(desc(venues.createdAt))
  .limit(5);

  if (userVenues.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
          <MapPin className="h-6 w-6 text-blue-500 dark:text-blue-400" />
        </div>
        <h3 className="mt-4 text-lg font-medium">No venues yet</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Get started by adding your first venue.
        </p>
        <Button asChild className="mt-6">
          <Link href="/venues/new">Add New Venue</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {userVenues.map((venue) => (
        <Card key={venue.id}>
          <CardHeader>
            <CardTitle className="text-lg">{venue.name}</CardTitle>
            <CardDescription className="mt-1">
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <MapPin className="mr-1 h-3 w-3" />
                {venue.address}
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {venue.city}, {venue.state}
            </p>
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
              Added {formatDistanceToNow(new Date(venue.createdAt), { addSuffix: true })}
            </p>
          </CardContent>
          <CardFooter className="bg-gray-50 dark:bg-gray-800/50">
            <Link href={`/venues/${venue.id}`} className="text-sm font-medium text-blue-600 dark:text-blue-400">
              View Venue
            </Link>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

// Helper functions for event status
function getEventStatus(startDate: Date | string, endDate: Date | string): string {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (now < start) return "Upcoming";
  if (now >= start && now <= end) return "In Progress";
  return "Completed";
}

function getEventStatusBadge(startDate: Date | string, endDate: Date | string): "default" | "secondary" | "destructive" | "outline" {
  const status = getEventStatus(startDate, endDate);
  
  switch (status) {
    case "Upcoming":
      return "secondary";
    case "In Progress":
      return "outline";  // Changed from "success" to "outline"
    case "Completed":
      return "default";
    default:
      return "default";
  }
}

export default async function DashboardPage() {
  const session = await getServerSession();
  
  return (
    <div className="animate-fadeIn space-y-8">
      <section>
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome, {session?.user?.name}</h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              Here&apos;s an overview of your recent events and venues
            </p>
          </div>
          <div className="mt-4 flex space-x-3 md:mt-0">
            <Button asChild variant="default">
              <Link href="/events/new">
                New Event
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/venues/new">
                New Venue
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">My Events</h2>
          <Link href="/events" className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
            View all
          </Link>
        </div>
        <Suspense fallback={<EventsSkeleton />}>
          <EventsList />
        </Suspense>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">My Venues</h2>
          <Link href="/venues" className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
            View all
          </Link>
        </div>
        <Suspense fallback={<VenuesSkeleton />}>
          <VenuesList />
        </Suspense>
      </section>
    </div>
  );
}

// Skeleton loaders
function EventsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="mt-2 h-4 w-1/2" />
          </CardHeader>
          <CardContent className="pb-6">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-2/3" />
          </CardContent>
          <CardFooter className="bg-gray-50 dark:bg-gray-800/50">
            <Skeleton className="h-4 w-full" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

function VenuesSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="mt-2 h-4 w-1/2" />
          </CardHeader>
          <CardContent className="pb-6">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-2/3" />
          </CardContent>
          <CardFooter className="bg-gray-50 dark:bg-gray-800/50">
            <Skeleton className="h-4 w-1/4" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}