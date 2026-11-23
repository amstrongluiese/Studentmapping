import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";
import {
  mysqlTable,
  int,
  text,
  varchar,
  datetime,
  double,
  boolean,
  json,
  index,
} from "drizzle-orm/mysql-core";

/** Master Directory of all feeder schools in Laguna region */
export const schoolRegistry = mysqlTable(
  "school_registry",
  {
    id: int("id").primaryKey().autoincrement(),
    schoolId: varchar("school_id", { length: 255 }),
    schoolName: text("school_name").notNull(),
    normalizedSchoolName: text("normalized_school_name"),
    schoolType: varchar("school_type", { length: 255 }),
    sector: varchar("sector", { length: 255 }),
    municipality: varchar("municipality", { length: 255 }),
    province: varchar("province", { length: 255 }),
    barangay: varchar("barangay", { length: 255 }),
    address: text("address"),
    latitude: double("latitude"),
    longitude: double("longitude"),
    source: varchar("source", { length: 255 }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: datetime("created_at").notNull().$default(() => new Date()),
    updatedAt: datetime("updated_at").notNull().$default(() => new Date()),
    deletedAt: datetime("deleted_at"),
    deletedBy: int("deleted_by"),
  },
  (table) => ({
    nameIdx: index("school_registry_name_idx").on(table.schoolName),
    muniIdx: index("school_registry_muni_idx").on(table.municipality),
  })
);

/** Master Directory of Geocoded Barangays */
export const barangayRegistry = mysqlTable(
  "barangay_registry",
  {
    id: int("id").primaryKey().autoincrement(),
    province: varchar("province", { length: 255 }).notNull().default("Laguna"),
    municipality: varchar("municipality", { length: 255 }).notNull(),
    barangayName: varchar("barangay_name", { length: 255 }).notNull(),
    normalizedName: varchar("normalized_name", { length: 255 }).notNull().default(""),
    latitude: double("latitude"),
    longitude: double("longitude"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: datetime("created_at").notNull().$default(() => new Date()),
    updatedAt: datetime("updated_at").notNull().$default(() => new Date()),
  },
  (table) => ({
    muniIdx: index("barangay_registry_muni_idx").on(table.municipality),
    nameIdx: index("barangay_registry_name_idx").on(table.barangayName),
  })
);

export const students = mysqlTable("students", {
  id: int("id").primaryKey().autoincrement(),
  studentNumber: varchar("student_number", { length: 255 }).notNull().unique(),
  name: text("name").notNull(),
  referralCode: varchar("referral_code", { length: 255 }).notNull().unique(),
  deletedAt: datetime("deleted_at"),
  deletedBy: int("deleted_by"),
});

export const referrals = mysqlTable("referrals", {
  id: int("id").primaryKey().autoincrement(),
  referrerId: int("referrer_id").references(() => students.id),
  referredName: text("referred_name").notNull(),
  relationship: varchar("relationship", { length: 255 }).notNull(),
  contactNumber: varchar("contact_number", { length: 100 }),
  notes: text("notes"),
  status: varchar("status", { length: 100 }).notNull().default("pending"),
  createdAt: datetime("created_at").notNull().$default(() => new Date()),
  deletedAt: datetime("deleted_at"),
  deletedBy: int("deleted_by"),
});

/** Separate table for non-student / public referrals to keep student portal records clean */
export const publicReferrals = mysqlTable("public_referrals", {
  id: int("id").primaryKey().autoincrement(),
  referrerName: varchar("referrer_name", { length: 255 }).notNull(),
  referrerContact: varchar("referrer_contact", { length: 100 }),
  referredName: text("referred_name").notNull(),
  relationship: varchar("relationship", { length: 255 }).notNull(),
  contactNumber: varchar("contact_number", { length: 100 }),
  notes: text("notes"),
  status: varchar("status", { length: 100 }).notNull().default("pending"),
  createdAt: datetime("created_at").notNull().$default(() => new Date()),
  deletedAt: datetime("deleted_at"),
  deletedBy: int("deleted_by"),
});

/** Raw admissions import batches */
export const imports = mysqlTable("imports", {
  id: int("id").primaryKey().autoincrement(),
  source: varchar("source", { length: 255 }).notNull().default("api"),
  status: varchar("status", { length: 100 }).notNull().default("completed"),
  importedCount: int("imported_count").notNull().default(0),
  failedCount: int("failed_count").notNull().default(0),
  startedAt: datetime("started_at").notNull().$default(() => new Date()),
  completedAt: datetime("completed_at"),
  notes: text("notes"),
});

/** Raw student rows prior to GIS matching */
export const studentsRaw = mysqlTable("students_raw", {
  id: int("id").primaryKey().autoincrement(),
  importId: int("import_id").references(() => imports.id),
  studentNumber: varchar("student_number", { length: 255 }).notNull(),
  fullName: text("full_name").notNull(),
  course: varchar("course", { length: 255 }),
  strand: varchar("strand", { length: 255 }),
  lastSchoolName: text("last_school_name").notNull(),
  lastSchoolType: varchar("last_school_type", { length: 255 }),
  studentType: varchar("student_type", { length: 255 }),
  municipality: varchar("municipality", { length: 255 }),
  province: varchar("province", { length: 255 }),
  barangay: varchar("barangay", { length: 255 }),
  previousSchool: text("previous_school"),
  contactNumber: varchar("contact_number", { length: 100 }),
  schedule: varchar("schedule", { length: 255 }),
  iskolarNiKap: varchar("iskolar_ni_kap", { length: 255 }),
  requirements: text("requirements"),
  yearLevel: varchar("year_level", { length: 100 }),
  rawPayload: text("raw_payload"),
  syncedAt: datetime("synced_at").notNull().$default(() => new Date()),
});

/** Staging table for student imports */
export const studentImports = mysqlTable(
  "student_imports",
  {
    id: int("id").primaryKey().autoincrement(),
    studentNumber: varchar("student_number", { length: 255 }).notNull(),
    fullName: text("full_name").notNull(),
    previousSchool: text("previous_school"),
    strand: varchar("strand", { length: 255 }),
    admissionType: varchar("admission_type", { length: 255 }),
    program: varchar("program", { length: 255 }),
    scholarship: varchar("scholarship", { length: 255 }),
    municipality: varchar("municipality", { length: 255 }),
    barangay: varchar("barangay", { length: 255 }),
    importedAt: datetime("imported_at").notNull().$default(() => new Date()),
    importSource: varchar("import_source", { length: 255 }).notNull(),
    importStatus: varchar("import_status", { length: 100 }).notNull().default("Pending"),
    matchedSchoolId: int("matched_school_id").references(() => schoolRegistry.id),
    matchConfidence: int("match_confidence"),
    matchRule: varchar("match_rule", { length: 255 }),
    enrollmentStatus: varchar("enrollment_status", { length: 100 }).notNull().default("Unknown"),
  },
  (table) => ({
    statusIdx: index("student_imports_status_idx").on(table.importStatus),
    studentNoIdx: index("student_imports_student_no_idx").on(table.studentNumber),
  })
);

/** Processed GIS student records linked to feeder schools */
export const studentsProcessed = mysqlTable(
  "students_processed",
  {
    id: int("id").primaryKey().autoincrement(),
    rawId: int("raw_id").references(() => studentsRaw.id),
    studentNumber: varchar("student_number", { length: 255 }).notNull(),
    fullName: text("full_name").notNull(),
    course: varchar("course", { length: 255 }),
    strand: varchar("strand", { length: 255 }),
    admissionType: varchar("admission_type", { length: 255 }),
    lastSchoolName: text("last_school_name").notNull(),
    previousSchool: text("previous_school"),
    contactNumber: varchar("contact_number", { length: 100 }),
    schedule: varchar("schedule", { length: 255 }),
    iskolarNiKap: varchar("iskolar_ni_kap", { length: 255 }),
    requirements: text("requirements"),
    lastSchoolType: varchar("last_school_type", { length: 255 }),
    schoolRegistryId: int("school_registry_id").references(() => schoolRegistry.id),
    municipality: varchar("municipality", { length: 255 }),
    province: varchar("province", { length: 255 }),
    barangay: varchar("barangay", { length: 255 }),
    yearLevel: varchar("year_level", { length: 100 }),
    enrollmentStatus: varchar("enrollment_status", { length: 100 }).notNull().default("Active"),
    enrollmentDate: datetime("enrollment_date").notNull().$default(() => new Date()),
    importedSource: varchar("imported_source", { length: 255 }).notNull().default("API"),
    archivedAt: datetime("archived_at"),
    mappingStatus: varchar("mapping_status", { length: 100 }).notNull().default("pending"),
    syncedAt: datetime("synced_at").notNull().$default(() => new Date()),
    processedAt: datetime("processed_at").notNull().$default(() => new Date()),
  },
  (table) => ({
    schoolIdx: index("students_processed_school_idx").on(table.schoolRegistryId),
    studentNoIdx: index("students_processed_student_no_idx").on(table.studentNumber),
    munCourseIdx: index("students_processed_mun_course_idx").on(table.municipality, table.course),
    enrollmentStatusIdx: index("students_processed_enrollment_status_idx").on(table.enrollmentStatus),
    mappingStatusIdx: index("students_processed_mapping_status_idx").on(table.mappingStatus),
    scholarIdx: index("students_processed_scholar_idx").on(table.iskolarNiKap),
    barangayIdx: index("students_processed_barangay_idx").on(table.barangay),
  })
);

/** Alternate normalized school names for matching engine */
export const schoolAliases = mysqlTable("school_aliases", {
  id: int("id").primaryKey().autoincrement(),
  schoolRegistryId: int("school_registry_id").references(() => schoolRegistry.id).notNull(),
  aliasName: text("alias_name").notNull(),
  normalizedAlias: varchar("normalized_alias", { length: 255 }).notNull().unique(),
  confidence: int("confidence").notNull().default(100),
  source: varchar("source", { length: 100 }).notNull().default("Manual"),
  createdAt: datetime("created_at").notNull().$default(() => new Date()),
});

/** Mapping audit logs */
export const mappingLogs = mysqlTable("mapping_logs", {
  id: int("id").primaryKey().autoincrement(),
  importId: int("import_id").references(() => imports.id),
  studentProcessedId: int("student_processed_id").references(() => studentsProcessed.id),
  schoolRegistryId: int("school_registry_id").references(() => schoolRegistry.id),
  action: varchar("action", { length: 100 }).notNull(),
  matchedRule: varchar("matched_rule", { length: 255 }),
  notes: text("notes"),
  createdAt: datetime("created_at").notNull().$default(() => new Date()),
});

/** College Departments */
export const departments = mysqlTable("departments", {
  id: int("id").primaryKey().autoincrement(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  name: text("name").notNull(),
  color: varchar("color", { length: 50 }).notNull(),
  targetValue: int("target_value").notNull().default(0),
  updatedAt: datetime("updated_at").notNull().$default(() => new Date()),
});

/** Academic Programs */
export const programs = mysqlTable("programs", {
  id: int("id").primaryKey().autoincrement(),
  departmentId: int("department_id").references(() => departments.id).notNull(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  name: text("name").notNull(),
  track: varchar("track", { length: 255 }),
  level: varchar("level", { length: 100 }).notNull().default("Bachelor"),
  color: varchar("color", { length: 50 }).notNull(),
  targetValue: int("target_value").notNull().default(0),
  updatedAt: datetime("updated_at").notNull().$default(() => new Date()),
});

/** Match History */
export const schoolMatchHistory = mysqlTable("school_match_history", {
  id: int("id").primaryKey().autoincrement(),
  importedName: text("imported_name").notNull(),
  officialSchoolId: int("official_school_id").references(() => schoolRegistry.id),
  resolvedBy: varchar("resolved_by", { length: 100 }).notNull().default("Admin"),
  occurrences: int("occurrences").notNull().default(1),
  createdAt: datetime("created_at").notNull().$default(() => new Date()),
  updatedAt: datetime("updated_at").notNull().$default(() => new Date()),
});

/** System Settings */
export const systemSettings = mysqlTable("system_settings", {
  key: varchar("key", { length: 255 }).primaryKey(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: datetime("updated_at").notNull().$default(() => new Date()),
});

/** Users & Admin Accounts */
export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  role: varchar("role", { length: 100 }).notNull().default("user"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: datetime("created_at").notNull().$default(() => new Date()),
});

/** Data Privacy Audit Logs */
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").primaryKey().autoincrement(),
  actor: varchar("actor", { length: 255 }).notNull().default("System"),
  role: varchar("role", { length: 100 }).notNull().default("User"),
  action: varchar("action", { length: 100 }).notNull(),
  targetResource: varchar("target_resource", { length: 255 }).notNull(),
  details: text("details"),
  ipAddress: varchar("ip_address", { length: 100 }),
  status: varchar("status", { length: 100 }).notNull().default("SUCCESS"),
  timestamp: datetime("timestamp").notNull().$default(() => new Date()),
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


/** Audit logs for DPA compliance (tracking PII access) */
export const dataAccessLogs = mysqlTable('data_access_logs', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull(),
  action: text('action').notNull(),
  targetTable: text('target_table').notNull(),
  recordId: text('record_id'),
  ipAddress: text('ip_address'),
  accessedAt: datetime('accessed_at', { mode: 'date' }).notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertPublicReferralSchema = createInsertSchema(publicReferrals, {
  referrerName: z.string().trim().min(2, "Your name is required").max(255),
  referrerContact: z.string().trim().max(100).nullable().optional(),
  referredName: z.string().trim().min(2, "Referred student name is required").max(255),
  relationship: z.string().trim().min(1, "Relationship is required").max(255),
  contactNumber: z.string().trim().max(100).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
}).omit({ id: true, createdAt: true, deletedAt: true, deletedBy: true, status: true });

export type InsertPublicReferral = z.infer<typeof insertPublicReferralSchema>;
export type PublicReferral = typeof publicReferrals.$inferSelect;

