// src/app/(dashboard)/patients/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { 
  Search, 
  Calendar, 
  Tag,
  AlertTriangle,
  PlusCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  createdAt: string;
  eventId: string;
  eventName: string;
  triageTag?: string | null;
  status?: string | null;
}

interface Event {
  id: string;
  name: string;
}

export default function PatientsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all-statuses"); // Changed from ""
  const [eventFilter, setEventFilter] = useState("all-events"); // Changed from ""
  const [isLoading, setIsLoading] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  
  // Fetch all events for the dropdown
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setEvents(data);
        }
      } catch (error) {
        console.error('Error fetching events:', error);
      }
    };
    
    fetchEvents();
  }, []);
  
  // Fetch patient data from each event
  useEffect(() => {
    const fetchAllPatients = async () => {
      if (!events.length) return;
      
      setIsLoading(true);
      const allPatients: Patient[] = [];
      
      try {
        // Fetch patients from each event
        for (const event of events) {
          const response = await fetch(`/api/events/${event.id}/patients`, {
            credentials: 'include'
          });
          
          if (response.ok) {
            const eventPatients = await response.json();
            
            // Add event name to each patient
            const patientsWithEvent = eventPatients.map((patient: any) => ({
              ...patient,
              eventName: event.name
            }));
            
            allPatients.push(...patientsWithEvent);
          }
        }
        
        // Sort by created date (newest first)
        allPatients.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        setPatients(allPatients);
      } catch (error) {
        console.error('Error fetching patients:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAllPatients();
  }, [events]);
  
  // Apply filters to patients
  useEffect(() => {
    let result = [...patients];
    
    // Filter by search query (name)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (patient) => 
          patient.firstName.toLowerCase().includes(query) || 
          patient.lastName.toLowerCase().includes(query)
      );
    }
    
    // Filter by status
    if (statusFilter && statusFilter !== "all-statuses") {
      result = result.filter((patient) => patient.status === statusFilter);
    }
    
    // Filter by event
    if (eventFilter && eventFilter !== "all-events") {
      result = result.filter((patient) => patient.eventId === eventFilter);
    }
    
    setFilteredPatients(result);
  }, [patients, searchQuery, statusFilter, eventFilter]);
  
  // Calculate age from DOB
  const calculateAge = (dob: string): number => {
    const birthDate = new Date(dob);
    const today = new Date();
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };
  
  // Get triage tag color class
  function getTriageTagClass(tag: string | null | undefined): string {
    if (!tag) return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    
    switch (tag.toUpperCase()) {
      case "RED":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "YELLOW":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "GREEN":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "BLACK":
        return "bg-gray-900 text-white dark:bg-black dark:text-gray-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  }
  
  // Handle event selection for adding a patient
  const handleEventSelect = (eventId: string) => {
    if (eventId && eventId !== "select-event") {
      router.push(`/events/${eventId}/patients/new`);
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="animate-fadeIn space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Patients</h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              View and manage patient records
            </p>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="animate-fadeIn space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Patients</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            View and manage patient records
          </p>
        </div>
        
        {session?.user?.role === "ADMIN" && (
          <div className="mt-4 flex md:mt-0">
            <Select
              value="select-event"
              onValueChange={handleEventSelect}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Add Patient to Event" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="select-event">
                  <span className="text-muted-foreground">Select an event</span>
                </SelectItem>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Patient Records</CardTitle>
          <CardDescription>
            View and manage all patient records across events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search patients..."
                  className="w-full pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-4">
              <Select value={eventFilter} onValueChange={setEventFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-events">All events</SelectItem>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-statuses">All statuses</SelectItem>
                  <SelectItem value="incomplete">Incomplete</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {filteredPatients.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
              <div className="rounded-full bg-gray-100 p-3 dark:bg-gray-800">
                <AlertTriangle className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="mt-4 text-sm font-medium">No patients found</h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {patients.length === 0
                  ? "No patient records have been created yet."
                  : "No patients match your search criteria."}
              </p>
              {session?.user?.role === "ADMIN" && patients.length === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => router.push(`/events/${events[0]?.id}/patients/new`)}
                  disabled={!events.length}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add First Patient
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50 dark:bg-gray-800/50">
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead>Triage</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPatients.map((patient) => (
                      <TableRow key={patient.id}>
                        <TableCell className="font-medium">
                          {patient.firstName} {patient.lastName}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-gray-400" />
                            {calculateAge(patient.dob)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {patient.triageTag ? (
                            <Badge className={getTriageTagClass(patient.triageTag)}>
                              <Tag className="mr-1 h-3 w-3" />
                              {patient.triageTag}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <Link 
                            href={`/events/${patient.eventId}`}
                            className="text-blue-600 hover:underline dark:text-blue-400"
                          >
                            {patient.eventName}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {format(new Date(patient.createdAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={patient.status === "complete" ? "success" : "secondary"}
                          >
                            {patient.status || "Incomplete"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <Link href={`/events/${patient.eventId}/patients/${patient.id}`}>
                              View
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}