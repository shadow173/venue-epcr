// src/app/(dashboard)/events/[eventId]/page.tsx
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { 
  Calendar, 
  MapPin, 
  Users, 
  Edit, 
  Trash2,
  AlertTriangle
} from "lucide-react";

import { getServerSession } from "@/lib/auth";
import { db } from "@/db";
import { events, venues, staffAssignments, patients, assessments, users } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

import { StaffAssignmentList } from "@/components/staff/staff-assignment-list";
import { PatientList } from "@/components/patients/patient-list";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

// Types for the data we'll fetch
interface EventWithVenue {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  state: string;
  timezone: string;
  notes: string | null;
  createdAt: Date;
  venue?: {
    id: string;
    name: string;
    address: string;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    notes: string | null;
  } | null;
}

interface StaffMember {
  id: string;
  eventId: string;
  userId: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dob: Date;
  triageTag: string | null;
  status: string | null;
  createdAt: Date;
}

// Function to check if user has access to the event
async function userHasEventAccess(userId: string, userRole: string, eventId: string): Promise<boolean> {
  if (userRole === 'ADMIN') {
    return true;
  }
  
  const assignment = await db.select()
    .from(staffAssignments)
    .where(
      and(
        eq(staffAssignments.userId, userId),
        eq(staffAssignments.eventId, eventId)
      )
    )
    .limit(1);
    
  return assignment.length > 0;
}

// Get event data with venue info
async function getEvent(eventId: string): Promise<EventWithVenue | null> {
  const eventData = await db.select({
    id: events.id,
    name: events.name,
    startDate: events.startDate,
    endDate: events.endDate,
    state: events.state,
    timezone: events.timezone,
    notes: events.notes,
    createdAt: events.createdAt,
    venue: {
      id: venues.id,
      name: venues.name,
      address: venues.address,
      city: venues.city,
      state: venues.state,
      zipCode: venues.zipCode,
      notes: venues.notes,
    }
  })
  .from(events)
  .leftJoin(venues, eq(events.venueId, venues.id))
  .where(eq(events.id, eventId))
  .limit(1);

  if (eventData.length === 0) {
    return null;
  }

  return eventData[0];
}

// Get staff assigned to the event
async function getStaffForEvent(eventId: string): Promise<StaffMember[]> {
  const staffData = await db.select({
    id: staffAssignments.id,
    eventId: staffAssignments.eventId,
    userId: staffAssignments.userId,
    role: staffAssignments.role,
    user: {
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    }
  })
  .from(staffAssignments)
  .innerJoin(users, eq(staffAssignments.userId, users.id))
  .where(eq(staffAssignments.eventId, eventId))
  .orderBy(users.name);

  return staffData;
}

// Get patients for the event
async function getPatientsForEvent(eventId: string): Promise<Patient[]> {
  const patientData = await db.select({
    id: patients.id,
    firstName: patients.firstName,
    lastName: patients.lastName,
    dob: patients.dob,
    triageTag: patients.triageTag,
    status: assessments.status,
    createdAt: patients.createdAt,
  })
  .from(patients)
  .leftJoin(assessments, eq(patients.id, assessments.patientId))
  .where(eq(patients.eventId, eventId))
  .orderBy(desc(patients.createdAt));

  return patientData;
}

