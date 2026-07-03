import { getDb } from "./db";
import { SchoolMatchingEngine } from "./schoolMatcher";
import { storage } from "./storage";
import {
  imports,
  mappingLogs,
  schoolAliases,
  schoolRegistry,
  studentsProcessed,
  studentsRaw,
  type SchoolRegistry,
} from "@shared/schema";
import {
  classifyAdmissionFromSchoolType,
  inferLastSchoolTypeFromName,
  isEligibleForGisMapping,
} from "@shared/gisClassification";
import { getSchoolStatus, hasCoordinates, normalizeSchoolName, type SchoolStatus } from "@shared/schoolRegistry";
import { normalizeStudentProgramValue } from "@shared/programRecognition";
import { desc, eq, ilike, inArray, or } from "drizzle-orm";
import { type InsertSchoolRegistry } from '@shared/schema';

export interface StudentSyncRecord {
  studentNumber: string;
  fullName: string;
  course?: string | null;
  strand?: string | null;
  lastSchoolName: string;
  lastSchoolType?: string | null;
  studentType?: string | null;
  municipality?: string | null;
  province?: string | null;
  yearLevel?: string | null;
  contactNumber?: string | null;
  schedule?: string | null;
  iskolarNiKap?: string | null;
  requirements?: string | null;
  enrollmentStatus?: string | null;
  enrollmentDate?: string | null;
  rawPayload?: Record<string, unknown>;
}

export interface StudentSyncResult {
  importId: number;
  processed: number;
  skipped: number;
  failed: number;
  schoolsCreated: number;
  schoolsGeocoded: number;
}

export interface MappingQueueItem {
  kind: "school" | "student";
  id: number;
  title: string;
  subtitle: string;
  issues: string[];
  schoolRegistryId?: number;
}

export interface VerifyMappingInput {
  schoolRegistryId: number;
  isActive?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  schoolName?: string;
  municipality?: string;
  createAlias?: string;
}

export const ACTIVE_GIS_STUDENT_STATUSES = ["Active", "Enrolled"];

function normalizeEnrollmentStatus(value?: string | null) {
  const normalized = (value || "").trim().toLowerCase();
  if (normalized === "enrolled") return "Enrolled";
  if (normalized === "pending") return "Pending";
  if (normalized === "dropped") return "Dropped";
  if (normalized === "transferred") return "Transferred";
  if (normalized === "graduated") return "Graduated";
  if (normalized === "archived") return "Archived";
  return "Active";
}

function normalizeImportedSource(source: string) {
  const normalized = source.trim().toLowerCase();
  if (normalized.includes("sheet")) return "Google Sheets";
  if (normalized.includes("upload") || normalized.includes("csv") || normalized.includes("excel")) return "Manual Upload";
  return "API";
}

