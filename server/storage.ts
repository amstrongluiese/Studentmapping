import { getDb } from "./db";
import { schoolRegistry, referrals, students, type InsertSchoolRegistry, type SchoolRegistry, type InsertReferral, type Referral, type InsertStudent, type Student } from "@shared/schema";
import { hasCoordinates, normalizeSchoolName } from "@shared/schoolRegistry";
import { eq } from "drizzle-orm";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export interface SchoolImportResult {
  created: number;
  updated: number;
  skipped: number;
  schools: SchoolRegistry[];
  issues: string[];
}

export interface IStorage {
  listSchoolRegistry(): Promise<SchoolRegistry[]>;
  getSchoolRegistry(id: number): Promise<SchoolRegistry | undefined>;
  createSchoolRegistry(school: InsertSchoolRegistry): Promise<SchoolRegistry>;
  updateSchoolRegistry(id: number, updates: Partial<InsertSchoolRegistry>): Promise<SchoolRegistry>;
  deleteSchoolRegistry(id: number): Promise<void>;
  importSchools(schools: InsertSchoolRegistry[]): Promise<SchoolImportResult>;
  mergeSchoolRegistry(duplicateId: number, targetId: number): Promise<void>;

  getStudents(): Promise<Student[]>;
  getStudentByNumber(studentNumber: string): Promise<Student | undefined>;
  getStudentByCode(referralCode: string): Promise<Student | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;

  getReferrals(): Promise<Referral[]>;
  getReferralsByStudent(studentId: number): Promise<Referral[]>;
  createReferral(referral: InsertReferral): Promise<Referral>;
  updateReferral(id: number, updates: Partial<InsertReferral>): Promise<Referral>;
  deleteReferral(id: number): Promise<void>;

  batchDeleteProcessedStudents(ids: number[]): Promise<{ deletedCount: number; skippedCount: number }>;
  batchDeleteSchoolRegistry(ids: number[]): Promise<{ deletedCount: number; skippedCount: number; skippedIds: number[] }>;
  batchDeleteImports(ids: number[]): Promise<{ deletedCount: number; skippedCount: number }>;
}

export class DatabaseStorage implements IStorage {
  async listSchoolRegistry(): Promise<SchoolRegistry[]> {
    return await getDb().select().from(schoolRegistry);
  }

  async getSchoolRegistry(id: number): Promise<SchoolRegistry | undefined> {
    const [school] = await getDb().select().from(schoolRegistry).where(eq(schoolRegistry.id, id));
    return school;
  }

  async createSchoolRegistry(school: InsertSchoolRegistry): Promise<SchoolRegistry> {
    const [newSchool] = await getDb().insert(schoolRegistry).values(this.prepareSchool(school)).returning();
    return newSchool;
  }

  async updateSchoolRegistry(id: number, updates: Partial<InsertSchoolRegistry>): Promise<SchoolRegistry> {
    const [updatedSchool] = await getDb().update(schoolRegistry)
      .set(this.prepareSchool(updates))
      .where(eq(schoolRegistry.id, id))
      .returning();
    return updatedSchool;
  }

  async deleteSchoolRegistry(id: number): Promise<void> {
    const { studentsProcessed, studentImports, mappingLogs, schoolAliases, schoolMatchHistory } = await import("@shared/schema");

    await getDb().update(studentsProcessed)
      .set({ schoolRegistryId: null })
      .where(eq(studentsProcessed.schoolRegistryId, id));

    await getDb().update(studentImports)
      .set({ matchedSchoolId: null })
      .where(eq(studentImports.matchedSchoolId, id));

    await getDb().update(mappingLogs)
      .set({ schoolRegistryId: null })
      .where(eq(mappingLogs.schoolRegistryId, id));

    await getDb().update(schoolMatchHistory)
      .set({ officialSchoolId: null })
      .where(eq(schoolMatchHistory.officialSchoolId, id));

    await getDb().delete(schoolAliases)
      .where(eq(schoolAliases.schoolRegistryId, id));

    await getDb().delete(schoolRegistry).where(eq(schoolRegistry.id, id));
  }

