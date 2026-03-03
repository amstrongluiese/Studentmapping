import { db } from "./db";
import { schools, referrals, type InsertSchool, type School, type InsertReferral, type Referral } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getSchools(): Promise<School[]>;
  getSchool(id: number): Promise<School | undefined>;
  createSchool(school: InsertSchool): Promise<School>;
  updateSchool(id: number, updates: Partial<InsertSchool>): Promise<School>;
  deleteSchool(id: number): Promise<void>;

  getReferrals(): Promise<Referral[]>;
  createReferral(referral: InsertReferral): Promise<Referral>;
}

export class DatabaseStorage implements IStorage {
  async getSchools(): Promise<School[]> {
    return await db.select().from(schools);
  }

  async getSchool(id: number): Promise<School | undefined> {
    const [school] = await db.select().from(schools).where(eq(schools.id, id));
    return school;
  }

  async createSchool(school: InsertSchool): Promise<School> {
    const [newSchool] = await db.insert(schools).values(school).returning();
    return newSchool;
  }

  async updateSchool(id: number, updates: Partial<InsertSchool>): Promise<School> {
    const [updatedSchool] = await db.update(schools)
      .set(updates)
      .where(eq(schools.id, id))
      .returning();
    return updatedSchool;
  }

  async deleteSchool(id: number): Promise<void> {
    await db.delete(schools).where(eq(schools.id, id));
  }

  async getReferrals(): Promise<Referral[]> {
    return await db.select().from(referrals);
  }

  async createReferral(referral: InsertReferral): Promise<Referral> {
    const [newReferral] = await db.insert(referrals).values(referral).returning();
    return newReferral;
  }
}

export const storage = new DatabaseStorage();
