import { getDb } from "./db";
import { matchSchool, type MasterSchool } from "./schoolMatcher";
import { storage } from "./storage";
import {
  imports,
  mappingLogs,
  schoolAliases,
  schools,
  studentsProcessed,
  studentsRaw,
  type School,
} from "@shared/schema";
import {
  classifyAdmissionFromSchoolType,
  inferLastSchoolTypeFromName,
  isEligibleForGisMapping,
} from "@shared/gisClassification";
import { getSchoolStatus, hasCoordinates, normalizeSchoolName, type SchoolStatus } from "@shared/schoolRegistry";
import { normalizeStudentProgramValue } from "@shared/programRecognition";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import type { InsertSchool } from "@shared/schema";

export interface StudentSyncRecord {
  studentNumber: string;
  fullName: string;
  course?: string | null;
  lastSchoolName: string;
  lastSchoolType?: string | null;
  studentType?: string | null;
  municipality?: string | null;
  province?: string | null;
  yearLevel?: string | null;
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
  schoolId?: number;
}

export interface VerifyMappingInput {
  schoolId: number;
  verified?: boolean;
  lat?: number | null;
  lng?: number | null;
  name?: string;
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
  const processed = await getDb().select().from(studentsProcessed);
  const counts = new Map<number, number>();
  for (const student of processed) {
    if (!student.schoolId || !isStudentActiveForGis(student.enrollmentStatus)) continue;
    counts.set(student.schoolId, (counts.get(student.schoolId) || 0) + 1);
  }

  const allSchools = await storage.getSchools();
  for (const school of allSchools) {
    const nextCount = counts.get(school.id) || 0;
    if (school.studentCount !== nextCount) {
      await storage.updateSchool(school.id, { studentCount: nextCount });
    }
  }
}

async function logMapping(
  action: string,
  message: string,
  opts?: { importId?: number; schoolId?: number; studentProcessedId?: number },
) {
  await getDb().insert(mappingLogs).values({
    action,
    message,
    importId: opts?.importId ?? null,
    schoolId: opts?.schoolId ?? null,
    studentProcessedId: opts?.studentProcessedId ?? null,
  });
}

async function findSchoolByNormalized(normalized: string): Promise<School | undefined> {
  const all = await storage.getSchools();
  return all.find((s) => normalizeSchoolName(s.normalizedName || s.name) === normalized);
}

async function findSchoolByAlias(normalized: string): Promise<School | undefined> {
  try {
    const [alias] = await getDb()
      .select()
      .from(schoolAliases)
      .where(eq(schoolAliases.aliasNormalized, normalized))
      .limit(1);

    if (!alias) return undefined;
    return storage.getSchool(alias.schoolId);
  } catch (error) {
    console.warn("[gis] school_aliases lookup skipped:", error instanceof Error ? error.message : error);
    return undefined;
  }
}