  async mergeSchoolRegistry(duplicateId: number, targetId: number): Promise<void> {
    if (duplicateId === targetId) {
      throw new Error("Cannot merge a school into itself.");
    }
    const { studentsProcessed, studentImports, mappingLogs, schoolAliases, schoolMatchHistory } = await import("@shared/schema");
    
    // 1. Reassign students processed
    await getDb().update(studentsProcessed)
      .set({ schoolRegistryId: targetId })
      .where(eq(studentsProcessed.schoolRegistryId, duplicateId));

    // 2. Reassign student imports
    await getDb().update(studentImports)
      .set({ matchedSchoolId: targetId })
      .where(eq(studentImports.matchedSchoolId, duplicateId));

    // 3. Reassign mapping logs
    await getDb().update(mappingLogs)
      .set({ schoolRegistryId: targetId })
      .where(eq(mappingLogs.schoolRegistryId, duplicateId));

    // 4. Reassign school match history
    await getDb().update(schoolMatchHistory)
      .set({ officialSchoolId: targetId })
      .where(eq(schoolMatchHistory.officialSchoolId, duplicateId));

    // 5. Delete duplicate's aliases (to avoid unique constraint errors if original already has them)
    await getDb().delete(schoolAliases).where(eq(schoolAliases.schoolRegistryId, duplicateId));

    // 6. Finally, delete the duplicate school
    await getDb().delete(schoolRegistry).where(eq(schoolRegistry.id, duplicateId));
  }

  async importSchools(records: InsertSchoolRegistry[]): Promise<SchoolImportResult> {
    const existing = await this.listSchoolRegistry();
    const importedSchools: SchoolRegistry[] = [];
    const issues: string[] = [];
    let created = 0;
    let updated = 0;
    let skipped = 0;

    const knownByNormalized = new Map<string, SchoolRegistry>();
    for (const school of existing) {
      const normalized = normalizeSchoolName(school.normalizedSchoolName || school.schoolName);
      knownByNormalized.set(normalized, school);
    }

    const seenInBatch = new Set<string>();

    for (const record of records) {
      const normalized = normalizeSchoolName(record.normalizedSchoolName || record.schoolName);

      if (!normalized) {
        skipped += 1;
        issues.push("Skipped a row with no school name.");
        continue;
      }

      if (seenInBatch.has(normalized)) {
        skipped += 1;
        issues.push(`${record.schoolName} was skipped as a duplicate in the uploaded file.`);
        continue;
      }

      seenInBatch.add(normalized);
      const prepared = this.prepareSchool({
        ...record,
        normalizedSchoolName: normalized,
      }) as InsertSchoolRegistry;

      const match = knownByNormalized.get(normalized);
      if (match) {
        const updatedSchool = await this.updateSchoolRegistry(match.id, prepared);
        knownByNormalized.set(normalized, updatedSchool);
        importedSchools.push(updatedSchool);
        updated += 1;
      } else {
        const newSchool = await this.createSchoolRegistry(prepared);
        knownByNormalized.set(normalized, newSchool);
        importedSchools.push(newSchool);
        created += 1;
      }
    }

    return {
      created,
      updated,
      skipped,
      schools: importedSchools,
      issues,
    };
  }

  private prepareSchool<T extends Partial<InsertSchoolRegistry>>(school: T): T {
    const normalizedName = school.schoolName
      ? normalizeSchoolName(school.normalizedSchoolName || school.schoolName)
      : school.normalizedSchoolName;
    const prepared: Partial<InsertSchoolRegistry> = {
      ...school,
      ...(normalizedName ? { normalizedSchoolName: normalizedName } : {}),
    };

    if ("municipality" in school) prepared.municipality = school.municipality?.trim() || "Laguna";
    if ("province" in school) prepared.province = school.province?.trim() || "Laguna";
    if ("source" in school) prepared.source = school.source?.trim() || "Manual Entry";

    return prepared as T;
  }

  async getStudents(): Promise<Student[]> {
    return await getDb().select().from(students);
  }

  async getStudentByNumber(studentNumber: string): Promise<Student | undefined> {
    const [student] = await getDb().select().from(students).where(eq(students.studentNumber, studentNumber));
    return student;
  }

