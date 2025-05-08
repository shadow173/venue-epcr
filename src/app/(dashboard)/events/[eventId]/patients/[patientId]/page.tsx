import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { db } from "@/db";
import { 
  patients, 
  events, 
  venues, 
  assessments, 
  vitals, 
  treatments, 
  users 
} from "@/db/schema";
import { eq, and, desc, or } from "drizzle-orm";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  CalendarDays,
  ClipboardList,
  FileText,
  Activity,
  CheckSquare,
  Tag,
  AlertCircle,
  PlusCircle
} from "lucide-react";
import Link from "next/link";
import { PatientDetailsForm } from "@/components/patients/patient-details-form";
import { AssessmentForm } from "@/components/patients/assessment-form";
import { NarrativeForm } from "@/components/patients/narrative-form";
import { CompletionForm } from "@/components/patients/completion-form";
import { VitalsList } from "@/components/patients/vitals-list";
import { TreatmentsList } from "@/components/patients/treatments-list";

// Get patient data
async function getPatient(patientId: string, eventId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  // For EMTs, check time-based access restrictions
  if (session.user.role !== "ADMIN") {
    const now = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    // First check if this patient was created within time restrictions
    const patientWithTimeCheck = await db.select({
      id: patients.id,
      createdAt: patients.createdAt,
      eventStartDate: events.startDate,
    })
    .from(patients)
    .innerJoin(events, eq(patients.eventId, events.id))
    .where(
      and(
        eq(patients.id, patientId),
        eq(patients.eventId, eventId),
        or(
          // Created in last 24 hours
          patients.createdAt >= yesterday.toISOString(),
          // Created on same day as event
          and(
            // This is a simplification 
            patients.createdAt >= yesterday.toISOString(),
            patients.createdAt <= now.toISOString()
          )
        )
      )
    )
    .limit(1);
    
    // If no patient found with time restrictions, return null
    if (patientWithTimeCheck.length === 0) return null;
  }
  
  // Get patient details with assessment
  const patientData = await db.select({
    id: patients.id,
    eventId: patients.eventId,
    firstName: patients.firstName,
    lastName: patients.lastName,
    dob: patients.dob,
    alcoholInvolved: patients.alcoholInvolved,
    triageTag: patients.triageTag,
    fileAttachmentUrl: patients.fileAttachmentUrl,
    s3Key: patients.s3Key,
    createdAt: patients.createdAt,
    creatorName: users.name,
    eventName: events.name,
    eventState: events.state,
    venueName: venues.name,
    assessmentId: assessments.id,
    chiefComplaint: assessments.chiefComplaint,
    narrative: assessments.narrative,
    disposition: assessments.disposition,
    hospitalName: assessments.hospitalName,
    emsUnit: assessments.emsUnit,
    patientSignature: assessments.patientSignature,
    patientSignatureTimestamp: assessments.patientSignatureTimestamp,
    emtSignature: assessments.emtSignature,
    emtSignatureTimestamp: assessments.emtSignatureTimestamp,
    status: assessments.status,
  })
  .from(patients)
  .innerJoin(events, eq(patients.eventId, events.id))
  .leftJoin(venues, eq(events.venueId, venues.id))
  .leftJoin(users, eq(patients.createdBy, users.id))
  .leftJoin(assessments, eq(patients.id, assessments.patientId))
  .where(
    and(
      eq(patients.id, patientId),
      eq(patients.eventId, eventId)
    )
  )
  .limit(1);
  
  if (patientData.length === 0) return null;
  
  return patientData[0];
}

// Get vitals for this patient
async function getPatientVitals(assessmentId: string | null) {
  if (!assessmentId) return [];
  
  return await db.select()
    .from(vitals)
    .where(eq(vitals.assessmentId, assessmentId))
    .orderBy(desc(vitals.timestamp));
}

// Get treatments for this patient
async function getPatientTreatments(assessmentId: string | null) {
  if (!assessmentId) return [];
  
  return await db.select()
    .from(treatments)
    .where(eq(treatments.assessmentId, assessmentId))
    .orderBy(desc(treatments.timestamp));
}

// Format patient age from DOB
function calculateAge(dob: Date | string): string {
  const birthDate = new Date(dob);
  const today = new Date();
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age.toString();
}

