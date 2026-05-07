import { pgTable, text, serial, integer, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const schools = pgTable("schools", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  municipality: text("municipality"),
  institutionType: text("institution_type"),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  studentCount: integer("student_count").notNull().default(0),
  geoStatus: text("geo_status").default("verified"),
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
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Admissions table — stores incoming student data from external API/upload
export const admissions = pgTable("admissions", {
  id: serial("id").primaryKey(),
  studentName: text("student_name").notNull(),
  studentNumber: text("student_number"),
  lastSchoolAttended: text("last_school_attended"),
  seniorHighSchool: text("senior_high_school"),
  collegeLastAttended: text("college_last_attended"),
  studentType: text("student_type"), // "New Student" | "Transferee"
  matchedSchoolId: integer("matched_school_id").references(() => schools.id),
  matchedSchoolName: text("matched_school_name"),
  matchConfidence: doublePrecision("match_confidence"),
  syncedAt: timestamp("synced_at").defaultNow(),
});

export const insertSchoolSchema = createInsertSchema(schools).omit({ id: true });
export const insertStudentSchema = createInsertSchema(students).omit({ id: true });
export const insertReferralSchema = createInsertSchema(referrals).omit({ id: true, createdAt: true });
export const insertAdmissionSchema = createInsertSchema(admissions).omit({ id: true, syncedAt: true });

export type InsertSchool = z.infer<typeof insertSchoolSchema>;
export type School = typeof schools.$inferSelect;

export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof students.$inferSelect;

export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referrals.$inferSelect;

export type InsertAdmission = z.infer<typeof insertAdmissionSchema>;
export type Admission = typeof admissions.$inferSelect;
