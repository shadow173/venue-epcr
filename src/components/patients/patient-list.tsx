// src/components/patients/patient-list.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { 
  Search, 
  Calendar, 
  Tag,
  AlertTriangle,
  FilePenLine,
  FileText,
  ChevronDown,
  UserPlus
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  triageTag?: string | null;
  status?: string | null;
  createdAt: string;
}

interface PatientListProps {
  patients: Patient[];
  eventId: string;
  canEdit: boolean;
}

export function PatientList({ patients, eventId, canEdit }: PatientListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [triageFilter, setTriageFilter] = useState("");
  
  // Apply filters to the patient list
  const filteredPatients = patients.filter((patient) => {
    // Apply search filter (case insensitive)
    const searchMatch = searchQuery === "" || 
      `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Apply status filter
    const statusMatch = statusFilter === "" || patient.status === statusFilter;
    
    // Apply triage filter
    const triageMatch = triageFilter === "" || patient.triageTag === triageFilter;
    
    return searchMatch && statusMatch && triageMatch;
  });
  
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
  
  // If no patients after filtering
  if (filteredPatients.length === 0) {
    return (
      <div>
        <div className="mb-4 flex flex-col gap-4 sm:flex-row">
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All statuses</SelectItem>
                <SelectItem value="incomplete">Incomplete</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={triageFilter} onValueChange={setTriageFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All triage tags" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All triage tags</SelectItem>
                <SelectItem value="RED">Red</SelectItem>
                <SelectItem value="YELLOW">Yellow</SelectItem>
                <SelectItem value="GREEN">Green</SelectItem>
                <SelectItem value="BLACK">Black</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
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
          {canEdit && (
            <Button asChild className="mt-4">
              <Link href={`/events/${eventId}/patients/new`}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Patient
              </Link>
            </Button>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <div className="mb-4 flex flex-col gap-4 sm:flex-row">
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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              <SelectItem value="incomplete">Incomplete</SelectItem>
              <SelectItem value="complete">Complete</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={triageFilter} onValueChange={setTriageFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All triage tags" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All triage tags</SelectItem>
              <SelectItem value="RED">Red</SelectItem>
              <SelectItem value="YELLOW">Yellow</SelectItem>
              <SelectItem value="GREEN">Green</SelectItem>
              <SelectItem value="BLACK">Black</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50 dark:bg-gray-800/50">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Triage</TableHead>
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/events/${eventId}/patients/${patient.id}`}>
                            <FileText className="mr-2 h-4 w-4" />
                            View Record
                          </Link>
                        </DropdownMenuItem>
                        {canEdit && (
                          <DropdownMenuItem asChild>
                            <Link href={`/events/${eventId}/patients/${patient.id}`}>
                              <FilePenLine className="mr-2 h-4 w-4" />
                              Edit Record
                            </Link>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}