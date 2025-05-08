// src/app/(dashboard)/events/[eventId]/page.tsx
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { 
  events, 
  venues, 
  patients, 
  staffAssignments, 
  users 
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  CalendarDays, 
  MapPin, 
  Clock,
  Users,
  PlusCircle,
  FileText,
  Edit,
  UserPlus,

} from "lucide-react";
import { StaffAssignmentList } from "@/components/staff/staff-assignment-list";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PatientList } from "@/components/patients/patient-list";

// Get event data
async function getEvent(eventId: string, userId: string, userRole: string) {
  try {
    // For admin, direct access
    if (userRole === "ADMIN") {
      const eventData = await db.select({
        id: events.id,
        name: events.name,
        startDate: events.startDate,
        endDate: events.endDate,
        state: events.state,
        timezone: events.timezone,
        notes: events.notes,
        venueId: events.venueId,
        venueName: venues.name,
        venueAddress: venues.address,
        venueCity: venues.city,
        venueState: venues.state,
        venueZipCode: venues.zipCode,
        createdAt: events.createdAt,
      })
      .from(events)
      .leftJoin(venues, eq(events.venueId, venues.id))
      .where(eq(events.id, eventId))
      .limit(1);
      
      return eventData.length ? eventData[0] : null;
    }
    
    // For EMTs, check if assigned
    const assignment = await db.select()
      .from(staffAssignments)
      .where(
        and(
          eq(staffAssignments.userId, userId),
          eq(staffAssignments.eventId, eventId)
        )
      )
      .limit(1);
    
    if (!assignment.length) {
      return null; // Not assigned to this event
    }
    
    // Get event data
    const eventData = await db.select({
      id: events.id,
      name: events.name,
      startDate: events.startDate,
      endDate: events.endDate,
      state: events.state,
      timezone: events.timezone,
      notes: events.notes,
      venueId: events.venueId,
      venueName: venues.name,
      venueAddress: venues.address,
      venueCity: venues.city,
      venueState: venues.state,
      venueZipCode: venues.zipCode,
      createdAt: events.createdAt,
    })
    .from(events)
    .leftJoin(venues, eq(events.venueId, venues.id))
    .where(eq(events.id, eventId))
    .limit(1);
    
    return eventData.length ? eventData[0] : null;
  } catch (error) {
    console.error("Error fetching event:", error);
    return null;
  }
}

// Get patients for this event
async function getEventPatients(eventId: string, userId: string, userRole: string) {
  try {
    // For non-admin users, enforce time restrictions
    if (userRole !== "ADMIN") {
      const now = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Get the event start date for same-day check
      const eventData = await db.select({ startDate: events.startDate })
        .from(events)
        .where(eq(events.id, eventId))
        .limit(1);
      
      if (!eventData.length) return [];
      
      const eventDay = new Date(eventData[0].startDate);
      eventDay.setHours(0, 0, 0, 0);
      const eventDayEnd = new Date(eventDay);
      eventDayEnd.setHours(23, 59, 59, 999);
      
      // Get patients with time restrictions
      return await db.select({
        id: patients.id,
        firstName: patients.firstName,
        lastName: patients.lastName,
        dob: patients.dob,
        triageTag: patients.triageTag,
        createdAt: patients.createdAt,
        status: "incomplete" // Since we don't have a direct status field, providing a default
      })
      .from(patients)
      .where(
        and(
          eq(patients.eventId, eventId),
          // Created in last 24 hours OR on same day as event
          and(
            patients.createdAt >= yesterday.toISOString(),
            patients.createdAt <= now.toISOString()
          )
        )
      )
      .orderBy(desc(patients.createdAt));
    }
    
    // For admin, get all patients
    return await db.select({
      id: patients.id,
      firstName: patients.firstName,
      lastName: patients.lastName,
      dob: patients.dob,
      triageTag: patients.triageTag,
      createdAt: patients.createdAt,
      status: "incomplete" // Since we don't have a direct status field, providing a default
    })
    .from(patients)
    .where(eq(patients.eventId, eventId))
    .orderBy(desc(patients.createdAt));
  } catch (error) {
    console.error("Error fetching patients:", error);
    return [];
  }
}

