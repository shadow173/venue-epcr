"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar,
  Eye,
  FileEdit,
  MoreVertical,
  Search,
  Tag,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

// Type for patient data
interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dob: string | Date;
  createdAt: string | Date;
  triageTag?: string | null;
  status?: string | null;
  disposition?: string | null;
}

interface PatientListProps {
  patients: Patient[];
  eventId: string;
}

// Format patient age from DOB
function calculateAge(dob: Date | string): number {
  const birthDate = new Date(dob);
  const today = new Date();
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

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

// Get status badge variant
function getStatusBadge(status: string | null | undefined): "default" | "outline" | "secondary" | "success" {
  if (!status) return "outline";
  
  switch (status.toLowerCase()) {
    case "complete":
      return "success";
    case "in progress":
    case "incomplete":
      return "secondary";
    default:
      return "default";
  }
}

export function PatientList({ patients, eventId }: PatientListProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [patientToDelete, setPatientToDelete] = useState<string | null>(null);
  if (!patients || !Array.isArray(patients)) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30">
          {/* Add appropriate icon here */}
        </div>
        <h3 className="mt-4 text-lg font-medium">No patients found</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          There are no patients for this event yet.
        </p>
      </div>
    );
  }
  // Filter patients based on search query
  const filteredPatients = patients.filter((patient) => {
    const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });
  // Handler for patient deletion
  const handleDeletePatient = async () => {
    if (!patientToDelete) return;
    
    try {
      const response = await fetch(`/api/patients/${patientToDelete}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete patient");
      }
      
      toast.success("Patient deleted", {
        description: "The patient record has been successfully deleted."
      });
      
      // Refresh the page
      router.refresh();
    } catch (error) {
      console.error("Error deleting patient:", error);
      toast.error("Error", {
        description: "Failed to delete patient. Please try again."
      });
    } finally {
      setPatientToDelete(null);
    }
  };
  
  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative w-full md:w-auto md:flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
          <Input
            type="search"
            placeholder="Search patients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9"
          />
        </div>
      </div>
      
      {filteredPatients.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
          <div className="rounded-full bg-gray-100 p-3 dark:bg-gray-700">
            <AlertTriangle className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="mt-4 text-sm font-medium">No patients found</h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {searchQuery ? "Try a different search term" : "Add patients to get started"}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <Table>
            <TableHeader className="bg-gray-50 dark:bg-gray-800/50">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPatients.map((patient) => (
                <TableRow key={patient.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <TableCell className="font-medium">
                    <div 
                      onClick={() => router.push(`/events/${eventId}/patients/${patient.id}`)}
                      className="flex items-center gap-2"
                    >
                      <div>
                        {patient.firstName} {patient.lastName}
                        {patient.triageTag && (
                          <Badge className={cn("ml-2", getTriageTagClass(patient.triageTag))}>
                            <Tag className="mr-1 h-3 w-3" />
                            {patient.triageTag}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-gray-400" />
                      {calculateAge(patient.dob)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(patient.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadge(patient.status)}>
                      {patient.status ? patient.status : "Not started"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/events/${eventId}/patients/${patient.id}`)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/events/${eventId}/patients/${patient.id}/edit`)}>
                          <FileEdit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => setPatientToDelete(patient.id)}
                          className="text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!patientToDelete} onOpenChange={(open) => !open && setPatientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the patient
              record and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePatient} className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}