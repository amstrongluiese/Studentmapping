import { boolean, pgTable, text, serial, integer, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const schools = pgTable("schools", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").notNull().default(""),
  municipality: text("municipality").notNull().default("Laguna"),
  province: text("province").notNull().default("Laguna"),
  institutionType: text("institution_type").notNull().default("Feeder Institution"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  altitude: doublePrecision("altitude"),
  studentCount: integer("student_count").notNull().default(0),
  verified: boolean("verified").notNull().default(false),
  status: text("status").notNull().default("Needs Review"),
  source: text("source").notNull().default("Manual Entry"),
  placeId: text("place_id"),
});

export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  studentNumber: text("student_number").notNull().unique(),
  name: text("name").notNull(),
  referralCode: text("referral_code").notNull().unique(),
});

export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").references(() => students.id),
  referredName: text("referred_name").notNull(),
  relationship: text("relationship").notNull(),
  contactNumber: text("contact_number"),
  notes: text("notes"),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** GIS import/sync run metadata (not referral-related). */
export const imports = pgTable("imports", {
  id: serial("id").primaryKey(),
  source: text("source").notNull().default("api"),
  status: text("status").notNull().default("completed"),
  importedCount: integer("imported_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
});

/** Raw admissions rows before GIS processing. */
export const studentsRaw = pgTable("students_raw", {
  id: serial("id").primaryKey(),
  importId: integer("import_id").references(() => imports.id),
  studentNumber: text("student_number").notNull(),
  fullName: text("full_name").notNull(),
  course: text("course"),
  lastSchoolName: text("last_school_name").notNull(),
  lastSchoolType: text("last_school_type"),
  studentType: text("student_type"),
  municipality: text("municipality").notNull().default("Laguna"),
  rawPayload: text("raw_payload"),
  syncedAt: timestamp("synced_at").notNull().defaultNow(),
});

/** Processed GIS student rows linked to feeder schools. */
export const studentsProcessed = pgTable("students_processed", {
  id: serial("id").primaryKey(),
  rawId: integer("raw_id").references(() => studentsRaw.id),
  studentNumber: text("student_number").notNull(),
  fullName: text("full_name").notNull(),
  course: text("course"),
  admissionType: text("admission_type"),
  lastSchoolName: text("last_school_name").notNull(),
  lastSchoolType: text("last_school_type"),
  schoolId: integer("school_id").references(() => schools.id),
  municipality: text("municipality").notNull().default("Laguna"),
  province: text("province").notNull().default("Laguna"),
  yearLevel: text("year_level"),
  enrollmentStatus: text("enrollment_status").notNull().default("Active"),
  enrollmentDate: timestamp("enrollment_date").notNull().defaultNow(),
  importedSource: text("imported_source").notNull().default("API"),
  archivedAt: timestamp("archived_at"),
  mappingStatus: text("mapping_status").notNull().default("pending"),
  syncedAt: timestamp("synced_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at").notNull().defaultNow(),
});

/** Alternate normalized names → canonical school registry entry. */
export const schoolAliases = pgTable("school_aliases", {
  id: serial("id").primaryKey(),
  aliasNormalized: text("alias_normalized").notNull().unique(),
  schoolId: integer("school_id").notNull().references(() => schools.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** GIS mapping / geocode audit trail. */
export const mappingLogs = pgTable("mapping_logs", {
  id: serial("id").primaryKey(),
  importId: integer("import_id").references(() => imports.id),
  action: text("action").notNull(),
  schoolId: integer("school_id").references(() => schools.id),
  studentProcessedId: integer("student_processed_id").references(() => studentsProcessed.id),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const schoolStatusSchema = z.enum([
  "Verified",
  "Auto-Located",
  "Needs Review",
  "Missing Coordinates",
  "Duplicate Entry",
]);

export const insertSchoolSchema = createInsertSchema(schools, {
  name: z.string().trim().min(2, "School name is required"),
  normalizedName: z.string().optional(),
  municipality: z.string().trim().min(1).default("Laguna"),
  province: z.string().trim().min(1).default("Laguna"),
  institutionType: z.string().trim().min(1).default("Feeder Institution"),
  lat: z.coerce.number().min(-90).max(90).nullable().optional(),
  lng: z.coerce.number().min(-180).max(180).nullable().optional(),
  altitude: z.coerce.number().nullable().optional(),
  studentCount: z.coerce.number().int().min(0).default(0),
  verified: z.boolean().default(false),
  status: schoolStatusSchema.default("Needs Review"),
  source: z.string().trim().min(1).default("Manual Entry"),
  placeId: z.string().trim().nullable().optional(),
}).omit({ id: true });
export const insertStudentSchema = createInsertSchema(students).omit({ id: true });
export const insertReferralSchema = createInsertSchema(referrals).omit({ id: true, createdAt: true });

export type InsertSchool = z.infer<typeof insertSchoolSchema>;
export type School = typeof schools.$inferSelect;

export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof students.$inferSelect;
export type StudentInput = z.infer<typeof insertStudentSchema>;

export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referrals.$inferSelect;
export type ReferralInput = z.infer<typeof insertReferralSchema>;

export type Import = typeof imports.$inferSelect;
export type StudentRaw = typeof studentsRaw.$inferSelect;
export type StudentProcessed = typeof studentsProcessed.$inferSelect;
export type SchoolAlias = typeof schoolAliases.$inferSelect;
export type MappingLog = typeof mappingLogs.$inferSelect;