export async function resolveOrGeocodeSchool(
  schoolName: string,
  municipality?: string,
  opts?: { allowNominatim?: boolean; importId?: number },
): Promise<{ school: School; source: "registry" | "alias" | "master-directory" | "created" }> {
  const registryMunicipality = municipality?.trim() || "Laguna";
  const normalized = normalizeSchoolName(schoolName);
  if (!normalized) {
    throw new Error("School name is required for geolocation.");
  }

  const existing = await findSchoolByNormalized(normalized);
  if (existing && hasCoordinates(existing)) {
    return { school: existing, source: "registry" };
  }

  const viaAlias = await findSchoolByAlias(normalized);
  if (viaAlias && hasCoordinates(viaAlias)) {
    return { school: viaAlias, source: "alias" };
  }

  const base = existing || viaAlias;

  // Try matching against Master JSON Directory
  const masterMatch = matchSchool(schoolName);
  
  if (masterMatch && masterMatch.latitude && masterMatch.longitude) {
    if (base) {
      const updated = await storage.updateSchool(base.id, {
        lat: masterMatch.latitude,
        lng: masterMatch.longitude,
        status: "Auto-Located",
        source: "Master Directory",
      });
      await logMapping("geocode", `Matched ${schoolName} to Master Directory`, {
        importId: opts?.importId,
        schoolId: updated.id,
      });
      return { school: updated, source: "master-directory" };
    }

    // Insert new from master
    const created = await storage.createSchool({
      name: masterMatch.school_name,
      normalizedName: normalizeSchoolName(masterMatch.school_name),
      municipality: masterMatch.municipality || registryMunicipality,
      province: masterMatch.province || "Laguna",
      institutionType: masterMatch.school_type || "Feeder Institution",
      lat: masterMatch.latitude,
      lng: masterMatch.longitude,
      studentCount: 0,
      verified: true,
      status: "Verified",
      source: "Master Directory",
    });
    
    // Create an alias back to the raw name that triggered this match
    if (normalized !== created.normalizedName) {
      try {
        await getDb().insert(schoolAliases).values({ aliasNormalized: normalized, schoolId: created.id });
      } catch {
        // Ignore if alias already exists
      }
    }

    await logMapping("geocode", `Created and matched ${schoolName} via Master Directory`, {
      importId: opts?.importId,
      schoolId: created.id,
    });
    return { school: created, source: "master-directory" };
  }

  // Not in DB and not in Master Directory -> Missing Coordinates
  if (base) return { school: base, source: "registry" };
  
  const created = await storage.createSchool({
    name: schoolName.trim(),
    normalizedName: normalized,
    municipality: registryMunicipality,
    province: "Laguna",
    institutionType: inferLastSchoolTypeFromName(schoolName) || "Feeder Institution",
    lat: null,
    lng: null,
    studentCount: 0,
    verified: false,
    status: "Missing Coordinates",
    source: "GIS Pipeline",
  });
  await logMapping("geocode_miss", `No master directory match for ${schoolName}`, {
    importId: opts?.importId,
    schoolId: created.id,
  });
  return { school: created, source: "created" };
}

export async function syncStudents(
  records: StudentSyncRecord[],
  source = "api",
): Promise<StudentSyncResult> {
  const [importRow] = await getDb()
    .insert(imports)
    .values({ source, status: "running", importedCount: 0, failedCount: 0 })
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
          lastSchoolName,
          lastSchoolType,
          studentType: record.studentType?.trim() || null,
          municipality,
          rawPayload: record.rawPayload ? JSON.stringify(record.rawPayload) : null,
        })
        .returning();

      const resolved = await resolveSchoolCoordinates(lastSchoolName, municipality, {
        allowNominatim: true,
        importId: importRow.id,
      });

      if (resolved.source === "nominatim" || resolved.source === "created") {
        if (resolved.source === "nominatim") schoolsGeocoded += 1;
        if (resolved.source === "created") schoolsCreated += 1;
      }

      const mappingStatus = hasCoordinates(resolved.school)
        ? resolved.school.verified
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
        admissionType,
        lastSchoolName,
        lastSchoolType,
        schoolId: resolved.school.id,
        municipality,
        province,
        yearLevel: record.yearLevel?.trim() || null,
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
      status: failed > 0 ? "completed_with_errors" : "completed",
      importedCount: processed,
      failedCount: failed,
      completedAt: new Date(),
      notes: `Skipped ${skipped} ineligible or incomplete rows`,
    })
    .where(eq(imports.id, importRow.id));

  await logMapping("import_complete", `Synced ${processed} students (${source})`, {
    importId: importRow.id,
  });

  await recomputeSchoolStudentCounts();

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
  await recomputeSchoolStudentCounts();
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
    lastSchoolName?: string;
    lastSchoolType?: string | null;
    municipality?: string;
    province?: string;
    yearLevel?: string | null;
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
  if (updates.lastSchoolName) updateValues.lastSchoolName = updates.lastSchoolName.trim();
  if (updates.lastSchoolType !== undefined) updateValues.lastSchoolType = updates.lastSchoolType?.trim() || null;
  if (updates.municipality) updateValues.municipality = updates.municipality.trim();
  if (updates.province) updateValues.province = updates.province.trim();
  if (updates.yearLevel !== undefined) updateValues.yearLevel = updates.yearLevel?.trim() || null;
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

  await recomputeSchoolStudentCounts();
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
  await recomputeSchoolStudentCounts();
  return { updatedCount: ids.length };
}

