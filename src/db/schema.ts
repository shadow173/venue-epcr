// src/db/schema.ts
import { pgTable, text, timestamp, boolean, varchar, uuid, json, index, integer, decimal } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Users
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("EMT"),
  certificationEndDate: timestamp("certification_end_date"),
  region: varchar("region", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  staffAssignments: many(staffAssignments),
  patientsCreated: many(patients),
  patientsUpdated: many(patients),
}));

// Venues
export const venues = pgTable("venues", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  address: varchar("address", { length: 255 }).notNull(),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zipCode: varchar("zip_code", { length: 20 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: uuid("created_by").references(() => users.id),
});

export const venuesRelations = relations(venues, ({ many }) => ({
  events: many(events),
}));

// Events
export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  venueId: uuid("venue_id").references(() => venues.id),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  state: varchar("state", { length: 50 }).notNull(),
  timezone: varchar("timezone", { length: 50 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: uuid("created_by").references(() => users.id),
}, (table) => {
  return {
    venueIdIdx: index("venue_id_idx").on(table.venueId),
    dateIdx: index("event_date_idx").on(table.startDate, table.endDate)
  };
});

export const eventsRelations = relations(events, ({ one, many }) => ({
  venue: one(venues, {
    fields: [events.venueId],
    references: [venues.id],
  }),
  patients: many(patients),
  staffAssignments: many(staffAssignments),
}));

// Staff Assignments
export const staffAssignments = pgTable("staff_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  eventId: uuid("event_id").references(() => events.id).notNull(),
  role: varchar("role", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index("staff_user_id_idx").on(table.userId),
    eventIdIdx: index("staff_event_id_idx").on(table.eventId),
  };
});

export const staffAssignmentsRelations = relations(staffAssignments, ({ one }) => ({
  user: one(users, {
    fields: [staffAssignments.userId],
    references: [users.id],
  }),
  event: one(events, {
    fields: [staffAssignments.eventId],
    references: [events.id],
  }),
}));

// Patients
export const patients = pgTable("patients", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").references(() => events.id).notNull(),
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  dob: timestamp("dob").notNull(),
  alcoholInvolved: boolean("alcohol_involved").default(false),
  triageTag: varchar("triage_tag", { length: 50 }),
  fileAttachmentUrl: text("file_attachment_url"),
  s3Key: text("s3_key"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  updatedBy: uuid("updated_by").references(() => users.id).notNull(),
}, (table) => {
  return {
    eventIdIdx: index("patient_event_id_idx").on(table.eventId),
    createdAtIdx: index("patient_created_at_idx").on(table.createdAt),
  };
});

export const patientsRelations = relations(patients, ({ one }) => ({
  event: one(events, {
    fields: [patients.eventId],
    references: [events.id],
  }),
  creator: one(users, {
    fields: [patients.createdBy],
    references: [users.id],
  }),
  updater: one(users, {
    fields: [patients.updatedBy],
    references: [users.id],
  }),
  assessment: one(assessments, {
    fields: [patients.id],
    references: [assessments.patientId],
  }),
}));

// Assessments
export const assessments = pgTable("assessments", {
  id: uuid("id").primaryKey().defaultRandom(),
  patientId: uuid("patient_id").references(() => patients.id).notNull().unique(),
  chiefComplaint: text("chief_complaint"),
  narrative: text("narrative"),
  disposition: varchar("disposition", { length: 100 }),
  hospitalName: varchar("hospital_name", { length: 255 }),
  emsUnit: varchar("ems_unit", { length: 100 }),
  patientSignature: text("patient_signature"),
  patientSignatureTimestamp: timestamp("patient_signature_timestamp"),
  emtSignature: text("emt_signature"),
  emtSignatureTimestamp: timestamp("emt_signature_timestamp"),
  status: varchar("status", { length: 50 }).notNull().default("incomplete"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: uuid("updated_by").references(() => users.id),
}, (table) => {
  return {
    patientIdIdx: index("assessment_patient_id_idx").on(table.patientId),
    statusIdx: index("assessment_status_idx").on(table.status),
  };
});

export const assessmentsRelations = relations(assessments, ({ one, many }) => ({
  patient: one(patients, {
    fields: [assessments.patientId],
    references: [patients.id],
  }),
  vitals: many(vitals),
  treatments: many(treatments),
}));

// Vitals
export const vitals = pgTable("vitals", {
  id: uuid("id").primaryKey().defaultRandom(),
  assessmentId: uuid("assessment_id").references(() => assessments.id).notNull(),
  timestamp: timestamp("timestamp").notNull(),
  bloodPressure: varchar("blood_pressure", { length: 50 }),
  heartRate: integer("heart_rate"),
  respiratoryRate: integer("respiratory_rate"),
  oxygenSaturation: integer("oxygen_saturation"),
  temperature: decimal("temperature", { precision: 5, scale: 2 }),
  glucoseLevel: integer("glucose_level"),
  painScale: integer("pain_scale"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
}, (table) => {
  return {
    assessmentIdIdx: index("vitals_assessment_id_idx").on(table.assessmentId),
  };
});

export const vitalsRelations = relations(vitals, ({ one }) => ({
  assessment: one(assessments, {
    fields: [vitals.assessmentId],
    references: [assessments.id],
  }),
  creator: one(users, {
    fields: [vitals.createdBy],
    references: [users.id],
  }),
}));

// Treatments
export const treatments = pgTable("treatments", {
  id: uuid("id").primaryKey().defaultRandom(),
  assessmentId: uuid("assessment_id").references(() => assessments.id).notNull(),
  timestamp: timestamp("timestamp").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
}, (table) => {
  return {
    assessmentIdIdx: index("treatments_assessment_id_idx").on(table.assessmentId),
  };
});

export const treatmentsRelations = relations(treatments, ({ one }) => ({
  assessment: one(assessments, {
    fields: [treatments.assessmentId],
    references: [assessments.id],
  }),
  creator: one(users, {
    fields: [treatments.createdBy],
    references: [users.id],
  }),
}));

// Audit logs
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  resource: varchar("resource", { length: 50 }).notNull(),
  resourceId: uuid("resource_id"),
  details: json("details"),
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => {
  return {
    userIdIdx: index("audit_user_id_idx").on(table.userId),
    timestampIdx: index("audit_timestamp_idx").on(table.timestamp),
    resourceIdx: index("audit_resource_idx").on(table.resource, table.resourceId),
  };
});

// Types for TypeScript
export type User = typeof users.$inferSelect;
export type Venue = typeof venues.$inferSelect;
export type Event = typeof events.$inferSelect;
export type StaffAssignment = typeof staffAssignments.$inferSelect;
export type Patient = typeof patients.$inferSelect;
export type Assessment = typeof assessments.$inferSelect;
export type Vital = typeof vitals.$inferSelect;
export type Treatment = typeof treatments.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;