function parseEnrollmentDate(value?: string | null) {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function isStudentActiveForGis(status?: string | null) {
  return ACTIVE_GIS_STUDENT_STATUSES.includes(normalizeEnrollmentStatus(status));
}

export async function recomputeSchoolStudentCounts() {
  // No-op
}

async function logMapping(
  action: string,
  message: string,
  opts?: { importId?: number; schoolRegistryId?: number; studentProcessedId?: number },
) {
  await getDb().insert(mappingLogs).values({
    action,
    message,
    importId: opts?.importId ?? null,
    schoolRegistryId: opts?.schoolRegistryId ?? null,
    studentProcessedId: opts?.studentProcessedId ?? null,
  });
}

async function findSchoolRegistryByNormalized(normalized: string): Promise<SchoolRegistry | undefined> {
  const all = await storage.listSchoolRegistry();
  return all.find((s) => normalizeSchoolName(s.normalizedSchoolName || s.schoolName) === normalized);
}

async function findSchoolRegistryByAlias(normalized: string): Promise<SchoolRegistry | undefined> {
  try {
    const [alias] = await getDb()
      .select()
      .from(schoolAliases)
      .where(eq(schoolAliases.normalizedAlias, normalized))
      .limit(1);

    if (!alias) return undefined;
    return storage.getSchoolRegistry(alias.schoolRegistryId);
  } catch (error) {
    console.warn("[gis] school_aliases lookup skipped:", error instanceof Error ? error.message : error);
    return undefined;
  }
}

export async function resolveOrGeocodeSchoolRegistry(
  schoolName: string,
  municipality?: string,
  opts?: { allowNominatim?: boolean; importId?: number },
): Promise<{ school: SchoolRegistry; source: "registry" | "alias" | "master-directory" | "created" }> {
  const registryMunicipality = municipality?.trim() || "Laguna";
  const normalized = normalizeSchoolName(schoolName);
  if (!normalized) {
    throw new Error("School name is required for geolocation.");
  }

  const existing = await findSchoolRegistryByNormalized(normalized);
  if (existing && hasCoordinates(existing)) {
    return { school: existing, source: "registry" };
  }

  const viaAlias = await findSchoolRegistryByAlias(normalized);
  if (viaAlias && hasCoordinates(viaAlias)) {
    return { school: viaAlias, source: "alias" };
  }

  const base = existing || viaAlias;

  const allSchools = await storage.listSchoolRegistry();
  const matcher = new SchoolMatchingEngine(allSchools, []);
  const matchResult = matcher.match(schoolName);
  const masterMatch = matchResult.status === "matched" ? matchResult.school : null;
  
  if (masterMatch && masterMatch.latitude && masterMatch.longitude) {
    if (base) {
      const updated = await storage.updateSchoolRegistry(base.id, {
        latitude: masterMatch.latitude,
        longitude: masterMatch.longitude,
        source: "Master Directory",
      });
      await logMapping("geocode", `Matched ${schoolName} to Master Directory`, {
        importId: opts?.importId,
        schoolRegistryId: updated.id,
      });
      return { school: updated, source: "master-directory" };
    }

    const created = await storage.createSchoolRegistry({
      schoolName: masterMatch.schoolName,
      normalizedSchoolName: normalizeSchoolName(masterMatch.schoolName),
      municipality: masterMatch.municipality || registryMunicipality,
      province: masterMatch.province || "Laguna",
      schoolType: masterMatch.schoolType || "Feeder Institution",
      latitude: masterMatch.latitude,
      longitude: masterMatch.longitude,
      isActive: true,
      source: "Master Directory",
    });
    
    if (normalized !== created.normalizedSchoolName) {
      try {
        await getDb().insert(schoolAliases).values({ aliasName: schoolName, normalizedAlias: normalized, schoolRegistryId: created.id });
      } catch {
        // Ignore if alias already exists
      }
    }

    await logMapping("geocode", `Created and matched ${schoolName} via Master Directory`, {
      importId: opts?.importId,
      schoolRegistryId: created.id,
    });
    return { school: created, source: "master-directory" };
  }

  if (base) return { school: base, source: "registry" };
  
  const created = await storage.createSchoolRegistry({
    schoolName: schoolName.trim(),
    normalizedSchoolName: normalized,
    municipality: registryMunicipality,
    province: "Laguna",
    schoolType: inferLastSchoolTypeFromName(schoolName) || "Feeder Institution",
    latitude: null,
    longitude: null,
    isActive: false,
    source: "GIS Pipeline",
  });
  await logMapping("geocode_miss", `No master directory match for ${schoolName}`, {
    importId: opts?.importId,
    schoolRegistryId: created.id,
  });
  return { school: created, source: "created" };
}

export async function syncStudents(
  records: StudentSyncRecord[],
  source = "api",
): Promise<StudentSyncResult> {
  const [importRow] = await getDb()
    .insert(imports)
    .values({ source, importedCount: 0, failedCount: 0 })
    .returning();

  let processed = 0;
  let skipped = 0;
  let failed = 0;
  let schoolsCreated = 0;
  let schoolsGeocoded = 0;

  for (const record of records) {
    try {
      if (!isEligibleForGisMapping(record.studentType)) {
        skipped += 1;
        continue;
      }

      const lastSchoolName = record.lastSchoolName?.trim();
      if (!lastSchoolName) {
        skipped += 1;
        continue;
      }

      const municipality = record.municipality?.trim() || "Laguna";
      const province = record.province?.trim() || "Laguna";
      const enrollmentStatus = normalizeEnrollmentStatus(record.enrollmentStatus);
      const enrollmentDate = parseEnrollmentDate(record.enrollmentDate);
      const lastSchoolType =
        record.lastSchoolType?.trim() ||
        inferLastSchoolTypeFromName(lastSchoolName) ||
        null;

      const admissionType = classifyAdmissionFromSchoolType(lastSchoolType);

      const [raw] = await getDb()
        .insert(studentsRaw)
        .values({
          importId: importRow.id,
          studentNumber: record.studentNumber.trim(),
          fullName: record.fullName.trim(),
          course: record.course?.trim() || null,
          strand: record.strand?.trim() || null,
          lastSchoolName,
          lastSchoolType,
          studentType: record.studentType?.trim() || null,
          municipality,
          province,
          yearLevel: record.yearLevel?.trim() || null,
          contactNumber: record.contactNumber?.trim() || null,
          schedule: record.schedule?.trim() || null,
          iskolarNiKap: record.iskolarNiKap?.trim() || null,
          requirements: record.requirements?.trim() || null,
          rawPayload: record.rawPayload ? JSON.stringify(record.rawPayload) : null,
        })
        .returning();

      const resolved = await resolveOrGeocodeSchoolRegistry(lastSchoolName, municipality, {
        allowNominatim: true,
        importId: importRow.id,
      });

      if (resolved.source === "alias" || resolved.source === "created") {
        if (resolved.source === "alias") schoolsGeocoded += 1;
        if (resolved.source === "created") schoolsCreated += 1;
      }

      const mappingStatus = hasCoordinates(resolved.school)
        ? resolved.school.isActive
          ? "verified"
          : "mapped"
        : "needs_review";

      const studentNumber = record.studentNumber.trim();
      const [existingStudent] = await getDb()
        .select()
        .from(studentsProcessed)
        .where(eq(studentsProcessed.studentNumber, studentNumber))
        .limit(1);

      const processedValues = {
        rawId: raw.id,
        studentNumber,
        fullName: record.fullName.trim(),
        course: normalizeStudentProgramValue(record.course),
        strand: record.strand?.trim() || null,
        admissionType,
        lastSchoolName,
        lastSchoolType,
        schoolRegistryId: resolved.school.id,
        municipality,
        province,
        yearLevel: record.yearLevel?.trim() || null,
        contactNumber: record.contactNumber?.trim() || null,
        schedule: record.schedule?.trim() || null,
        iskolarNiKap: record.iskolarNiKap?.trim() || null,
        requirements: record.requirements?.trim() || null,
        enrollmentStatus,
        enrollmentDate,
        importedSource: normalizeImportedSource(source),
        archivedAt: enrollmentStatus === "Archived" ? new Date() : null,
        mappingStatus,
        syncedAt: raw.syncedAt,
      };

      if (existingStudent) {
        await getDb()
          .update(studentsProcessed)
          .set({ ...processedValues, processedAt: new Date() })
          .where(eq(studentsProcessed.id, existingStudent.id));
      } else {
        await getDb().insert(studentsProcessed).values(processedValues);
      }

      processed += 1;
    } catch (err) {
      failed += 1;
      await logMapping(
        "sync_error",
        err instanceof Error ? err.message : "Unknown sync error",
        { importId: importRow.id },
      );
    }
  }

  await getDb()
    .update(imports)
    .set({
      importedCount: processed,
      failedCount: failed,
      completedAt: new Date(),
      notes: `Skipped ${skipped} ineligible or incomplete rows`,
    })
    .where(eq(imports.id, importRow.id));

  await logMapping("import_complete", `Synced ${processed} students (${source})`, {
    importId: importRow.id,
  });

  return {
    importId: importRow.id,
    processed,
    skipped,
    failed,
    schoolsCreated,
    schoolsGeocoded,
  };
}

export async function getProcessedStudents(limit = 500) {
  return getDb()
    .select()
    .from(studentsProcessed)
    .orderBy(desc(studentsProcessed.syncedAt))
    .limit(limit);
}

export async function updateProcessedStudent(
  id: number,
  updates: {
    studentNumber?: string;
    fullName?: string;
    course?: string | null;
    strand?: string | null;
    lastSchoolName?: string;
    lastSchoolType?: string | null;
    municipality?: string;
    province?: string;
    yearLevel?: string | null;
    contactNumber?: string | null;
    schedule?: string | null;
    iskolarNiKap?: string | null;
    requirements?: string | null;
    enrollmentStatus?: string;
    enrollmentDate?: string | null;
  },
) {
  const [existing] = await getDb()
    .select()
    .from(studentsProcessed)
    .where(eq(studentsProcessed.id, id))
    .limit(1);
  if (!existing) throw new Error("Student not found");

  const nextStatus = updates.enrollmentStatus ? normalizeEnrollmentStatus(updates.enrollmentStatus) : existing.enrollmentStatus;
  const updateValues: Partial<typeof studentsProcessed.$inferInsert> = {
    processedAt: new Date(),
  };
  if (updates.studentNumber) updateValues.studentNumber = updates.studentNumber.trim();
  if (updates.fullName) updateValues.fullName = updates.fullName.trim();
  if (updates.course !== undefined) updateValues.course = normalizeStudentProgramValue(updates.course);
  if (updates.strand !== undefined) updateValues.strand = updates.strand?.trim() || null;
  if (updates.lastSchoolName) updateValues.lastSchoolName = updates.lastSchoolName.trim();
  if (updates.lastSchoolType !== undefined) updateValues.lastSchoolType = updates.lastSchoolType?.trim() || null;
  if (updates.municipality) updateValues.municipality = updates.municipality.trim();
  if (updates.province) updateValues.province = updates.province.trim();
  if (updates.yearLevel !== undefined) updateValues.yearLevel = updates.yearLevel?.trim() || null;
  if (updates.contactNumber !== undefined) updateValues.contactNumber = updates.contactNumber?.trim() || null;
  if (updates.schedule !== undefined) updateValues.schedule = updates.schedule?.trim() || null;
  if (updates.iskolarNiKap !== undefined) updateValues.iskolarNiKap = updates.iskolarNiKap?.trim() || null;
  if (updates.requirements !== undefined) updateValues.requirements = updates.requirements?.trim() || null;
  if (updates.enrollmentStatus) {
    updateValues.enrollmentStatus = nextStatus;
    updateValues.archivedAt = nextStatus === "Archived" ? new Date() : null;
  }
  if (updates.enrollmentDate !== undefined) updateValues.enrollmentDate = parseEnrollmentDate(updates.enrollmentDate);

  const [updated] = await getDb()
    .update(studentsProcessed)
    .set(updateValues)
    .where(eq(studentsProcessed.id, id))
    .returning();

  return updated;
}

export async function batchUpdateProcessedStudentStatus(ids: number[], status: string) {
  if (ids.length === 0) return { updatedCount: 0 };
  const nextStatus = normalizeEnrollmentStatus(status);
  await getDb()
    .update(studentsProcessed)
    .set({
      enrollmentStatus: nextStatus,
      archivedAt: nextStatus === "Archived" ? new Date() : null,
      processedAt: new Date(),
    })
    .where(inArray(studentsProcessed.id, ids));
  return { updatedCount: ids.length };
}

export async function getMappingQueue(): Promise<MappingQueueItem[]> {
  const items: MappingQueueItem[] = [];
  const allSchools = await storage.listSchoolRegistry();
  const byNormalized = new Map<string, SchoolRegistry[]>();

  for (const school of allSchools) {
    const key = normalizeSchoolName(school.normalizedSchoolName || school.schoolName);
    byNormalized.set(key, [...(byNormalized.get(key) || []), school]);
  }

  for (const school of allSchools) {
    const issues: string[] = [];
    if (!hasCoordinates(school)) issues.push("Missing coordinates");
    if (!school.isActive) issues.push("Needs verification");
    const dupes = byNormalized.get(normalizeSchoolName(school.normalizedSchoolName || school.schoolName)) || [];
    if (dupes.length > 1) issues.push("Possible duplicate");

    if (issues.length > 0) {
      items.push({
        kind: "school",
        id: school.id,
        title: school.schoolName,
        subtitle: `${school.municipality} · ${school.schoolType}`,
        issues,
        schoolRegistryId: school.id,
      });
    }
  }

  const pendingStudents = await getDb()
    .select()
    .from(studentsProcessed)
    .where(
      or(
        eq(studentsProcessed.mappingStatus, "pending"),
        eq(studentsProcessed.mappingStatus, "needs_review"),
      ),
    )
    .orderBy(desc(studentsProcessed.syncedAt))
    .limit(100);

  for (const student of pendingStudents) {
    items.push({
      kind: "student",
      id: student.id,
      title: student.fullName,
      subtitle: `${student.studentNumber} · ${student.lastSchoolName}`,
      issues: [student.mappingStatus === "pending" ? "Pending school link" : "Needs review"],
      schoolRegistryId: student.schoolRegistryId ?? undefined,
    });
  }

  return items;
}

export async function searchSchools(query: string, limit = 25) {
  const q = query.trim();
  if (!q) return storage.listSchoolRegistry();

  const pattern = `%${q}%`;
  return getDb()
    .select()
    .from(schoolRegistry)
    .where(
      or(
        ilike(schoolRegistry.schoolName, pattern),
        ilike(schoolRegistry.normalizedSchoolName, pattern),
        ilike(schoolRegistry.municipality, pattern),
      ),
    )
    .limit(limit);
}

export async function verifySchoolMapping(input: VerifyMappingInput) {
  const school = await storage.getSchoolRegistry(input.schoolRegistryId);
  if (!school) throw new Error("School not found");

  const updates: Partial<InsertSchoolRegistry> = {};
  if (input.schoolName?.trim()) updates.schoolName = input.schoolName.trim();
  if (input.municipality?.trim()) updates.municipality = input.municipality.trim();
  if (input.latitude != null && input.longitude != null) {
    updates.latitude = input.latitude;
    updates.longitude = input.longitude;
  }
  if (input.isActive != null) {
    updates.isActive = input.isActive;
  }

  const updated = await storage.updateSchoolRegistry(input.schoolRegistryId, updates);

  if (input.createAlias?.trim()) {
    const aliasNorm = normalizeSchoolName(input.createAlias);
    if (aliasNorm) {
      try {
        await getDb().insert(schoolAliases).values({ aliasName: input.createAlias.trim(), normalizedAlias: aliasNorm, schoolRegistryId: updated.id });
      } catch {
        // alias already exists
      }
    }
  }

  await getDb()
    .update(studentsProcessed)
    .set({ mappingStatus: updated.isActive ? "verified" : "mapped" })
    .where(eq(studentsProcessed.schoolRegistryId, updated.id));

  await logMapping("verify", `Verified school ${updated.schoolName}`, { schoolRegistryId: updated.id });

  return updated;
}

export async function getImportLogs(limit = 50) {
  return getDb().select().from(imports).orderBy(desc(imports.startedAt)).limit(limit);
}

export async function getMappingLogs(limit = 100) {
  return getDb().select().from(mappingLogs).orderBy(desc(mappingLogs.createdAt)).limit(limit);
}

export async function getGisOverviewStats() {
  const processed = await getDb().select().from(studentsProcessed);
  const activeProcessed = processed.filter((s) => isStudentActiveForGis(s.enrollmentStatus));
  const freshmen = activeProcessed.filter((s) => s.admissionType === "Freshman").length;
  const transferees = activeProcessed.filter((s) => s.admissionType === "Transferee").length;
  const allSchools = await storage.listSchoolRegistry();

  return {
    totalStudentsSynced: activeProcessed.length,
    freshmenCount: freshmen,
    transfereeCount: transferees,
    verifiedSchools: allSchools.filter((s) => s.isActive && hasCoordinates(s)).length,
    unmappedSchools: allSchools.filter((s) => !hasCoordinates(s)).length,
  };
}

export async function getGisMapData(scholarshipsFilter?: string[], programsFilter?: string[]) {
  const db = await getDb();
  
  const allSchools = await db.select().from(schoolRegistry).where(eq(schoolRegistry.isActive, true));
  const students = await db.select().from(studentsProcessed).where(
    inArray(studentsProcessed.enrollmentStatus, ACTIVE_GIS_STUDENT_STATUSES)
  );

  const schoolsMap = new Map(allSchools.map(s => [s.id, {
    schoolRegistryId: s.id,
    schoolName: s.schoolName,
    municipality: s.municipality,
    province: s.province,
    latitude: s.latitude,
    longitude: s.longitude,
    totalStudents: 0,
    scholarships: {} as Record<string, number>,
    programs: {} as Record<string, number>
  }]));

  for (const student of students) {
    if (!student.schoolRegistryId) continue;
    const schoolAgg = schoolsMap.get(student.schoolRegistryId);
    if (!schoolAgg) continue;

    const scholarship = (student.iskolarNiKap || "None").trim();
    const rawProgram = (student.course || "Unknown").trim();
    const programInfo = normalizeStudentProgramValue(rawProgram);
    const program = programInfo ? programInfo : rawProgram;

    if (scholarshipsFilter && scholarshipsFilter.length > 0) {
      if (!scholarshipsFilter.includes(scholarship)) continue;
    }
    if (programsFilter && programsFilter.length > 0) {
      if (!programsFilter.includes(program)) continue;
    }

    schoolAgg.totalStudents++;
    schoolAgg.scholarships[scholarship] = (schoolAgg.scholarships[scholarship] || 0) + 1;
    schoolAgg.programs[program] = (schoolAgg.programs[program] || 0) + 1;
  }

  return Array.from(schoolsMap.values()).filter(s => s.totalStudents > 0);
}
