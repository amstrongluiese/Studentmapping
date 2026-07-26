import { boolean, pgTable, text, serial, integer, doublePrecision, timestamp, index, varchar, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"), // admin, user
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
}, (table) => ({
  expireIdx: index("IDX_session_expire").on(table.expire),
}));

export const schoolRegistry = pgTable("school_registry", {
  id: serial("id").primaryKey(),
  schoolId: text("school_id"),
  schoolName: text("school_name").notNull(),
  normalizedSchoolName: text("normalized_school_name").notNull().default(""),
  schoolType: text("school_type"),
  sector: text("sector"),
  municipality: text("municipality").notNull().default("Unspecified"),
  province: text("province").notNull().default("Laguna"),
  barangay: text("barangay"),
  address: text("address"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  source: text("source"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
  deletedBy: integer("deleted_by").references(() => users.id),
}, (table) => ({
  nameIdx: index("school_registry_name_idx").on(table.schoolName),
  municipalityIdx: index("school_registry_municipality_idx").on(table.municipality),
}));

export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  studentNumber: text("student_number").notNull().unique(),
  name: text("name").notNull(),
  referralCode: text("referral_code").notNull().unique(),
  deletedAt: timestamp("deleted_at"),
  deletedBy: integer("deleted_by").references(() => users.id),
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
  deletedAt: timestamp("deleted_at"),
  deletedBy: integer("deleted_by").references(() => users.id),
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
  strand: text("strand"),
  lastSchoolName: text("last_school_name").notNull(),
  lastSchoolType: text("last_school_type"),
  studentType: text("student_type"),
  municipality: text("municipality").notNull().default("Unspecified"),
  province: text("province").notNull().default("Laguna"),
  barangay: text("barangay"),
  previousSchool: text("previous_school"),
  contactNumber: text("contact_number"),
  schedule: text("schedule"),
  iskolarNiKap: text("iskolar_ni_kap"),
  requirements: text("requirements"),
  yearLevel: text("year_level"),
  rawPayload: text("raw_payload"),
  syncedAt: timestamp("synced_at").notNull().defaultNow(),
});

/** Staging area for imported students before they become official records. */
export const studentImports = pgTable("student_imports", {
  id: serial("id").primaryKey(),
  studentNumber: text("student_number").notNull(),
  fullName: text("full_name").notNull(),
  previousSchool: text("previous_school"),
  strand: text("strand"),
  admissionType: text("admission_type"),
  program: text("program"),
  scholarship: text("scholarship"),
  municipality: text("municipality").notNull().default("Unspecified"),
  barangay: text("barangay"),
  importedAt: timestamp("imported_at").notNull().defaultNow(),
  importSource: text("import_source").notNull(),
  importStatus: text("import_status").notNull().default("Pending"), // Pending, Matched, Unmatched, Applied
  matchedSchoolId: integer("matched_school_id").references(() => schoolRegistry.id),
  matchConfidence: integer("match_confidence"),
  matchRule: text("match_rule"),
  enrollmentStatus: text("enrollment_status").notNull().default("Unknown"),
});

/** Processed GIS student rows linked to feeder schools. */
export const studentsProcessed = pgTable("students_processed", {
  id: serial("id").primaryKey(),
  rawId: integer("raw_id").references(() => studentsRaw.id),
  studentNumber: text("student_number").notNull(),
  fullName: text("full_name").notNull(),
  course: text("course"),
  strand: text("strand"),
  admissionType: text("admission_type"),
  lastSchoolName: text("last_school_name").notNull(),
  previousSchool: text("previous_school"),
  contactNumber: text("contact_number"),
  schedule: text("schedule"),
  iskolarNiKap: text("iskolar_ni_kap"),
  requirements: text("requirements"),
  lastSchoolType: text("last_school_type"),
  schoolRegistryId: integer("school_registry_id").references(() => schoolRegistry.id),
  municipality: text("municipality").notNull().default("Unspecified"),
  province: text("province").notNull().default("Laguna"),
  barangay: text("barangay"),
  yearLevel: text("year_level"),
  enrollmentStatus: text("enrollment_status").notNull().default("Active"),
  enrollmentDate: timestamp("enrollment_date").notNull().defaultNow(),
  importedSource: text("imported_source").notNull().default("API"),
  archivedAt: timestamp("archived_at"),
  mappingStatus: text("mapping_status").notNull().default("pending"),
  syncedAt: timestamp("synced_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at").notNull().defaultNow(),
}, (table) => ({
  schoolRegistryIdx: index("students_processed_school_id_idx").on(table.schoolRegistryId),
  municipalityIdx: index("students_processed_municipality_idx").on(table.municipality),
  courseIdx: index("students_processed_course_idx").on(table.course),
  studentNumberIdx: index("students_processed_student_no_idx").on(table.studentNumber),
  municipalityCourseIdx: index("students_processed_mun_course_idx").on(table.municipality, table.course),
  municipalityYearLevelIdx: index("students_processed_mun_yl_idx").on(table.municipality, table.yearLevel),
}));