// Helper function to get status badge variant
function getStatusBadgeVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status.toLowerCase()) {
    case "active":
    case "in progress":
      return "secondary";
    case "upcoming":
      return "secondary";
    case "completed":
      return "default";
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

// Helper function to determine event status based on dates
function determineEventStatus(startDate: Date, endDate: Date): string {
  const now = new Date();
  
  if (now < startDate) {
    return "Upcoming";
  } else if (now <= endDate) {
    return "In Progress";
  } else {
    return "Completed";
  }
}

// Event Detail Page Component
export default async function EventDetailPage({ params }: { params: { eventId: string } }) {
  const session = await getServerSession();
  
  // Redirect to login if not authenticated
  if (!session) {
    redirect("/auth/signin");
  }
  
  // Check if user has access to this event
  const hasAccess = await userHasEventAccess(
    session.user.id,
    session.user.role,
    params.eventId
  );
  
  if (!hasAccess) {
    redirect("/");
  }
  
  // Fetch event data
  const event = await getEvent(params.eventId);
  
  if (!event) {
    notFound();
  }
  
  // Fetch staff and patients in parallel
  const [staff, patientsList] = await Promise.all([
    getStaffForEvent(params.eventId),
    getPatientsForEvent(params.eventId),
  ]);
  
  const isAdmin = session.user.role === "ADMIN";
  const canEdit = isAdmin;
  
  // Calculate counts for display
  const stats = {
    totalPatients: patientsList.length,
    completedPatients: patientsList.filter(p => p.status === 'complete').length,
    pendingPatients: patientsList.filter(p => p.status !== 'complete').length,
    staffCount: staff.length
  };
  
  // Format dates for display
  const formattedStartDate = format(event.startDate, "MMMM d, yyyy");
  const formattedStartTime = format(event.startDate, "h:mm a");
  const formattedEndTime = format(event.endDate, "h:mm a");
  
  // Determine event status
  const eventStatus = determineEventStatus(event.startDate, event.endDate);
  
  return (
    <div className="space-y-6">
      {/* Event Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{event.name}</h1>
            <Badge variant={getStatusBadgeVariant(eventStatus)}>{eventStatus}</Badge>
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            {event.notes}
          </p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href={`/events/${event.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Event
              </Link>
            </Button>
            
            {isAdmin && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the event
                      and all associated data including patient records.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction className="bg-red-600 hover:bg-red-700">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}
      </div>
      
      {/* Event Details */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-2">
              <Calendar className="mt-0.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <div>
                <p className="font-medium">{formattedStartDate}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formattedStartTime} - {formattedEndTime}
                </p>
              </div>
            </div>
            {event.venue && (
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                <div>
                  <p className="font-medium">{event.venue.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {event.venue.address}
                    {event.venue.city && `, ${event.venue.city}`}
                    {event.venue.state && `, ${event.venue.state}`}
                    {event.venue.zipCode && ` ${event.venue.zipCode}`}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2">
              <Users className="mt-0.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <div>
                <p className="font-medium">Staff Assigned</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {staff.length} staff members
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Event Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Patients</p>
                <p className="text-2xl font-bold">{stats.totalPatients}</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Staff</p>
                <p className="text-2xl font-bold">{stats.staffCount}</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Completed</p>
                <p className="text-2xl font-bold">{stats.completedPatients}</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending</p>
                <p className="text-2xl font-bold">{stats.pendingPatients}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {event.venue && event.venue.notes && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Venue Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-line">{event.venue.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Tabs for Staff and Patients */}
      <Tabs defaultValue="patients" className="w-full">
        <TabsList>
          <TabsTrigger value="patients">Patients</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
        </TabsList>
        
        <TabsContent value="patients" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Patient Records</h2>
            {canEdit && (
              <Button asChild>
                <Link href={`/events/${event.id}/patients/new`}>Add Patient</Link>
              </Button>
            )}
          </div>
          
          <Suspense fallback={
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          }>
            {patientsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                <AlertTriangle className="h-8 w-8 text-yellow-500 mb-2" />
                <h3 className="text-lg font-medium">No patients yet</h3>
                <p className="text-sm text-gray-500 mt-1">
                  There are no patients recorded for this event yet.
                </p>
                {canEdit && (
                  <Button asChild className="mt-4">
                    <Link href={`/events/${event.id}/patients/new`}>Add First Patient</Link>
                  </Button>
                )}
              </div>
            ) : (
                <PatientList 
                patients={patientsList.map(patient => ({
                  ...patient,
                  dob: patient.dob.toISOString(), // Convert Date to string
                  createdAt: patient.createdAt.toISOString() // Also convert createdAt to string
                }))} 
                eventId={event.id} 
                canEdit={canEdit} 
              />
            )}
          </Suspense>
        </TabsContent>
        
        <TabsContent value="staff" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Staff Assignments</h2>
            {canEdit && (
              <Button asChild>
                <Link href={`/events/${event.id}/staff/assign`}>Assign Staff</Link>
              </Button>
            )}
          </div>
          
          <Suspense fallback={
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          }>
            <StaffAssignmentList 
              staff={staff} 
              eventId={event.id} 
              canEdit={canEdit} 
            />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}