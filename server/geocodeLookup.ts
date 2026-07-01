import { storage } from "./storage";
import { schoolAliases, schools, type School } from "@shared/schema";
import { hasCoordinates, normalizeSchoolName } from "@shared/schoolRegistry";
import { getDb } from "./db";
import { eq } from "drizzle-orm";
import { matchSchool, type MasterSchool } from "./schoolMatcher";

export interface GeocodeLookupResult {
  lat: number;
  lng: number;
  displayName: string;
  source: "registry" | "alias" | "master-directory" | "cache";
  schoolId?: number;
  reused: boolean;
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
  } catch {
    return undefined;
  }
}

export async function createAlias(alias: string | undefined, schoolId: number) {
  const aliasNormalized = normalizeSchoolName(alias || "");
  if (!aliasNormalized) return;

  try {
    await getDb().insert(schoolAliases).values({ aliasNormalized, schoolId });
  } catch {
    // Existing aliases are expected in a local-first search cache.
  }
}

/** Read-only registry / alias lookup — never inserts schools. */
export async function lookupSchoolInRegistry(schoolName: string): Promise<{
  school: School;
  source: "registry" | "alias";
} | null> {
  const normalized = normalizeSchoolName(schoolName);
  if (!normalized) return null;

  const all = await storage.getSchools();
  const existing = all.find((s) => normalizeSchoolName(s.normalizedName || s.name) === normalized);
  if (existing) return { school: existing, source: "registry" };

  const viaAlias = await findSchoolByAlias(normalized);
  if (viaAlias) return { school: viaAlias, source: "alias" };

  return null;
}

async function syncMasterSchoolToDb(master: MasterSchool, rawName: string): Promise<School> {
  const normalized = normalizeSchoolName(master.school_name);
  
  // Create in database so it gets an integer ID for studentsProcessed foreign key
  const school = await storage.createSchool({
    name: master.school_name,
    normalizedName: normalized,
    municipality: master.municipality,
    province: master.province,
    institutionType: master.school_type,
    lat: master.latitude || undefined,
    lng: master.longitude || undefined,
    verified: true,
    status: "Verified",
    source: "Master Directory",
    studentCount: 0,
    altitude: null,
  });

  // Create alias mapping back to the raw name that triggered this match
  await createAlias(rawName, school.id);
  
  return school;
}

/** Geocode for UI preview and mapping pipeline. */
export async function geocodeSchoolPreview(
  name: string,
  municipality?: string,
): Promise<GeocodeLookupResult | null> {
  const trimmed = name.trim();
  if (trimmed.length < 2) return null;

  // 1. Try local DB registry/aliases first
  const match = await lookupSchoolInRegistry(trimmed);
  if (match && hasCoordinates(match.school)) {
    return {
      lat: match.school.lat!,
      lng: match.school.lng!,
      displayName: match.school.name,
      source: match.source,
      schoolId: match.school.id,
      reused: true,
    };
  }

  // 2. Try Master JSON Directory
  const masterMatch = matchSchool(trimmed);
  if (masterMatch && masterMatch.latitude && masterMatch.longitude) {
    const syncedSchool = await syncMasterSchoolToDb(masterMatch, trimmed);
    
    return {
      lat: masterMatch.latitude,
      lng: masterMatch.longitude,
      displayName: masterMatch.school_name,
      source: "master-directory",
      schoolId: syncedSchool.id,
      reused: false,
    };
  }

  // No match found in the master directory or local DB
  return null;
}
