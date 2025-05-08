"use client";

import { useState, useEffect } from "react";
import { redirect, useRouter } from "next/navigation";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import { 
  Calendar as CalendarIcon, 
  Download,
  Search,
  FileText,
  Calendar,
  CheckCircle,
  MapPin
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast, Toaster } from "sonner";
import { Badge } from "@/components/ui/badge";

// Define the report filter state
interface ReportFilters {
  eventId?: string;
  venueId?: string;
  patientName?: string;
  startDate?: Date;
  endDate?: Date;
  status?: string;
  page: number;
  limit: number;
}

// Define report result types
interface Patient {
  patientId: string;
  firstName: string;
  lastName: string;
  dob: string;
  createdAt: string;
  eventId: string;
  eventName: string;
  eventStartDate: string;
  venueId: string;
  venueName: string;
  assessmentId?: string;
  status?: string;
  disposition?: string;
  creator?: {
    id: string;
    name: string;
  };
}

interface ReportResults {
  data: Patient[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface Event {
  id: string;
  name: string;
}

interface Venue {
  id: string;
  name: string;
}

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Redirect if not admin
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      redirect("/");
    }
  }, [session, status, router]);
  
  const [filters, setFilters] = useState<ReportFilters>({
    page: 1,
    limit: 20,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ReportResults | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  
  // Fetch events and venues for filter dropdowns
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        // Fetch events
        const eventsResponse = await fetch('/api/events', {
          credentials: 'include'
        });
        
        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json();
          setEvents(eventsData);
        }
        
        // Fetch venues
        const venuesResponse = await fetch('/api/venues', {
          credentials: 'include'
        });
        
        if (venuesResponse.ok) {
          const venuesData = await venuesResponse.json();
          setVenues(venuesData);
        }
      } catch (error) {
        console.error('Error fetching filter options:', error);
      }
    };
    
    fetchFilterOptions();
  }, []);
  
  // Run report
  const runReport = async () => {
    setIsLoading(true);
    
    try {
      // Build query string from filters
      const queryParams = new URLSearchParams();
      
      if (filters.eventId) queryParams.append('eventId', filters.eventId);
      if (filters.venueId) queryParams.append('venueId', filters.venueId);
      if (filters.patientName) queryParams.append('patientName', filters.patientName);
      if (filters.startDate) queryParams.append('startDate', filters.startDate.toISOString());
      if (filters.endDate) queryParams.append('endDate', filters.endDate.toISOString());
      if (filters.status) queryParams.append('status', filters.status);
      queryParams.append('page', filters.page.toString());
      queryParams.append('limit', filters.limit.toString());
      
      const response = await fetch(`/api/admin/reports?${queryParams.toString()}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch report data');
      }
      
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Error running report:', error);
      toast.error('Error running report', {
        description: 'There was a problem retrieving the report data. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle filter changes
  const updateFilter = (key: keyof ReportFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      // Reset page when filters change
      page: key !== 'page' ? 1 : prev.page,
    }));
  };
  
  // Handle pagination
  const handlePageChange = (newPage: number) => {
    updateFilter('page', newPage);
  };
  
  // Reset filters
  const resetFilters = () => {
    setFilters({
      page: 1,
      limit: 20,
    });
    setResults(null);
  };
  
  // Export CSV (simplified - in a real app, would use proper CSV generation)
  const exportCSV = () => {
    if (!results || results.data.length === 0) {
      toast.error('No data to export', {
        description: 'Please run a report first to generate data for export.'
      });
      return;
    }
    
    // Simple CSV generation for demo purposes
    const headers = [
      'Patient ID',
      'First Name',
      'Last Name',
      'DOB',
      'Event',
      'Venue',
      'Status',
      'Disposition',
      'Created At',
      'Created By',
    ].join(',');
    
    const rows = results.data.map(patient => [
      patient.patientId,
      patient.firstName,
      patient.lastName,
      new Date(patient.dob).toLocaleDateString(),
      patient.eventName,
      patient.venueName,
      patient.status || 'Incomplete',
      patient.disposition || 'N/A',
      new Date(patient.createdAt).toLocaleString(),
      patient.creator?.name || 'Unknown',
    ].join(','));
    
    const csv = [headers, ...rows].join('\n');
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `patient-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Export complete', {
      description: 'Your report has been exported to CSV.'
    });
  };
  
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
  
  // Loading skeleton
  if (status === "loading") {
    return (
      <div className="animate-fadeIn space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-96" />
        </div>
        
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  
  // Only admins can access this page
  if (status === "authenticated" && session?.user?.role !== "ADMIN") {
    return null; // Redirect will happen via useEffect
  }
  
  return (
    <div className="animate-fadeIn space-y-6">
      <Toaster />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Generate and export patient reports
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
          <CardDescription>
            Customize your report by selecting filters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Event</label>
              <Select
                value={filters.eventId}
                onValueChange={(value) => updateFilter('eventId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All events</SelectItem>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Venue</label>
              <Select
                value={filters.venueId}
                onValueChange={(value) => updateFilter('venueId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All venues" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All venues</SelectItem>
                  {venues.map((venue) => (
                    <SelectItem key={venue.id} value={venue.id}>
                      {venue.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={filters.status}
                onValueChange={(value) => updateFilter('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="incomplete">Incomplete</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.startDate ? (
                      format(filters.startDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.startDate}
                    onSelect={(date) => updateFilter('startDate', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.endDate ? (
                      format(filters.endDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.endDate}
                    onSelect={(date) => updateFilter('endDate', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Patient Name</label>
              <div className="flex">
                <Input
                  type="text"
                  placeholder="Search by name"
                  value={filters.patientName || ''}
                  onChange={(e) => updateFilter('patientName', e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={resetFilters}>
            Reset Filters
          </Button>
          <Button onClick={runReport} disabled={isLoading}>
            {isLoading ? 'Running Report...' : 'Run Report'}
          </Button>
        </CardFooter>
      </Card>
      
      {/* Results Section */}
      {results && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Report Results</CardTitle>
              <CardDescription>
                {results.pagination.total} records found
              </CardDescription>
            </div>
            <Button variant="outline" onClick={exportCSV}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </CardHeader>
          <CardContent>
            {results.data.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="rounded-full bg-gray-100 p-3 dark:bg-gray-800">
                  <Search className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                </div>
                <h3 className="mt-4 text-lg font-medium">No results found</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Try adjusting your search filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Venue</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.data.map((patient) => (
                      <TableRow key={patient.patientId}>
                        <TableCell className="font-medium">
                          {patient.firstName} {patient.lastName}
                        </TableCell>
                        <TableCell>{calculateAge(patient.dob)}</TableCell>
                        <TableCell>{patient.eventName}</TableCell>
                        <TableCell>{patient.venueName}</TableCell>
                        <TableCell>
                          <Badge variant={patient.status === 'complete' ? 'success' : 'secondary'}>
                            {patient.status || 'Incomplete'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">
                              {format(new Date(patient.createdAt), "MMM d, yyyy")}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              by {patient.creator?.name || 'Unknown'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/events/${patient.eventId}/patients/${patient.patientId}`)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            
            {/* Pagination */}
            {results.pagination.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(1)}
                  disabled={filters.page === 1}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(filters.page - 1)}
                  disabled={filters.page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {filters.page} of {results.pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(filters.page + 1)}
                  disabled={filters.page === results.pagination.totalPages}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(results.pagination.totalPages)}
                  disabled={filters.page === results.pagination.totalPages}
                >
                  Last
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Dashboard Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex flex-col items-center pt-6">
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/30">
              <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="mt-3 text-lg font-medium">Patients</h3>
            <div className="mt-1 text-3xl font-bold">
              {results?.pagination.total || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex flex-col items-center pt-6">
            <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/30">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="mt-3 text-lg font-medium">Completed</h3>
            <div className="mt-1 text-3xl font-bold">
              {results?.data.filter(p => p.status === 'complete').length || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex flex-col items-center pt-6">
            <div className="rounded-full bg-yellow-100 p-3 dark:bg-yellow-900/30">
              <Calendar className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h3 className="mt-3 text-lg font-medium">Events</h3>
            <div className="mt-1 text-3xl font-bold">
              {events.length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex flex-col items-center pt-6">
            <div className="rounded-full bg-purple-100 p-3 dark:bg-purple-900/30">
              <MapPin className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="mt-3 text-lg font-medium">Venues</h3>
            <div className="mt-1 text-3xl font-bold">
              {venues.length}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}