// Get triage tag color class
function getTriageTagClass(tag: string | null): string {
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

export default async function PatientDetailPage({ 
  params 
}: { 
  params: { eventId: string; patientId: string } 
}) {
  const session = await auth();
  if (!session) return null;
  
  const patient = await getPatient(params.patientId, params.eventId);
  
  // If patient not found or user doesn't have access
  if (!patient) {
    notFound();
  }
  
  const [patientVitals, patientTreatments] = await Promise.all([
    getPatientVitals(patient.assessmentId),
    getPatientTreatments(patient.assessmentId),
  ]);
  
  const isComplete = patient.status === "complete";
  const isAdmin = session.user.role === "ADMIN";
  const canEdit = !isComplete || isAdmin;
  
  return (
    <div className="animate-fadeIn space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/events/${params.eventId}`}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to event</span>
          </Link>
        </Button>
        
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {patient.firstName} {patient.lastName}
          </h1>
          <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
            <div className="flex items-center">
              <CalendarDays className="mr-1 h-4 w-4" />
              {calculateAge(patient.dob)} years
            </div>
            
            {patient.triageTag && (
              <Badge className={getTriageTagClass(patient.triageTag)}>
                <Tag className="mr-1 h-3 w-3" />
                {patient.triageTag} Triage
              </Badge>
            )}
            
            <Badge variant={patient.status === "complete" ? "success" : "secondary"}>
              {patient.status === "complete" ? "Completed" : "In Progress"}
            </Badge>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            Event: {patient.eventName}
          </p>
          {patient.venueName && (
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
              Venue: {patient.venueName}
            </p>
          )}
        </div>
        <div className="text-right text-sm">
          <p className="font-medium">{format(new Date(patient.createdAt), "PPP")}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Created by: {patient.creatorName || "Unknown"}
          </p>
        </div>
      </div>
      
      {isComplete && !isAdmin && (
        <div className="rounded-md bg-yellow-50 p-4 dark:bg-yellow-900/20">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-yellow-400 dark:text-yellow-300" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Completed Record</h3>
              <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                <p>
                  This patient record has been marked as complete and cannot be edited. 
                  Contact an administrator if changes are needed.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <Tabs defaultValue="patient" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="patient">
            <ClipboardList className="mr-2 h-4 w-4" />
            Patient
          </TabsTrigger>
          <TabsTrigger value="assessment">
            <Activity className="mr-2 h-4 w-4" />
            Assessment
          </TabsTrigger>
          <TabsTrigger value="narrative">
            <FileText className="mr-2 h-4 w-4" />
            Narrative
          </TabsTrigger>
          <TabsTrigger value="complete">
            <CheckSquare className="mr-2 h-4 w-4" />
            Complete
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="patient" className="mt-6 space-y-6">
          <PatientDetailsForm 
            patient={patient} 
            canEdit={canEdit} 
            eventState={patient.eventState} 
          />
        </TabsContent>
        
        <TabsContent value="assessment" className="mt-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Vitals</h2>
                {canEdit && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/events/${params.eventId}/patients/${params.patientId}/vitals/new`}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Vitals
                    </Link>
                  </Button>
                )}
              </div>
              
              <VitalsList 
                vitals={patientVitals} 
                patientId={params.patientId} 
                canEdit={canEdit} 
              />
            </div>
            
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Treatments</h2>
                {canEdit && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/events/${params.eventId}/patients/${params.patientId}/treatments/new`}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Treatment
                    </Link>
                  </Button>
                )}
              </div>
              
              <TreatmentsList 
                treatments={patientTreatments} 
                patientId={params.patientId} 
                canEdit={canEdit} 
              />
            </div>
          </div>
          
          <Separator />
          
          <AssessmentForm 
            assessment={{
              id: patient.assessmentId,
              patientId: patient.id,
              chiefComplaint: patient.chiefComplaint,
            }}
            canEdit={canEdit}
          />
        </TabsContent>
        
        <TabsContent value="narrative" className="mt-6">
          <NarrativeForm
            assessment={{
              id: patient.assessmentId,
              patientId: patient.id,
              narrative: patient.narrative,
            }}
            canEdit={canEdit}
          />
        </TabsContent>
        
        <TabsContent value="complete" className="mt-6">
          <CompletionForm
            assessment={{
              id: patient.assessmentId,
              patientId: patient.id,
              disposition: patient.disposition,
              hospitalName: patient.hospitalName,
              emsUnit: patient.emsUnit,
              patientSignature: patient.patientSignature,
              patientSignatureTimestamp: patient.patientSignatureTimestamp ? new Date(patient.patientSignatureTimestamp) : null,
              emtSignature: patient.emtSignature,
              emtSignatureTimestamp: patient.emtSignatureTimestamp ? new Date(patient.emtSignatureTimestamp) : null,
              status: patient.status,
            }}
            canEdit={canEdit}
            isAdmin={isAdmin}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}