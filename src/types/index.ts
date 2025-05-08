// src/types/index.ts
import { inferRouterOutputs, inferRouterInputs } from '@trpc/server';
import { z } from 'zod';

// User types
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  emtLevel: z.string().optional(),
  certificationEndDate: z.date().optional(),
  region: z.string().optional(),
  role: z.enum(['admin', 'supervisor', 'emt', 'user']).default('user')
});

export type User = z.infer<typeof userSchema>;

// Event types
export const eventSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Event name is required"),
  venueId: z.string().uuid().optional(),
  startDate: z.date(),
  endDate: z.date(),
  state: z.string().min(1, "State is required"),
  timezone: z.string().min(1, "Timezone is required"),
  notes: z.string().optional()
});

export type Event = z.infer<typeof eventSchema>;

// Venue types
export const venueSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Venue name is required"),
  address: z.string().min(1, "Address is required"),
  notes: z.string().optional()
});

export type Venue = z.infer<typeof venueSchema>;

// Patient types
export const patientSchema = z.object({
  id: z.string().uuid().optional(),
  eventId: z.string().uuid(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dob: z.date(),
  alcoholInvolved: z.boolean().default(false),
  triageTag: z.string().optional(),
  fileAttachmentUrl: z.string().optional(),
  fileAttachmentKey: z.string().optional()
});

export type Patient = z.infer<typeof patientSchema>;

// Assessment types
export const assessmentSchema = z.object({
  id: z.string().uuid().optional(),
  patientId: z.string().uuid(),
  chiefComplaint: z.string().optional(),
  narrative: z.string().optional(),
  disposition: z.enum(['transported', 'rma', 'eloped']).optional(),
  hospitalName: z.string().optional(),
  emsUnit: z.string().optional(),
  patientSignature: z.string().optional(),
  emtSignature: z.string().optional(),
  status: z.enum(['incomplete', 'complete']).default('incomplete')
});

export type Assessment = z.infer<typeof assessmentSchema>;

// Vitals types
export const vitalsSchema = z.object({
  id: z.string().uuid().optional(),
  assessmentId: z.string().uuid(),
  timestamp: z.date(),
  bloodPressureSystolic: z.number().int().optional(),
  bloodPressureDiastolic: z.number().int().optional(),
  heartRate: z.number().int().optional(),
  respiratoryRate: z.number().int().optional(),
  oxygenSaturation: z.number().int().optional(),
  temperature: z.string().optional(),
  bloodGlucose: z.number().int().optional(),
  painLevel: z.number().int().min(0).max(10).optional(),
  gcs: z.number().int().min(3).max(15).optional(),
  additionalVitals: z.record(z.string(), z.any()).optional()
});

export type Vitals = z.infer<typeof vitalsSchema>;

// Treatment types
export const treatmentSchema = z.object({
  id: z.string().uuid().optional(),
  assessmentId: z.string().uuid(),
  timestamp: z.date(),
  name: z.string().min(1, "Treatment name is required"),
  notes: z.string().optional(),
  medicationName: z.string().optional(),
  medicationDose: z.string().optional(),
  medicationRoute: z.string().optional()
});

export type Treatment = z.infer<typeof treatmentSchema>;

// Staff Assignment types
export const staffAssignmentSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  eventId: z.string().uuid(),
  role: z.string().min(1, "Role is required")
});

export type StaffAssignment = z.infer<typeof staffAssignmentSchema>;