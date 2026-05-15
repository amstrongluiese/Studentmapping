import { getDb } from "./db";
import { geocodeSchoolWithNominatim, primeGeocodeCache } from "./geocodeService";
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
import { desc, eq, ilike, or } from "drizzle-orm";
import type { InsertSchool } from "@shared/schema";

export interface StudentSyncRecord {
  studentNumber: string;
  fullName: string;
  course?: string | null;
  lastSchoolName: string;
  lastSchoolType?: string | null;
  studentType?: string | null;
  municipality?: string | null;
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
  const [alias] = await getDb()
    .select()
    .from(schoolAliases)
    .where(eq(schoolAliases.aliasNormalized, normalized))
    .limit(1);

  if (!alias) return undefined;
  return storage.getSchool(alias.schoolId);
}

export async function resolveSchoolCoordinates(
  schoolName: string,
  municipality = "Laguna",
  opts?: { allowNominatim?: boolean; importId?: number },
): Promise<{ school: School; source: "registry" | "alias" | "nominatim" | "created" }> {
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

  if (base && hasCoordinates(base)) {
    return { school: base, source: base === viaAlias ? "alias" : "registry" };
  }

  if (!opts?.allowNominatim) {
    if (base) return { school: base, source: "registry" };
    const created = await storage.createSchool({
      name: schoolName.trim(),
      normalizedName: normalized,
      municipality: municipality.trim() || "Laguna",
      institutionType: inferLastSchoolTypeFromName(schoolName) || "Feeder Institution",
      lat: null,
      lng: null,
      studentCount: 0,
      verified: false,
      status: "Missing Coordinates",
      source: "GIS Pipeline",
    });
    return { school: created, source: "created" };
  }

  const geocoded = await geocodeSchoolWithNominatim(schoolName, municipality);
  if (!geocoded) {
    if (base) return { school: base, source: "registry" };
    const created = await storage.createSchool({
      name: schoolName.trim(),
      normalizedName: normalized,
      municipality: municipality.trim() || "Laguna",
      institutionType: inferLastSchoolTypeFromName(schoolName) || "Feeder Institution",
      lat: null,
      lng: null,
      studentCount: 0,
      verified: false,
      status: "Missing Coordinates",
      source: "GIS Pipeline",
    });
    await logMapping("geocode_miss", `No Nominatim match for ${schoolName}`, {
      importId: opts?.importId,
      schoolId: created.id,
    });
    return { school: created, source: "created" };
  }

  if (base) {
    const updated = await storage.updateSchool(base.id, {
      lat: geocoded.lat,
      lng: geocoded.lng,
      status: "Auto-Located",
      source: "Nominatim GIS Pipeline",
    });
    primeGeocodeCache(schoolName, municipality, geocoded.lat, geocoded.lng, geocoded.displayName);
    await logMapping("geocode", `Geolocated ${schoolName} via Nominatim`, {
      importId: opts?.importId,
      schoolId: updated.id,
    });
    return { school: updated, source: "nominatim" };
  }

  const created = await storage.createSchool({
    name: schoolName.trim(),
    normalizedName: normalized,
    municipality: municipality.trim() || "Laguna",
    institutionType: inferLastSchoolTypeFromName(schoolName) || "Feeder Institution",
    lat: geocoded.lat,
    lng: geocoded.lng,
    studentCount: 0,
    verified: false,
    status: "Auto-Located",
    source: "Nominatim GIS Pipeline",
  });
  primeGeocodeCache(schoolName, municipality, geocoded.lat, geocoded.lng, geocoded.displayName);
  await logMapping("geocode", `Created and geolocated ${schoolName}`, {
    importId: opts?.importId,
    schoolId: created.id,
  });
  return { school: created, source: "nominatim" };
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

      await getDb().insert(studentsProcessed).values({
        rawId: raw.id,
        studentNumber: record.studentNumber.trim(),
        fullName: record.fullName.trim(),
        course: record.course?.trim() || null,
        admissionType,
        lastSchoolName,
        lastSchoolType,
        schoolId: resolved.school.id,
        mappingStatus,
        syncedAt: raw.syncedAt,
      });

      await storage.updateSchool(resolved.school.id, {
        studentCount: (resolved.school.studentCount || 0) + 1,
      });

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
  const processed = await getDb().select().from(studentsProcessed);
  const freshmen = processed.filter((s) => s.admissionType === "Freshman").length;
  const transferees = processed.filter((s) => s.admissionType === "Transferee").length;
  const allSchools = await storage.getSchools();

  return {
    totalStudentsSynced: processed.length,
    freshmenCount: freshmen,
    transfereeCount: transferees,
    verifiedSchools: allSchools.filter((s) => s.verified && hasCoordinates(s)).length,
    unmappedSchools: allSchools.filter((s) => !hasCoordinates(s)).length,
  };
}
