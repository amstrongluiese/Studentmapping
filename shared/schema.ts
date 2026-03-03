import { pgTable, text, serial, integer, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const schools = pgTable("schools", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  studentCount: integer("student_count").notNull().default(0),
});

export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerName: text("referrer_name").notNull(),
  referredName: text("referred_name").notNull(),
  relationship: text("relationship").notNull(),
  contactNumber: text("contact_number"),
  status: text("status").notNull().default("pending"), // pending, enrolled
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSchoolSchema = createInsertSchema(schools).omit({ id: true });
export const insertReferralSchema = createInsertSchema(referrals).omit({ id: true, createdAt: true });

export type InsertSchool = z.infer<typeof insertSchoolSchema>;
export type School = typeof schools.$inferSelect;

export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referrals.$inferSelect;
