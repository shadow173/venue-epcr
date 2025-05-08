import { Suspense } from "react";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/db";
import { events, venues, patients, staffAssignments } from "@/db/schema";
import { eq, and, or, desc, count } from "drizzle-orm";
import { CalendarDays, Filter, PlusCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

// Events data fetching component with suspense
async function EventsTable({ searchParams }: { searchParams: { q?: string; status?: string; venueId?: string } }) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const { q, status, venueId } = searchParams;

  // Build filters
  let filters = [];

  // Check if user is admin, if not, only show events they have access to
  if (session.user.role !== "ADMIN") {
    filters.push(
      or(
        eq(events.createdBy, session.user.id),
        eq(staffAssignments.userId, session.user.id)
      )
    );
  }

  // Add search filter if provided
  if (q) {
    filters.push(
      or(
        eq(events.name, q),
        eq(venues.name, q),
        eq(venues.address, q),
        eq(venues.city, q)
      )
    );
  }

  // Add status filter if provided
  if (status) {
    const now = new Date();
    
    if (status === "upcoming") {
      filters.push(events.startDate > now);
    } else if (status === "inProgress") {
      filters.push(
        and(
          events.startDate <= now,
          events.endDate >= now
        )
      );
    } else if (status === "completed") {
      filters.push(events.endDate < now);
    }
  }

  // Add venue filter if provided
  if (venueId) {
    filters.push(eq(events.venueId, venueId));
  }

  // Get all events for this user with counts
  const userEvents = await db.select({
    id: events.id,
    name: events.name,
    startDate: events.startDate,
    endDate: events.endDate,
    state: events.state,
    timezone: events.timezone,
    venueName: venues.name,
    venueAddress: venues.address,
    patientCount: count(patients.id),
  })
  .from(events)
  .leftJoin(venues, eq(events.venueId, venues.id))
  .leftJoin(patients, eq(patients.eventId, events.id))
  .leftJoin(staffAssignments, eq(staffAssignments.eventId, events.id))
  .where(and(...filters))
  .groupBy(events.id, venues.id)
  .orderBy(desc(events.startDate));

  if (userEvents.length === 0) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
          <CalendarDays className="h-6 w-6 text-blue-500 dark:text-blue-400" />
        </div>
        <h3 className="mt-4 text-lg font-medium">No events found</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {q ? "Try a different search term" : "Get started by creating a new event"}
        </p>
        {!q && (
          <Button asChild className="mt-6">
            <Link href="/events/new">Create New Event</Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-white dark:border-gray-700 dark:bg-gray-800">
      <Table>
        <TableHeader className="bg-gray-50 dark:bg-gray-800/50">
          <TableRow>
            <TableHead>Event Name</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead>Patients</TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {userEvents.map((event) => (
            <TableRow key={event.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <TableCell className="font-medium">
                <Link href={`/events/${event.id}`} className="block">
                  {event.name}
                </Link>
              </TableCell>
              <TableCell>
                <div className="max-w-xs truncate">
                  {event.venueName && (
                    <div>
                      <span className="font-medium">{event.venueName}</span>
                      {event.venueAddress && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">{event.venueAddress}</div>
                      )}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <div>
                    {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                  </div>
                  <div className="text-gray-500 dark:text-gray-400">
                    {event.timezone}
                  </div>
                </div>
              </TableCell>
              <TableCell>{event.patientCount}</TableCell>
              <TableCell className="text-right">
                <Badge variant={getEventStatusBadge(event.startDate, event.endDate)}>
                  {getEventStatus(event.startDate, event.endDate)}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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

function getEventStatusBadge(startDate: Date | string, endDate: Date | string): "default" | "secondary" | "success" {
  const status = getEventStatus(startDate, endDate);
  
  switch (status) {
    case "Upcoming":
      return "secondary";
    case "In Progress":
      return "success";
    case "Completed":
      return "default";
    default:
      return "default";
  }
}

// Venues data fetching component for filter
async function VenuesSelect() {
  const session = await auth();
  if (!session?.user?.id) return null;

  // Get all venues for filtering
  const userVenues = await db.select({
    id: venues.id,
    name: venues.name,
  })
  .from(venues)
  .where(
    session.user.role === "ADMIN" 
      ? undefined 
      : eq(venues.createdBy, session.user.id)
  )
  .orderBy(venues.name);

  return (
    <Select name="venueId">
      <SelectTrigger className="w-full md:w-[200px]">
        <SelectValue placeholder="All venues" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">All venues</SelectItem>
        {userVenues.map((venue) => (
          <SelectItem key={venue.id} value={venue.id}>{venue.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function EventsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; venueId?: string };
}) {
  return (
    <div className="animate-fadeIn space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Events</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage your events and see patient statistics
          </p>
        </div>
        <Button asChild>
          <Link href="/events/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Event
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Events</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col items-end gap-4 md:flex-row">
            <div className="relative w-full md:w-auto md:flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Input
                type="search"
                name="q"
                placeholder="Search events..."
                defaultValue={searchParams.q}
                className="w-full pl-9"
              />
            </div>
            <div className="flex w-full flex-col gap-4 sm:flex-row md:w-auto">
              <Select name="status" defaultValue={searchParams.status || ""}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="inProgress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              
              <Suspense fallback={
                <div className="w-full animate-pulse rounded-md border border-input bg-background px-3 py-2 md:w-[200px]">
                  <div className="h-5 w-24 rounded-md bg-gray-200 dark:bg-gray-700" />
                </div>
              }>
                <VenuesSelect />
              </Suspense>
            </div>
            <Button type="submit" variant="default" className="shrink-0">
              <Filter className="mr-2 h-4 w-4" />
              Apply Filters
            </Button>
          </form>
        </CardContent>
      </Card>

      <Suspense fallback={<EventsTableSkeleton />}>
        <EventsTable searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

// Skeleton loader for events table
function EventsTableSkeleton() {
  return (
    <div className="rounded-md border bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="p-4">
        <div className="grid grid-cols-5 gap-4 pb-4">
          <Skeleton className="h-6" />
          <Skeleton className="h-6" />
          <Skeleton className="h-6" />
          <Skeleton className="h-6" />
          <Skeleton className="h-6" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="grid grid-cols-5 gap-4 py-4 border-t border-gray-200 dark:border-gray-700">
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
          </div>
        ))}
      </div>
    </div>
  );
}