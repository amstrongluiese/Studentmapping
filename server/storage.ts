import { db } from "./db";
import { schools, referrals, students, type InsertSchool, type School, type InsertReferral, type Referral, type InsertStudent, type Student } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getSchools(): Promise<School[]>;
  getSchool(id: number): Promise<School | undefined>;
  createSchool(school: InsertSchool): Promise<School>;
  bulkCreateSchools(schoolsList: InsertSchool[]): Promise<School[]>;
  updateSchool(id: number, updates: Partial<InsertSchool>): Promise<School>;
  deleteSchool(id: number): Promise<void>;

  getStudents(): Promise<Student[]>;
  getStudentByNumber(studentNumber: string): Promise<Student | undefined>;
  getStudentByCode(referralCode: string): Promise<Student | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;

  getReferrals(): Promise<Referral[]>;
  getReferralsByStudent(studentId: number): Promise<Referral[]>;
  createReferral(referral: InsertReferral): Promise<Referral>;
  updateReferral(id: number, updates: Partial<InsertReferral>): Promise<Referral>;
  deleteReferral(id: number): Promise<void>;
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

  async bulkCreateSchools(schoolsList: InsertSchool[]): Promise<School[]> {
    if (schoolsList.length === 0) return [];
    return await db.insert(schools).values(schoolsList).returning();
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

  async getStudents(): Promise<Student[]> {
    return await db.select().from(students);
  }

  async getStudentByNumber(studentNumber: string): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.studentNumber, studentNumber));
    return student;
  }

  async getStudentByCode(referralCode: string): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.referralCode, referralCode));
    return student;
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    const [newStudent] = await db.insert(students).values(student).returning();
    return newStudent;
  }

  async getReferrals(): Promise<Referral[]> {
    return await db.select().from(referrals);
  }

  async getReferralsByStudent(studentId: number): Promise<Referral[]> {
    return await db.select().from(referrals).where(eq(referrals.referrerId, studentId));
  }

  async createReferral(referral: InsertReferral): Promise<Referral> {
    const [newReferral] = await db.insert(referrals).values(referral).returning();
    return newReferral;
  }

  async updateReferral(id: number, updates: Partial<InsertReferral>): Promise<Referral> {
    const [updatedReferral] = await db.update(referrals)
      .set(updates)
      .where(eq(referrals.id, id))
      .returning();
    return updatedReferral;
  }

  async deleteReferral(id: number): Promise<void> {
    await db.delete(referrals).where(eq(referrals.id, id));
  }
}

export const storage = new DatabaseStorage();