export async function getMappingQueue(): Promise<MappingQueueItem[]> {
  const items: MappingQueueItem[] = [];
  const allSchools = await storage.getSchools();
  const byNormalized = new Map<string, School[]>();

  for (const school of allSchools) {
    const key = normalizeSchoolName(school.normalizedName || school.name);
    byNormalized.set(key, [...(byNormalized.get(key) || []), school]);
  }

  for (const school of allSchools) {
    const issues: string[] = [];
    if (!hasCoordinates(school)) issues.push("Missing coordinates");
    if (!school.verified) issues.push("Needs verification");
    const dupes = byNormalized.get(normalizeSchoolName(school.normalizedName || school.name)) || [];
    if (dupes.length > 1) issues.push("Possible duplicate");

    if (issues.length > 0) {
      items.push({
        kind: "school",
        id: school.id,
        title: school.name,
        subtitle: `${school.municipality} · ${school.institutionType}`,
        issues,
        schoolId: school.id,
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
      schoolId: student.schoolId ?? undefined,
    });
  }

  return items;
}

export async function searchSchools(query: string, limit = 25) {
  const q = query.trim();
  if (!q) return storage.getSchools();

  const pattern = `%${q}%`;
  return getDb()
    .select()
    .from(schools)
    .where(
      or(
        ilike(schools.name, pattern),
        ilike(schools.normalizedName, pattern),
        ilike(schools.municipality, pattern),
      ),
    )
    .limit(limit);
}

export async function verifySchoolMapping(input: VerifyMappingInput) {
  const school = await storage.getSchool(input.schoolId);
  if (!school) throw new Error("School not found");

  const updates: Partial<InsertSchool> = {};
  if (input.name?.trim()) updates.name = input.name.trim();
  if (input.municipality?.trim()) updates.municipality = input.municipality.trim();
  if (input.lat != null && input.lng != null) {
    updates.lat = input.lat;
    updates.lng = input.lng;
    primeGeocodeCache(input.name || school.name, input.municipality || school.municipality, input.lat, input.lng);
  }
  if (input.verified != null) {
    updates.verified = input.verified;
    const nextStatus: SchoolStatus =
      input.verified && hasCoordinates({ ...school, ...updates })
        ? "Verified"
        : getSchoolStatus({ ...school, ...updates });
    updates.status = nextStatus;
  }

  const updated = await storage.updateSchool(input.schoolId, updates);

  if (input.createAlias?.trim()) {
    const aliasNorm = normalizeSchoolName(input.createAlias);
    if (aliasNorm) {
      try {
        await getDb().insert(schoolAliases).values({ aliasNormalized: aliasNorm, schoolId: updated.id });
      } catch {
        // alias already exists
      }
    }
  }

  await getDb()
    .update(studentsProcessed)
    .set({ mappingStatus: updated.verified ? "verified" : "mapped" })
    .where(eq(studentsProcessed.schoolId, updated.id));

  await logMapping("verify", `Verified school ${updated.name}`, { schoolId: updated.id });

  return updated;
}

export async function getImportLogs(limit = 50) {
  return getDb().select().from(imports).orderBy(desc(imports.startedAt)).limit(limit);
}

export async function getMappingLogs(limit = 100) {
  return getDb().select().from(mappingLogs).orderBy(desc(mappingLogs.createdAt)).limit(limit);
}

export async function getGisOverviewStats() {
  await recomputeSchoolStudentCounts();
  const processed = await getDb().select().from(studentsProcessed);
  const activeProcessed = processed.filter((s) => isStudentActiveForGis(s.enrollmentStatus));
  const freshmen = activeProcessed.filter((s) => s.admissionType === "Freshman").length;
  const transferees = activeProcessed.filter((s) => s.admissionType === "Transferee").length;
  const allSchools = await storage.getSchools();

  return {
    totalStudentsSynced: activeProcessed.length,
    freshmenCount: freshmen,
    transfereeCount: transferees,
    verifiedSchools: allSchools.filter((s) => s.verified && hasCoordinates(s)).length,
    unmappedSchools: allSchools.filter((s) => !hasCoordinates(s)).length,
  };
}
