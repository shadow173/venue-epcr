"use client";

import { useState } from "react";
import { format } from "date-fns";
import { 
  Clock, 
  ThermometerIcon, 
  Activity, 
  Stethoscope, 
  Droplet, 
  Ruler, 
} from "lucide-react";
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

interface Vital {
  id: string;
  timestamp: string | Date;
  bloodPressure?: string | null;
  heartRate?: number | null;
  respiratoryRate?: number | null;
  oxygenSaturation?: number | null;
  temperature?: number | null;
  glucoseLevel?: number | null;
  painScale?: number | null;
  notes?: string | null;
}

interface VitalsListProps {
  vitals: Vital[];
  patientId: string;
  canEdit: boolean;
}

export function VitalsList({ vitals }: VitalsListProps) {
  const [expandedNotes, setExpandedNotes] = useState<string | null>(null);
  
  const toggleNotes = (vitalId: string) => {
    if (expandedNotes === vitalId) {
      setExpandedNotes(null);
    } else {
      setExpandedNotes(vitalId);
    }
  };
  
  if (vitals.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-6 text-center">
          <div className="rounded-full bg-gray-100 p-3 dark:bg-gray-800">
            <Activity className="h-6 w-6 text-gray-500 dark:text-gray-400" />
          </div>
          <h3 className="mt-4 text-sm font-medium">No vitals recorded</h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Vitals will appear here once they are recorded.
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
              <TableHead>BP</TableHead>
              <TableHead>HR</TableHead>
              <TableHead>RR</TableHead>
              <TableHead>SpO2</TableHead>
              <TableHead>Temp</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vitals.map((vital) => (
              <TableRow key={vital.id}>
                <TableCell className="whitespace-nowrap">
                  <div className="flex items-center">
                    <Clock className="mr-2 h-4 w-4 text-gray-400" />
                    {format(new Date(vital.timestamp), "h:mm a")}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {format(new Date(vital.timestamp), "MMM d, yyyy")}
                  </div>
                </TableCell>
                <TableCell>
                  {vital.bloodPressure || "—"}
                </TableCell>
                <TableCell>
                  {vital.heartRate ? `${vital.heartRate}` : "—"}
                </TableCell>
                <TableCell>
                  {vital.respiratoryRate ? `${vital.respiratoryRate}` : "—"}
                </TableCell>
                <TableCell>
                  {vital.oxygenSaturation ? `${vital.oxygenSaturation}%` : "—"}
                </TableCell>
                <TableCell>
                  {vital.temperature ? `${vital.temperature}°F` : "—"}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleNotes(vital.id)}
                  >
                    {expandedNotes === vital.id ? "Hide" : "Details"}
                  </Button>
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
            const vital = vitals.find(v => v.id === expandedNotes);
            if (!vital) return null;
            
            return (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="mb-2 text-sm font-semibold">Vital Signs</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center">
                        <Activity className="mr-2 h-4 w-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium">Blood Pressure</div>
                          <div className="text-sm">{vital.bloodPressure || "Not recorded"}</div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Activity className="mr-2 h-4 w-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium">Heart Rate</div>
                          <div className="text-sm">{vital.heartRate ? `${vital.heartRate} BPM` : "Not recorded"}</div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Stethoscope className="mr-2 h-4 w-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium">Respiratory Rate</div>
                          <div className="text-sm">{vital.respiratoryRate ? `${vital.respiratoryRate} BPM` : "Not recorded"}</div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Droplet className="mr-2 h-4 w-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium">SpO2</div>
                          <div className="text-sm">{vital.oxygenSaturation ? `${vital.oxygenSaturation}%` : "Not recorded"}</div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <ThermometerIcon className="mr-2 h-4 w-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium">Temperature</div>
                          <div className="text-sm">{vital.temperature ? `${vital.temperature}°F` : "Not recorded"}</div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Droplet className="mr-2 h-4 w-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium">Glucose</div>
                          <div className="text-sm">{vital.glucoseLevel ? `${vital.glucoseLevel} mg/dL` : "Not recorded"}</div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Ruler className="mr-2 h-4 w-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium">Pain Scale</div>
                          <div className="text-sm">{vital.painScale !== null && vital.painScale !== undefined ? `${vital.painScale}/10` : "Not recorded"}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="mb-2 text-sm font-semibold">Notes</h4>
                    <div className="rounded-md border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900/50">
                      {vital.notes || "No notes recorded for this vital signs measurement."}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Recorded on {format(new Date(vital.timestamp), "PPp")}
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