  async getStudentByCode(referralCode: string): Promise<Student | undefined> {
    const [student] = await getDb().select().from(students).where(eq(students.referralCode, referralCode));
    return student;
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    const [newStudent] = await getDb().insert(students).values(student).returning();
    return newStudent;
  }

  async getReferrals(): Promise<Referral[]> {
    return await getDb().select().from(referrals);
  }

  async getReferralsByStudent(studentId: number): Promise<Referral[]> {
    return await getDb().select().from(referrals).where(eq(referrals.referrerId, studentId));
  }

  async createReferral(referral: InsertReferral): Promise<Referral> {
    const [newReferral] = await getDb().insert(referrals).values(referral).returning();
    return newReferral;
  }

  async updateReferral(id: number, updates: Partial<InsertReferral>): Promise<Referral> {
    const [updatedReferral] = await getDb().update(referrals)
      .set(updates)
      .where(eq(referrals.id, id))
      .returning();
    return updatedReferral;
  }

  async deleteReferral(id: number): Promise<void> {
    await getDb().delete(referrals).where(eq(referrals.id, id));
  }

  async batchDeleteProcessedStudents(ids: number[]): Promise<{ deletedCount: number; skippedCount: number }> {
    if (ids.length === 0) return { deletedCount: 0, skippedCount: 0 };
    
    const { inArray } = await import("drizzle-orm");
    const { mappingLogs, studentsProcessed } = await import("@shared/schema");
    
    await getDb().delete(mappingLogs).where(inArray(mappingLogs.studentProcessedId, ids));
    const result = await getDb().delete(studentsProcessed).where(inArray(studentsProcessed.id, ids));
    
    return { deletedCount: ids.length, skippedCount: 0 };
  }

  async batchDeleteSchoolRegistry(ids: number[]): Promise<{ deletedCount: number; skippedCount: number; skippedIds: number[] }> {
    if (ids.length === 0) return { deletedCount: 0, skippedCount: 0, skippedIds: [] };
    
    const { inArray } = await import("drizzle-orm");
    const { schoolRegistry, studentsProcessed, schoolAliases, mappingLogs } = await import("@shared/schema");
    
    const usedSchoolsRaw = await getDb()
      .select({ schoolId: studentsProcessed.schoolRegistryId })
      .from(studentsProcessed)
      .where(inArray(studentsProcessed.schoolRegistryId, ids));
      
    const usedIds = new Set(usedSchoolsRaw.map(r => r.schoolId).filter(Boolean) as number[]);
    const safeToDelete = ids.filter(id => !usedIds.has(id));
    
    if (safeToDelete.length > 0) {
      await getDb().delete(mappingLogs).where(inArray(mappingLogs.schoolRegistryId, safeToDelete));
      await getDb().delete(schoolAliases).where(inArray(schoolAliases.schoolRegistryId, safeToDelete));
      await getDb().delete(schoolRegistry).where(inArray(schoolRegistry.id, safeToDelete));
    }
    
    return { 
      deletedCount: safeToDelete.length, 
      skippedCount: usedIds.size,
      skippedIds: Array.from(usedIds)
    };
  }

  async batchDeleteImports(ids: number[]): Promise<{ deletedCount: number; skippedCount: number }> {
    if (ids.length === 0) return { deletedCount: 0, skippedCount: 0 };
    
    const { inArray } = await import("drizzle-orm");
    const { imports, studentsRaw, studentsProcessed, mappingLogs } = await import("@shared/schema");
    
    await getDb().delete(mappingLogs).where(inArray(mappingLogs.importId, ids));
    
    const rawIdsResult = await getDb()
      .select({ id: studentsRaw.id })
      .from(studentsRaw)
      .where(inArray(studentsRaw.importId, ids));
      
    const rawIds = rawIdsResult.map(r => r.id);
    if (rawIds.length > 0) {
      await getDb().delete(studentsProcessed).where(inArray(studentsProcessed.rawId, rawIds));
    }
    
    await getDb().delete(studentsRaw).where(inArray(studentsRaw.importId, ids));
    await getDb().delete(imports).where(inArray(imports.id, ids));
    
    return { deletedCount: ids.length, skippedCount: 0 };
  }
}

export const storage = new DatabaseStorage();
