import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { db } from "@/db";
import { 
  events, 
  venues, 
  patients, 
  staffAssignments, 
  users,
  assessments
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { 
  CalendarDays, 
  Clock, 
  FileText, 
  MapPin, 
  UserPlus, 
  Users,
  Settings,
  PlusCircle,
  AlertCircle,
  Clipboard,
  CheckCircle,
  XCircle
} from "lucide-react";
import { format } from "date-fns";
import { PatientList } from "@/components/patients/patient-list";
import { StaffAssignmentList } from "@/components/staff/staff-assignment-list";
import { EventForm } from "@/components/forms/event-form";

// Get event data
async function getEvent(id: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  let query = db.select({
    id: events.id,
    name: events.name,
    venueId: events.venueId,
    startDate: events.startDate,
    endDate: events.endDate,
    state: events.state,
    timezone: events.timezone,
    notes: events.notes,
    createdAt: events.createdAt,
    createdBy: events.createdBy,
    venueName: venues.name,
    venueAddress: venues.address,
    venueCity: venues.city,
    venueState: venues.state,
    venueZipCode: venues.zipCode,
  })
  .from(events)
  .leftJoin(venues, eq(events.venueId, venues.id))
  .where(eq(events.id, id));
  
  // Add access control for non-admin users
  if (session.user.role !== "ADMIN") {
    query = query.where(
      or(
        eq(events.createdBy, session.user.id),
        exists(
          db.select()
            .from(staffAssignments)
            .where(
              and(
                eq(staffAssignments.eventId, events.id),
                eq(staffAssignments.userId, session.user.id)
              )
            )
        )
      )
    );
  }
  
  const result = await query.limit(1);
  
  if (result.length === 0) return null;
  
  return result[0];
}

// Helper function for SQL EXISTS
function exists(subquery: any) {
  return sql`EXISTS ${subquery}`;
}

// Helper function to escape SQL
function sql(strings: TemplateStringsArray, ...values: any[]) {
  // This is a simple implementation - in a real app, you'd use a proper SQL template tag
  return { type: 'exists', sql: String.raw(strings, ...values) };
}

// Get patients for this event
async function getEventPatients(eventId: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  // For EMTs, check time-based access restrictions
  if (session.user.role !== "ADMIN") {
    const now = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Time-based access: Only patients created in the last 24 hours or same day as the event
    return await db.select({
      id: patients.id,
      firstName: patients.firstName,
      lastName: patients.lastName,
      dob: patients.dob,
      createdAt: patients.createdAt,
      triageTag: patients.triageTag,
      status: assessments.status,
      disposition: assessments.disposition,
    })
    .from(patients)
    .leftJoin(assessments, eq(patients.id, assessments.patientId))
    .where(
      and(
        eq(patients.eventId, eventId),
        or(
          // Created in last 24 hours
          patients.createdAt >= yesterday.toISOString(),
          // Created on the same day as the event
          and(
            // This is a simplification - in a real app, you'd use proper date functions
            // to check if the patient's createdAt date is the same as the event's startDate
            patients.createdAt >= yesterday.toISOString(),
            patients.createdAt <= now.toISOString() 
          )
        )
      )
    )
    .orderBy(desc(patients.createdAt));
  }
  
  // Admins have full access to all patients
  return await db.select({
    id: patients.id,
    firstName: patients.firstName,
    lastName: patients.lastName,
    dob: patients.dob,
    createdAt: patients.createdAt,
    triageTag: patients.triageTag,
    status: assessments.status,
    disposition: assessments.disposition,
  })
  .from(patients)
  .leftJoin(assessments, eq(patients.id, assessments.patientId))
  .where(eq(patients.eventId, eventId))
  .orderBy(desc(patients.createdAt));
}

// Get staff assignments for this event
async function getEventStaff(eventId: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  return await db.select({
    id: staffAssignments.id,
    userId: staffAssignments.userId,
    eventId: staffAssignments.eventId,
    role: staffAssignments.role,
    userName: users.name,
    userEmail: users.email,
  })
  .from(staffAssignments)
  .innerJoin(users, eq(staffAssignments.userId, users.id))
  .where(eq(staffAssignments.eventId, eventId))
  .orderBy(users.name);
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

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return null;
  
  const event = await getEvent(params.id);
  
  // If event not found or user doesn't have access
  if (!event) {
    notFound();
  }
  
  const [patients, staffAssignments] = await Promise.all([
    getEventPatients(params.id),
    getEventStaff(params.id),
  ]);
  
  const isAdmin = session.user.role === "ADMIN";
  
  return (
    <div className="animate-fadeIn space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{event.name}</h1>
            <Badge variant={getEventStatusBadge(event.startDate, event.endDate)}>
              {getEventStatus(event.startDate, event.endDate)}
            </Badge>
          </div>
          {event.venueName && (
            <div className="mt-1 flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <MapPin className="h-4 w-4" />
              <span>{event.venueName}</span>
            </div>
          )}
        </div>
        <Button asChild>
          <Link href={`/events/${params.id}/patients/new`}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Patient
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Start Date</div>
                <div className="flex items-center gap-1 font-medium">
                  <CalendarDays className="h-4 w-4 text-gray-400" />
                  {format(new Date(event.startDate), "PPP")}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">End Date</div>
                <div className="flex items-center gap-1 font-medium">
                  <CalendarDays className="h-4 w-4 text-gray-400" />
                  {format(new Date(event.endDate), "PPP")}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Time Zone</div>
                <div className="flex items-center gap-1 font-medium">
                  <Clock className="h-4 w-4 text-gray-400" />
                  {event.timezone}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">State</div>
                <div className="flex items-center gap-1 font-medium">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  {event.state}
                </div>
              </div>
            </div>
            
            {event.notes && (
              <>
                <Separator />
                <div className="space-y-1">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Notes</div>
                  <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-800">
                    {event.notes}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Venue Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {event.venueName ? (
              <>
                <div className="space-y-1">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</div>
                  <div className="font-medium">{event.venueName}</div>
                </div>
                
                {event.venueAddress && (
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</div>
                    <div className="font-medium">
                      {event.venueAddress}
                      {event.venueCity && event.venueState && (
                        <div className="mt-1">
                          {event.venueCity}, {event.venueState} {event.venueZipCode}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="pt-2">
                  <Link
                    href={`/venues/${event.venueId}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    View Venue Details
                  </Link>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 py-8 text-center dark:border-gray-700 dark:bg-gray-800">
                <div className="rounded-full bg-gray-100 p-3 dark:bg-gray-700">
                  <MapPin className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="mt-2 text-sm font-medium">No Venue Assigned</h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  This event doesn't have a venue assigned yet
                </p>
                {isAdmin && (
                  <Button variant="outline" className="mt-4" asChild>
                    <Link href={`/events/${params.id}/edit`}>
                      Assign Venue
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="patients">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="patients">
            <FileText className="mr-2 h-4 w-4" />
            Patients
          </TabsTrigger>
          <TabsTrigger value="staff">
            <Users className="mr-2 h-4 w-4" />
            Staff
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="patients" className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Patients</h2>
            <Button asChild>
              <Link href={`/events/${params.id}/patients/new`}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Patient
              </Link>
            </Button>
          </div>
          
          {patients.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <div className="rounded-full bg-blue-50 p-3 dark:bg-blue-900/30">
                  <AlertCircle className="h-6 w-6 text-blue-500 dark:text-blue-400" />
                </div>
                <h3 className="mt-4 text-lg font-medium">No Patients</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  This event doesn&apos;t have any patients yet
                </p>
                <Button asChild className="mt-6">
                  <Link href={`/events/${params.id}/patients/new`}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Patient
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <PatientList patients={patients} eventId={params.id} />
          )}
        </TabsContent>

        <TabsContent value="staff" className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Staff Assignments</h2>
            {isAdmin && (
              <Button asChild>
                <Link href={`/events/${params.id}/staff/new`}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Assign Staff
                </Link>
              </Button>
            )}
          </div>
          
          {staffAssignments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <div className="rounded-full bg-blue-50 p-3 dark:bg-blue-900/30">
                  <Users className="h-6 w-6 text-blue-500 dark:text-blue-400" />
                </div>
                <h3 className="mt-4 text-lg font-medium">No Staff Assigned</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  This event doesn&apos;t have any staff assigned yet
                </p>
                {isAdmin && (
                  <Button asChild className="mt-6">
                    <Link href={`/events/${params.id}/staff/new`}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Assign Staff
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <StaffAssignmentList 
              staffAssignments={staffAssignments} 
              eventId={params.id} 
              canEdit={isAdmin} 
            />
          )}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="settings" className="mt-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Event Settings</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Update event details or manage venue information
              </p>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Edit Event</CardTitle>
                <CardDescription>
                  Make changes to your event here
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EventForm eventId={params.id} initialData={event} />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}