// Get staff assigned to this event
async function getEventStaff(eventId: string) {
  try {
    return await db.select({
      id: staffAssignments.id,
      userId: users.id,
      userName: users.name,
      userEmail: users.email,
      userRole: users.role,
      role: staffAssignments.role,
    })
    .from(staffAssignments)
    .leftJoin(users, eq(staffAssignments.userId, users.id))
    .where(eq(staffAssignments.eventId, eventId))
    .orderBy(users.name);
  } catch (error) {
    console.error("Error fetching staff assignments:", error);
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

// Event information component
async function EventInfo({ eventId }: { eventId: string }) {
  const session = await auth();
  if (!session?.user?.id) return null;
  
  const event = await getEvent(eventId, session.user.id, session.user.role);
  if (!event) {
    notFound();
  }
  
  const status = getEventStatus(event.startDate, event.endDate);
  const isAdmin = session.user.role === "ADMIN";
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{event.name}</h1>
            <Badge variant={getEventStatusBadge(status)}>{status}</Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center">
              <CalendarDays className="mr-1 h-4 w-4" />
              {format(new Date(event.startDate), "PPP")}
            </div>
            <div className="flex items-center">
              <Clock className="mr-1 h-4 w-4" />
              {format(new Date(event.startDate), "h:mm a")} - {format(new Date(event.endDate), "h:mm a")}
            </div>
            <div className="flex items-center">
              <Badge variant="outline">{event.state}</Badge>
            </div>
            <div className="flex items-center">
              <Badge variant="outline">{event.timezone}</Badge>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          {isAdmin && (
            <Button asChild variant="outline">
              <Link href={`/events/${eventId}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Event
              </Link>
            </Button>
          )}
          <Button asChild>
            <Link href={`/events/${eventId}/patients/new`}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Patient
            </Link>
          </Button>
        </div>
      </div>
      
      {event.venueName && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5 text-gray-500" />
              Venue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <h3 className="font-medium">{event.venueName}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {event.venueAddress}
                {event.venueCity && `, ${event.venueCity}`}
                {event.venueState && `, ${event.venueState}`}
                {event.venueZipCode && ` ${event.venueZipCode}`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {event.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{event.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Patients tab content
async function PatientsTab({ eventId }: { eventId: string }) {
  const session = await auth();
  if (!session?.user?.id) return null;
  
  const patients = await getEventPatients(eventId, session.user.id, session.user.role);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Patients</h2>
        <Button asChild>
          <Link href={`/events/${eventId}/patients/new`}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Patient
          </Link>
        </Button>
      </div>
      
      <PatientList patients={patients} eventId={eventId} />
    </div>
  );
}

// Staff tab content
async function StaffTab({ eventId }: { eventId: string }) {
  const session = await auth();
  if (!session?.user?.id) return null;
  
  const staff = await getEventStaff(eventId);
  const isAdmin = session.user.role === "ADMIN";
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Staff</h2>
        {isAdmin && (
          <Button asChild>
            <Link href={`/events/${eventId}/staff/assign`}>
              <UserPlus className="mr-2 h-4 w-4" />
              Assign Staff
            </Link>
          </Button>
        )}
      </div>
      
      <StaffAssignmentList staff={staff} eventId={eventId} canEdit={isAdmin} />
    </div>
  );
}

// Skeleton loader for tabs
function TabContentSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}

export default async function EventDetailPage({ 
  params 
}: { 
  params: { eventId: string } 
}) {
  const session = await auth();
  if (!session) return null;
  
  // Simple check if event exists and user has access
  const event = await getEvent(params.eventId, session.user.id, session.user.role);
  if (!event) {
    notFound();
  }
  
  return (
    <div className="animate-fadeIn space-y-6">
      <div className="flex items-center justify-start">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link href="/events">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to events</span>
          </Link>
        </Button>
      </div>
      
      <Suspense fallback={<Skeleton className="h-32 w-full" />}>
        <EventInfo eventId={params.eventId} />
      </Suspense>
      
      <Tabs defaultValue="patients" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="patients">
            <FileText className="mr-2 h-4 w-4" />
            Patients
          </TabsTrigger>
          <TabsTrigger value="staff">
            <Users className="mr-2 h-4 w-4" />
            Staff
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="patients" className="mt-4">
          <Suspense fallback={<TabContentSkeleton />}>
            <PatientsTab eventId={params.eventId} />
          </Suspense>
        </TabsContent>
        
        <TabsContent value="staff" className="mt-4">
          <Suspense fallback={<TabContentSkeleton />}>
            <StaffTab eventId={params.eventId} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}