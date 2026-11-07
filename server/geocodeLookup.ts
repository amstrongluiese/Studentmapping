import { storage } from "./storage";
import { schoolAliases } from "@shared/schema";
import { hasCoordinates, normalizeSchoolName } from "@shared/schoolRegistry";
import { getDb } from "./db";
import { eq } from "drizzle-orm";
import { SchoolMatchingEngine } from "./schoolMatcher";
import { type SchoolRegistry as DbSchoolRegistry } from "@shared/schema";

export interface GeocodeLookupResult {
  latitude: number;
  longitude: number;
  displayName: string;
  source: "registry" | "alias" | "master-directory" | "cache" | "google";
  schoolId?: number;
  reused: boolean;
}

async function findSchoolByAlias(normalized: string): Promise<DbSchoolRegistry | undefined> {
  try {
    const [alias] = await getDb()
      .select()
      .from(schoolAliases)
      .where(eq(schoolAliases.normalizedAlias, normalized))
      .limit(1);
    if (!alias) return undefined;
    return storage.getSchoolRegistry(alias.schoolRegistryId);
  } catch {
    return undefined;
  }
}

export async function createAlias(aliasName: string | undefined, schoolRegistryId: number) {
  const normalizedAlias = normalizeSchoolName(aliasName || "");
  if (!normalizedAlias || !aliasName) return;

  try {
    await getDb().insert(schoolAliases).values({ aliasName, normalizedAlias, schoolRegistryId });
  } catch {
    // Existing aliases are expected in a local-first search cache.
  }
}

/** Read-only registry / alias lookup — never inserts schools. */
export async function lookupSchoolInRegistry(schoolName: string): Promise<{
  school: DbSchoolRegistry;
  source: "registry" | "alias";
} | null> {
  const normalized = normalizeSchoolName(schoolName);
  if (!normalized) return null;

  const all = await storage.listSchoolRegistry();
  const existing = all.find((s) => normalizeSchoolName(s.normalizedSchoolName || s.schoolName) === normalized);
  if (existing) return { school: existing, source: "registry" };

  const viaAlias = await findSchoolByAlias(normalized);
  if (viaAlias) return { school: viaAlias, source: "alias" };

  return null;
}

async function syncSchoolRegistryToDb(school: DbSchoolRegistry, rawName: string): Promise<DbSchoolRegistry> {
  const normalized = normalizeSchoolName(school.schoolName);
  
  // Create in database so it gets an integer ID for studentsProcessed foreign key
  const createdSchool = await storage.createSchoolRegistry({
    schoolName: school.schoolName,
    normalizedSchoolName: normalized,
    municipality: school.municipality,
    province: school.province,
    schoolType: school.schoolType,
    latitude: school.latitude || undefined,
    longitude: school.longitude || undefined,
    isActive: true,
    source: "Master Directory",
  });

  // Create alias mapping back to the raw name that triggered this match
  await createAlias(rawName, school.id);
  
  return school;
}

/** Geocode for UI preview and mapping pipeline. */
export async function geocodeSchoolPreview(
  schoolName: string,
  municipality?: string,
): Promise<GeocodeLookupResult | null> {
  const trimmed = String(schoolName).trim();
  if (trimmed.length < 2) return null;

  // 1. Try local DB registry/aliases first
  const match = await lookupSchoolInRegistry(trimmed);
  if (match && hasCoordinates(match.school)) {
    return {
      latitude: match.school.latitude!,
      longitude: match.school.longitude!,
      displayName: match.school.schoolName,
      source: match.source,
      schoolId: match.school.id,
      reused: true,
    };
  }

  // 2. Check the in-memory master directory for a likely match
  try {
    const all = await storage.listSchoolRegistry();
    const matcher = new SchoolMatchingEngine(all, []);
    const matchResult = matcher.match(trimmed);
    if (matchResult.status === "matched" && matchResult.school && hasCoordinates(matchResult.school)) {
      return {
        latitude: matchResult.school.latitude!,
        longitude: matchResult.school.longitude!,
        displayName: matchResult.school.schoolName,
        source: "master-directory",
        schoolId: matchResult.school.id,
        reused: true,
      };
    }
  } catch {
    // on error, continue to Google Maps fallback
  }

  // 3. Fallback to Server-Side Google Geocoding API if key is available
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY;
  if (apiKey) {
    try {
      const searchQueries = [
        municipality ? `${trimmed}, ${municipality}, Laguna, Philippines` : `${trimmed}, Laguna, Philippines`,
        `${trimmed}, Philippines`
      ];

      for (const query of searchQueries) {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&region=ph&key=${apiKey}`;
        const response = await fetch(url);
        if (!response.ok) continue;
        const data = await response.json();
        
        if (data.status === "OK" && data.results && data.results.length > 0) {
          const firstResult = data.results[0];
          const loc = firstResult.geometry?.location;
          if (loc && typeof loc.lat === "number" && typeof loc.lng === "number") {
            return {
              latitude: loc.lat,
              longitude: loc.lng,
              displayName: firstResult.formatted_address || trimmed,
              source: "google",
              reused: false,
            };
          }
        }
      }
    } catch (err) {
      console.warn("[geocodeLookup] Google Geocoding API fallback error:", err instanceof Error ? err.message : err);
    }
  }

  return null;
}

