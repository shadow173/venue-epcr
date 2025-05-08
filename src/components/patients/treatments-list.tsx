"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Clock, Clipboard, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Treatment {
  id: string;
  timestamp: string | Date;
  name: string;
  notes?: string | null;
}

interface TreatmentsListProps {
  treatments: Treatment[];
  patientId: string;
  canEdit: boolean;
}

export function TreatmentsList({ treatments, patientId, canEdit }: TreatmentsListProps) {
  const [expandedNotes, setExpandedNotes] = useState<string | null>(null);
  
  const toggleNotes = (treatmentId: string) => {
    if (expandedNotes === treatmentId) {
      setExpandedNotes(null);
    } else {
      setExpandedNotes(treatmentId);
    }
  };
  
  if (treatments.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-6 text-center">
          <div className="rounded-full bg-gray-100 p-3 dark:bg-gray-800">
            <Clipboard className="h-6 w-6 text-gray-500 dark:text-gray-400" />
          </div>
          <h3 className="mt-4 text-sm font-medium">No treatments recorded</h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Treatments will appear here once they are recorded.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="rounded-md border border-gray-200 dark:border-gray-700">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Treatment</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {treatments.map((treatment) => (
              <TableRow key={treatment.id}>
                <TableCell className="whitespace-nowrap">
                  <div className="flex items-center">
                    <Clock className="mr-2 h-4 w-4 text-gray-400" />
                    {format(new Date(treatment.timestamp), "h:mm a")}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {format(new Date(treatment.timestamp), "MMM d, yyyy")}
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  {treatment.name}
                </TableCell>
                <TableCell>
                  {treatment.notes ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleNotes(treatment.id)}
                    >
                      {expandedNotes === treatment.id ? "Hide" : "View Notes"}
                    </Button>
                  ) : (
                    <span className="text-sm text-gray-500 dark:text-gray-400">No notes</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {/* Expanded notes section */}
      {expandedNotes && (
        <div className="border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
          {(() => {
            const treatment = treatments.find(t => t.id === expandedNotes);
            if (!treatment || !treatment.notes) return null;
            
            return (
              <div className="space-y-4">
                <div>
                  <h4 className="mb-2 text-sm font-semibold">{treatment.name} Notes</h4>
                  <div className="rounded-md border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900/50">
                    {treatment.notes}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Treatment provided at {format(new Date(treatment.timestamp), "PPp")}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}