// src/app/(dashboard)/events/[eventId]/page.tsx

import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { 
  Calendar, 
  MapPin, 
  Users, 
  Edit, 
  Trash2
} from "lucide-react";
import { Patient } from "@/lib/api/events";
import { getServerSession, userHasEventAccess } from "@/lib/auth";
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

interface EventDetailPageProps {
  params: {
    eventId: string;
  };
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  // Correctly await the params in Next.js App Router
  const { eventId } = params;
  
  // Check if user has access to this event
  const hasAccess = await userHasEventAccess(eventId);
  
  if (!hasAccess) {
    redirect("/");
  }
  
  // Fetch event data using absolute URL (fixing the URL parsing error)
  let event;
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/events/${eventId}`, {
      credentials: 'include',
      cache: 'no-store'
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        notFound();
      }
      throw new Error(`Failed to fetch event: ${response.statusText}`);
    }
    
    event = await response.json();
  } catch (error) {
    console.error("Error fetching event:", error);
    notFound();
  }
  
  if (!event) {
    notFound();
  }
  
  // Get current user session
  const session = await getServerSession();
  const isAdmin = session?.user?.role === "ADMIN";
  
  // Format dates for display
  const startDate = new Date(event.startDate);
  const endDate = event.endDate ? new Date(event.endDate) : null;
  
  const formattedStartDate = format(startDate, "MMMM d, yyyy");
  const formattedStartTime = format(startDate, "h:mm a");
  const formattedEndTime = endDate ? format(endDate, "h:mm a") : null;
  
  // Helper function to get status badge variant
  const getStatusBadgeVariant = (status: string): "secondary" | "default" | "destructive" | "outline" => {
    switch (status.toLowerCase()) {
      case "active":
        return "secondary"; // Changed from "success" to "secondary"
      case "upcoming":
        return "secondary";
      case "completed":
        return "default";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Event Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{event.name}</h1>
            <Badge variant={getStatusBadgeVariant(event.status)}>{event.status}</Badge>
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            {event.description}
          </p>
        </div>
        {event.canEdit && (
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <a href={`/events/${event.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Event
              </a>
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
                  {formattedStartTime} {formattedEndTime ? `- ${formattedEndTime}` : ""}
                </p>
              </div>
            </div>
            {event.venue && (
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                <div>
                  <p className="font-medium">{event.venue.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {event.venue.address}, {event.venue.city}, {event.venue.state} {event.venue.zipCode}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2">
              <Users className="mt-0.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <div>
                <p className="font-medium">Event Capacity</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {event.expectedAttendees || "Not specified"}
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
                <p className="text-2xl font-bold">{event.patients?.length || 0}</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Staff</p>
                <p className="text-2xl font-bold">{event.staff?.length || 0}</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Completed</p>
                <p className="text-2xl font-bold">
                  {event.patients?.filter((p: Patient) => p.status === "complete").length || 0}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending</p>
                <p className="text-2xl font-bold">
                  {event.patients?.filter((p: Patient) => p.status !== "complete").length || 0}
                </p>
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
              <p className="text-sm">{event.venue.notes}</p>
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
            {event.canEdit && (
              <Button asChild>
                <a href={`/events/${event.id}/patients/new`}>Add Patient</a>
              </Button>
            )}
          </div>
          
          <Suspense fallback={
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          }>
            <PatientList 
              patients={event.patients} 
              eventId={event.id} 
              canEdit={event.canEdit} 
            />
          </Suspense>
        </TabsContent>
        
        <TabsContent value="staff" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Staff Assignments</h2>
            {event.canEdit && (
              <Button asChild>
                <a href={`/events/${event.id}/staff/assign`}>Assign Staff</a>
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
              staff={event.staff} 
              eventId={event.id} 
              canEdit={event.canEdit} 
            />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}