/** Alternate normalized names → canonical school registry entry. */
export const schoolAliases = pgTable("school_aliases", {
  id: serial("id").primaryKey(),
  schoolRegistryId: integer("school_registry_id").notNull().references(() => schoolRegistry.id),
  aliasName: text("alias_name").notNull(),
  normalizedAlias: text("normalized_alias").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** GIS mapping / geocode audit trail. */
export const mappingLogs = pgTable("mapping_logs", {
  id: serial("id").primaryKey(),
  importId: integer("import_id").references(() => imports.id),
  action: text("action").notNull(),
  schoolRegistryId: integer("school_registry_id").references(() => schoolRegistry.id),
  studentProcessedId: integer("student_processed_id").references(() => studentsProcessed.id),
  message: text("message").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  schoolRegistryIdx: index("mapping_logs_school_id_idx").on(table.schoolRegistryId),
}));

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // e.g. 'CCS', 'COE'
  name: text("name").notNull(), // e.g. 'College of Computer Studies'
  color: text("color").notNull(),
  targetValue: integer("target_value").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const programs = pgTable("programs", {
  id: serial("id").primaryKey(),
  departmentId: integer("department_id").references(() => departments.id).notNull(),
  code: text("code").notNull().unique(), // e.g. 'BSCS CS'
  name: text("name").notNull(), // e.g. 'Bachelor of Science in Computer Science'
  track: text("track"), // Optional
  level: text("level").notNull().default("Bachelor"),
  color: text("color").notNull(),
  targetValue: integer("target_value").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** Permanent resolution history for matching unmatched schools to official registry */
export const schoolMatchHistory = pgTable("school_match_history", {
  id: serial("id").primaryKey(),
  importedName: text("imported_name").notNull(),
  officialSchoolId: integer("official_school_id").references(() => schoolRegistry.id),
  resolvedBy: text("resolved_by").notNull().default("Admin"),
  occurrences: integer("occurrences").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** Dynamic system configuration and integration secrets */
export const systemSettings = pgTable("system_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** Audit logs for DPA compliance (tracking PII access) */
export const dataAccessLogs = pgTable("data_access_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  action: text("action").notNull(), // e.g. 'VIEW', 'EXPORT', 'UPDATE'
  targetTable: text("target_table").notNull(),
  recordId: text("record_id"), // Can be string or number, stored as text
  ipAddress: text("ip_address"),
  accessedAt: timestamp("accessed_at").notNull().defaultNow(),
});

export const schoolStatusSchema = z.enum([
  "Verified",
  "Auto-Located",
  "Needs Review",
  "Missing Coordinates",
  "Duplicate Entry",
]);

export const insertSchoolRegistrySchema = createInsertSchema(schoolRegistry, {
  schoolName: z.string().trim().min(2, "School name is required"),
  normalizedSchoolName: z.string().optional(),
  latitude: z.coerce.number().min(-90).max(90).nullable().optional(),
  longitude: z.coerce.number().min(-180).max(180).nullable().optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });
export const insertStudentSchema = createInsertSchema(students).omit({ id: true });
export const insertReferralSchema = createInsertSchema(referrals).omit({ id: true, createdAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });

export type InsertSchoolRegistry = z.infer<typeof insertSchoolRegistrySchema>;
export type SchoolRegistry = typeof schoolRegistry.$inferSelect;

export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof students.$inferSelect;
export type StudentInput = z.infer<typeof insertStudentSchema>;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referrals.$inferSelect;
export type ReferralInput = z.infer<typeof insertReferralSchema>;

export type Import = typeof imports.$inferSelect;
export type StudentRaw = typeof studentsRaw.$inferSelect;
export type StudentProcessed = typeof studentsProcessed.$inferSelect;
export type StudentImport = typeof studentImports.$inferSelect;
export type SchoolAlias = typeof schoolAliases.$inferSelect;
export type MappingLog = typeof mappingLogs.$inferSelect;
export type Department = typeof departments.$inferSelect;
export type Program = typeof programs.$inferSelect;
