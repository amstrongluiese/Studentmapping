import { getDb } from "./db";
import { schools, referrals, students, type InsertSchool, type School, type InsertReferral, type Referral, type InsertStudent, type Student } from "@shared/schema";
import { hasCoordinates, normalizeSchoolName } from "@shared/schoolRegistry";
import { eq } from "drizzle-orm";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export interface SchoolImportResult {
  created: number;
  updated: number;
  skipped: number;
  schools: School[];
  issues: string[];
}

export interface IStorage {
  getSchools(): Promise<School[]>;
  getSchool(id: number): Promise<School | undefined>;
  createSchool(school: InsertSchool): Promise<School>;
  updateSchool(id: number, updates: Partial<InsertSchool>): Promise<School>;
  deleteSchool(id: number): Promise<void>;
  importSchools(schools: InsertSchool[]): Promise<SchoolImportResult>;

  getStudents(): Promise<Student[]>;
  getStudentByNumber(studentNumber: string): Promise<Student | undefined>;
  getStudentByCode(referralCode: string): Promise<Student | undefined>;

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
  batchDeleteSchools(ids: number[]): Promise<{ deletedCount: number; skippedCount: number; skippedIds: number[] }>;
  batchDeleteImports(ids: number[]): Promise<{ deletedCount: number; skippedCount: number }>;
}

export class DatabaseStorage implements IStorage {
  async getSchools(): Promise<School[]> {
    return await getDb().select().from(schools);
  }

  async getSchool(id: number): Promise<School | undefined> {
    const [school] = await getDb().select().from(schools).where(eq(schools.id, id));
    return school;
  }

  async createSchool(school: InsertSchool): Promise<School> {
    const [newSchool] = await getDb().insert(schools).values(this.prepareSchool(school)).returning();
    await this.persistLocalRegistry();
    return newSchool;
  }

  async updateSchool(id: number, updates: Partial<InsertSchool>): Promise<School> {
    const [updatedSchool] = await getDb().update(schools)
      .set(this.prepareSchool(updates))
      .where(eq(schools.id, id))
      .returning();
    await this.persistLocalRegistry();
    return updatedSchool;
  }

  async deleteSchool(id: number): Promise<void> {
    await getDb().delete(schools).where(eq(schools.id, id));
    await this.persistLocalRegistry();
  }

  async importSchools(records: InsertSchool[]): Promise<SchoolImportResult> {
    const existing = await this.getSchools();
    const importedSchools: School[] = [];
    const issues: string[] = [];
    let created = 0;
    let updated = 0;
    let skipped = 0;

    const knownByNormalized = new Map<string, School>();
    for (const school of existing) {
      const normalized = normalizeSchoolName(school.normalizedName || school.name);
      knownByNormalized.set(normalized, school);
    }

    const seenInBatch = new Set<string>();

    for (const record of records) {
      const normalized = normalizeSchoolName(record.normalizedName || record.name);

      if (!normalized) {
        skipped += 1;
        issues.push("Skipped a row with no school name.");
        continue;
      }

      if (seenInBatch.has(normalized)) {
        skipped += 1;
        issues.push(`${record.name} was skipped as a duplicate in the uploaded file.`);
        continue;
      }

      seenInBatch.add(normalized);
      const prepared = this.prepareSchool({
        ...record,
        normalizedName: normalized,
      }) as InsertSchool;

      const match = knownByNormalized.get(normalized);
      if (match) {
        const updatedSchool = await this.updateSchool(match.id, prepared);
        knownByNormalized.set(normalized, updatedSchool);
        importedSchools.push(updatedSchool);
        updated += 1;
      } else {
        const newSchool = await this.createSchool(prepared);
        knownByNormalized.set(normalized, newSchool);
        importedSchools.push(newSchool);
        created += 1;
      }
    }

    await this.persistLocalRegistry();

    return {
      created,
      updated,
      skipped,
      schools: importedSchools,
      issues,
    };
  }

  private prepareSchool<T extends Partial<InsertSchool>>(school: T): T {
    const normalizedName = school.name
      ? normalizeSchoolName(school.normalizedName || school.name)
      : school.normalizedName;
    const prepared: Partial<InsertSchool> = {
      ...school,
      ...(normalizedName ? { normalizedName } : {}),
    };

    if ("municipality" in school) prepared.municipality = school.municipality?.trim() || "Laguna";
    if ("province" in school) prepared.province = school.province?.trim() || "Laguna";
    if ("institutionType" in school) prepared.institutionType = school.institutionType?.trim() || "Feeder Institution";
    if ("source" in school) prepared.source = school.source?.trim() || "Manual Entry";
    if ("status" in school || "lat" in school || "lng" in school) {
      prepared.status = school.status || (school.lat != null && school.lng != null ? "Needs Review" : "Missing Coordinates");
    }

    return prepared as T;
  }

  private async persistLocalRegistry() {
    const registryPath = path.join(process.cwd(), "server", "data", "feeder-school-registry.json");
    const records = await this.getSchools();
    const dataset = records
      .filter(hasCoordinates)
      .map((school) => ({
        id: school.id,
        name: school.name,
        normalizedName: normalizeSchoolName(school.normalizedName || school.name),
        latitude: school.lat,
        longitude: school.lng,
        municipality: school.municipality,
        province: school.province,
        schoolType: school.institutionType,
        verified: school.verified,
        status: school.status,
        studentCount: school.studentCount,
        source: school.source,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    await mkdir(path.dirname(registryPath), { recursive: true });
    await writeFile(registryPath, `${JSON.stringify({ updatedAt: new Date().toISOString(), schools: dataset }, null, 2)}\n`, "utf8");
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

  async batchDeleteSchools(ids: number[]): Promise<{ deletedCount: number; skippedCount: number; skippedIds: number[] }> {
    if (ids.length === 0) return { deletedCount: 0, skippedCount: 0, skippedIds: [] };
    
    const { inArray } = await import("drizzle-orm");
    const { schools, studentsProcessed, schoolAliases, mappingLogs } = await import("@shared/schema");
    
    const usedSchoolsRaw = await getDb()
      .select({ schoolId: studentsProcessed.schoolId })
      .from(studentsProcessed)
      .where(inArray(studentsProcessed.schoolId, ids));
      
    const usedIds = new Set(usedSchoolsRaw.map(r => r.schoolId).filter(Boolean) as number[]);
    const safeToDelete = ids.filter(id => !usedIds.has(id));
    
    if (safeToDelete.length > 0) {
      await getDb().delete(mappingLogs).where(inArray(mappingLogs.schoolId, safeToDelete));
      await getDb().delete(schoolAliases).where(inArray(schoolAliases.schoolId, safeToDelete));
      await getDb().delete(schools).where(inArray(schools.id, safeToDelete));
      await this.persistLocalRegistry();
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
