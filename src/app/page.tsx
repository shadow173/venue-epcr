// src/app/page.tsx
import { Suspense } from "react";
import Link from "next/link";
import { getServerSession } from "@/lib/auth";
import { db } from "@/db";
import { events, venues, patients, staffAssignments } from "@/db/schema";
import { eq, and, count, gte, lt, not } from "drizzle-orm";
import { format } from "date-fns";
import { 
  Calendar,
  FileText, 
  Users, 
  MapPin,
  PlusCircle,
  ArrowRight,
  Activity,
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

// Dashboard content that uses DB queries
async function DashboardContent() {
  const session = await getServerSession();
  if (!session?.user?.id) return null;

  const isAdmin = session.user.role === "ADMIN";
  const userId = session.user.id;
  const now = new Date();
  
  // Build query for events based on user role
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
    })
    .from(events)
    .leftJoin(venues, eq(events.venueId, venues.id))
    .orderBy(events.startDate);
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
    .orderBy(events.startDate);
  }

  const userEvents = await eventQuery;
  
  // Calculate event statistics
  const activeEvents = userEvents.filter(event => 
    now >= new Date(event.startDate) && now <= new Date(event.endDate)
  );
  
  const upcomingEvents = userEvents.filter(event => 
    new Date(event.startDate) > now
  ).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  
  const pastEvents = userEvents.filter(event => 
    new Date(event.endDate) < now
  );
  
  // Get patient count (for admin only to avoid excessive queries)
  let patientCount = 0;
  if (isAdmin) {
    const patientResult = await db.select({
      count: count()
    })
    .from(patients);
    
    patientCount = Number(patientResult[0]?.count || 0);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Welcome {session.user.name || session.user.email}. Here's an overview of your events and activity.
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Quick Actions Card */}
        <Card className="bg-blue-700 dark:bg-blue-800 border-blue-600 dark:border-blue-700">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full justify-start bg-white text-blue-700 hover:bg-blue-50">
              <Link href="/events/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create New Event
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="w-full justify-start border-white text-white hover:bg-blue-600">
              <Link href="/patients">
                <FileText className="mr-2 h-4 w-4" />
                View All Patients
              </Link>
            </Button>
            
            {isAdmin && (
              <Button asChild variant="outline" className="w-full justify-start border-white text-white hover:bg-blue-600">
                <Link href="/reports">
                  <Activity className="mr-2 h-4 w-4" />
                  Generate Reports
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
        
        {/* Status Summary Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Event Status Summary</CardTitle>
            <CardDescription>
              Overview of your current and upcoming events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center justify-center rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-900/20">
                <span className="text-sm font-medium text-green-800 dark:text-green-300">Active</span>
                <span className="mt-1 text-3xl font-bold text-green-700 dark:text-green-300">{activeEvents.length}</span>
              </div>
              
              <div className="flex flex-col items-center justify-center rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-900/20">
                <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Upcoming</span>
                <span className="mt-1 text-3xl font-bold text-blue-700 dark:text-blue-300">{upcomingEvents.length}</span>
              </div>
              
              <div className="flex flex-col items-center justify-center rounded-lg border p-4">
                <span className="text-sm font-medium">{isAdmin ? 'Total Patients' : 'Past Events'}</span>
                <span className="mt-1 text-3xl font-bold">{isAdmin ? patientCount : pastEvents.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Upcoming Events */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Upcoming Events</CardTitle>
          <Link 
            href="/events" 
            className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            View all events
            <ArrowRight className="ml-1 inline h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent>
          {upcomingEvents.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
              <Calendar className="h-8 w-8 text-gray-400 mb-2" />
              <h3 className="text-lg font-medium">No upcoming events</h3>
              <p className="text-sm text-gray-500 mt-1">
                {isAdmin 
                  ? "Create a new event to get started." 
                  : "You haven't been assigned to any upcoming events."}
              </p>
              {isAdmin && (
                <Button asChild className="mt-4">
                  <Link href="/events/new">Create New Event</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.slice(0, 5).map(event => (
                <Link 
                  key={event.id} 
                  href={`/events/${event.id}`} 
                  className="block"
                >
                  <div className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center">
                        <h3 className="truncate text-base font-medium">{event.name}</h3>
                        <Badge className="ml-2">{event.state}</Badge>
                      </div>
                      <div className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <Clock className="mr-1 h-3 w-3" />
                        <time>{format(new Date(event.startDate), "MMM d, yyyy")}</time>
                      </div>
                      {event.venue?.name && (
                        <div className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <MapPin className="mr-1 h-3 w-3" />
                          <span>{event.venue.name}</span>
                        </div>
                      )}
                    </div>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
        {upcomingEvents.length > 0 && (
          <CardFooter className="flex justify-between border-t bg-gray-50 dark:bg-gray-800/50 px-6 py-3">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {Math.min(upcomingEvents.length, 5)} of {upcomingEvents.length} upcoming events
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/events">View All</Link>
            </Button>
          </CardFooter>
        )}
      </Card>
      
      {/* Active Events */}
      {activeEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Events</CardTitle>
            <CardDescription>
              Events that are currently in progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeEvents.map(event => (
                <Link 
                  key={event.id} 
                  href={`/events/${event.id}`} 
                  className="block"
                >
                  <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-4 transition-colors hover:bg-green-100 dark:border-green-900 dark:bg-green-900/20 dark:hover:bg-green-900/30">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center">
                        <h3 className="truncate text-base font-medium text-green-800 dark:text-green-300">{event.name}</h3>
                        <Badge variant="success" className="ml-2">Active</Badge>
                      </div>
                      <div className="mt-1 flex items-center text-sm text-green-700 dark:text-green-400">
                        <Clock className="mr-1 h-3 w-3" />
                        <span>
                          {format(new Date(event.startDate), "MMM d")} - {format(new Date(event.endDate), "MMM d, yyyy")}
                        </span>
                      </div>
                      {event.venue?.name && (
                        <div className="mt-1 flex items-center text-sm text-green-700 dark:text-green-400">
                          <MapPin className="mr-1 h-3 w-3" />
                          <span>{event.venue.name}</span>
                        </div>
                      )}
                    </div>
                    <Button variant="outline" size="sm" className="border-green-600 text-green-700 hover:bg-green-100 dark:border-green-500 dark:text-green-400 dark:hover:bg-green-900/40">
                      View
                    </Button>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Skeleton loader
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-96" />
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-64" />
        <Skeleton className="h-64 md:col-span-2" />
      </div>
      
      <Skeleton className="h-96" />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl py-6">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}