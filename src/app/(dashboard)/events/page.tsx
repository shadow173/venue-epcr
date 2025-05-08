// src/app/(dashboard)/events/page.tsx
import { Suspense } from "react";
import Link from "next/link";
import { getServerSession } from "@/lib/auth";
import { db } from "@/db";
import { events, venues, patients, staffAssignments } from "@/db/schema";
import { eq, desc, count, and } from "drizzle-orm";
import { format } from "date-fns";
import { 
  Calendar, 
  MapPin, 
  Plus,
  Search,
  Users,
  Clock
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
interface EventWithStatus {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  state: string;
  status: string;
  venue?: {
    id: string;
    name: string;
    address: string;
  } | null;
  patientCount: number;
}
// Helper to determine event status
function getEventStatus(startDate: Date, endDate: Date): string {
  const now = new Date();
  
  if (now < startDate) {
    return "Upcoming";
  } else if (now <= endDate) {
    return "In Progress";
  } else {
    return "Completed";
  }
}

function getStatusBadgeVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "Upcoming":
      return "secondary";
    case "In Progress":
      return "outline"; // Changed from "success" to "outline"
    case "Completed":
    default:
      return "default";
  }
}

// Events List component - fetches directly from DB
async function EventsList() {
  const session = await getServerSession();
  if (!session?.user?.id) return null;

  const isAdmin = session.user.role === 'ADMIN';
  const userId = session.user.id;
  
  // Build query based on user role
  let eventQuery;
  
  if (isAdmin) {
    // Admin sees all events
    eventQuery = db.select({
      id: events.id,
      name: events.name,
      startDate: events.startDate,
      endDate: events.endDate,
      state: events.state,
      venue: {
        id: venues.id,
        name: venues.name,
        address: venues.address,
      },
      patientCount: count(patients.id),
    })
    .from(events)
    .leftJoin(venues, eq(events.venueId, venues.id))
    .leftJoin(patients, eq(patients.eventId, events.id))
    .groupBy(events.id, venues.id)
    .orderBy(desc(events.startDate));
  } else {
    // EMTs only see events they're assigned to
    eventQuery = db.select({
      id: events.id,
      name: events.name,
      startDate: events.startDate,
      endDate: events.endDate,
      state: events.state,
      venue: {
        id: venues.id,
        name: venues.name,
        address: venues.address,
      },
      patientCount: count(patients.id),
    })
    .from(events)
    .innerJoin(
      staffAssignments,
      and(
        eq(staffAssignments.eventId, events.id),
        eq(staffAssignments.userId, userId)
      )
    )
    .leftJoin(venues, eq(events.venueId, venues.id))
    .leftJoin(patients, eq(patients.eventId, events.id))
    .groupBy(events.id, venues.id, staffAssignments.id)
    .orderBy(desc(events.startDate));
  }

  const userEvents = await eventQuery;

  if (userEvents.length === 0) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
          <Calendar className="h-6 w-6 text-blue-500 dark:text-blue-400" />
        </div>
        <h3 className="mt-4 text-lg font-medium">No events found</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {isAdmin 
            ? "Get started by creating your first event."
            : "You haven't been assigned to any events yet."}
        </p>
        {isAdmin && (
          <Button asChild className="mt-6">
            <Link href="/events/new">Create New Event</Link>
          </Button>
        )}
      </div>
    );
  }

  // Group events into categories
  const upcomingEvents = [];
  const activeEvents = [];
  const pastEvents = [];

  for (const event of userEvents) {
    const status = getEventStatus(event.startDate, event.endDate);
    
    if (status === "Upcoming") {
      upcomingEvents.push({ ...event, status });
    } else if (status === "In Progress") {
      activeEvents.push({ ...event, status });
    } else {
      pastEvents.push({ ...event, status });
    }
  }

  return (
    <div className="space-y-8">
      {/* Active Events */}
      {activeEvents.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Active Events</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {activeEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      )}
      
      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Upcoming Events</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      )}
      
      {/* Past Events */}
      {pastEvents.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Past Events</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pastEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Event card component
function EventCard({ event }: { event: EventWithStatus }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{event.name}</CardTitle>
          <Badge variant={getStatusBadgeVariant(event.status)}>
            {event.status}
          </Badge>
        </div>
        <CardDescription className="mt-1 flex items-center">
          <Clock className="mr-1 h-3 w-3" />
          {format(new Date(event.startDate), "PPP")}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-2">
          {event.venue?.name && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="mt-0.5 h-4 w-4 text-gray-400" />
              <div>
                <span className="font-medium">{event.venue.name}</span>
                {event.venue.address && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {event.venue.address}
                  </p>
                )}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-gray-400" />
            <span>{event.patientCount} patient{event.patientCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-4 bg-gray-50 dark:bg-gray-800/50">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/events/${event.id}`}>
            View Details
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/events/${event.id}/patients/new`}>
            Add Patient
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

// Loading skeleton
function EventsListSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-8 w-40 mb-4" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                <Skeleton className="h-8 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function EventsPage() {
  const session = await getServerSession();
  const isAdmin = session?.user?.role === "ADMIN";
  
  return (
    <div className="animate-fadeIn space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Events</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            View and manage events
          </p>
        </div>
        
        {isAdmin && (
          <div className="mt-4 flex md:mt-0">
            <Button asChild>
              <Link href="/events/new">
                <Plus className="mr-2 h-4 w-4" />
                New Event
              </Link>
            </Button>
          </div>
        )}
      </div>
      
      <div className="rounded-lg border bg-card p-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            type="search" 
            placeholder="Search events..." 
            className="pl-8 bg-background w-full md:w-96"
          />
        </div>
      </div>

      <Suspense fallback={<EventsListSkeleton />}>
        <EventsList />
      </Suspense>
    </div>
  );
}