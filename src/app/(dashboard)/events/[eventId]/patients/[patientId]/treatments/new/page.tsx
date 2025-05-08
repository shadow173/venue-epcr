// src/app/(dashboard)/events/[eventId]/patients/[patientId]/treatments/new/page.tsx
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { patients, events } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { TreatmentForm } from "@/components/patients/treatment-form";

// Check if patient exists and user has access
async function checkPatientAccess(eventId: string, patientId: string, userId: string, userRole: string) {
  try {
    // For admin, simple check
    if (userRole === "ADMIN") {
      const patient = await db.select({
        id: patients.id,
        firstName: patients.firstName,
        lastName: patients.lastName,
      })
      .from(patients)
      .where(
        and(
          eq(patients.id, patientId),
          eq(patients.eventId, eventId)
        )
      )
      .limit(1);
      
      return patient.length ? patient[0] : null;
    }
    
    // For EMTs, check time-based restrictions
    const now = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const patientWithTimeCheck = await db.select({
      id: patients.id,
      firstName: patients.firstName,
      lastName: patients.lastName,
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
    
    return patientWithTimeCheck.length ? patientWithTimeCheck[0] : null;
  } catch (error) {
    console.error("Error checking patient access:", error);
    return null;
  }
}

export default async function NewTreatmentPage({
  params,
}: {
  params: { eventId: string; patientId: string }
}) {
  const session = await auth();
  
  // Ensure user is authenticated
  if (!session) {
    redirect("/auth/signin");
  }
  
  // Check patient access
  const patient = await checkPatientAccess(
    params.eventId,
    params.patientId,
    session.user.id,
    session.user.role
  );
  
  if (!patient) {
    notFound();
  }
  
  return (
    <div className="animate-fadeIn space-y-6">
      <div className="flex items-center justify-start">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link href={`/events/${params.eventId}/patients/${params.patientId}`}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to patient</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          Record Treatment for {patient.firstName} {patient.lastName}
        </h1>
      </div>
      
      <div className="grid gap-6">
        <TreatmentForm 
          patientId={params.patientId} 
          eventId={params.eventId} 
        />
      </div>
    </div>
  );
}