import { storage } from "./storage";
import { geocodeSchoolWithNominatim } from "./geocodeService";
import { getGooglePlaceDetails, suggestGoogleSchools, type GooglePlaceSuggestion } from "./googlePlacesService";
import { schoolAliases, schools, type School } from "@shared/schema";
import { hasCoordinates, normalizeSchoolName } from "@shared/schoolRegistry";
import { getDb } from "./db";
import { eq } from "drizzle-orm";

export interface GeocodeLookupResult {
  lat: number;
  lng: number;
  displayName: string;
  source: "registry" | "alias" | "Google Maps" | "Nominatim" | "cache";
  schoolId?: number;
  reused: boolean;
}

export interface NominatimSuggestion {
  name: string;
  displayName: string;
  lat: number;
  lng: number;
}

export interface GoogleSchoolSuggestion extends GooglePlaceSuggestion {}

export interface GooglePlaceResolveResult {
  school: School;
  created: boolean;
  reused: boolean;
  displayName: string;
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

async function findSchoolByPlaceId(placeId: string): Promise<School | undefined> {
  const [school] = await getDb()
    .select()
    .from(schools)
    .where(eq(schools.placeId, placeId))
    .limit(1);
  return school;
}

async function createAlias(alias: string | undefined, schoolId: number) {
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

/** Geocode for UI preview only — no database writes. */
export async function geocodeSchoolPreview(
  name: string,
  municipality?: string,
): Promise<GeocodeLookupResult | null> {
  const trimmed = name.trim();
  if (trimmed.length < 2) return null;

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

  const geocoded = await geocodeSchoolWithNominatim(trimmed, municipality);
  if (!geocoded) return null;

  return {
    lat: geocoded.lat,
    lng: geocoded.lng,
    displayName: geocoded.displayName,
    source: geocoded.source,
    reused: false,
  };
}

export async function suggestGoogleSchoolPlaces(query: string, limit = 5): Promise<GoogleSchoolSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  return suggestGoogleSchools(q, limit);
}

export async function resolveGooglePlaceSchool(
  placeId: string,
  alias?: string,
): Promise<GooglePlaceResolveResult | null> {
  const details = await getGooglePlaceDetails(placeId);
  if (!details) return null;

  const normalized = normalizeSchoolName(details.name);
  const aliasNormalized = normalizeSchoolName(alias || "");
  const byPlaceId = await findSchoolByPlaceId(details.placeId);
  const byName = normalized ? await lookupSchoolInRegistry(details.name) : null;
  const byAlias = aliasNormalized ? await lookupSchoolInRegistry(alias!) : null;
  const existing = byPlaceId || byName?.school || byAlias?.school;

  const updates = {
    name: details.name,
    normalizedName: normalized,
    municipality: details.municipality,
    province: details.province,
    institutionType: details.types.includes("university") ? "University" : "School",
    lat: details.lat,
    lng: details.lng,
    verified: true,
    status: "Verified" as const,
    source: "Google Places",
    placeId: details.placeId,
  };

  if (existing) {
    const school = await storage.updateSchool(existing.id, {
      ...updates,
      studentCount: existing.studentCount,
    });
    await createAlias(alias, school.id);
    if (aliasNormalized && aliasNormalized !== normalized) await createAlias(details.name, school.id);
    return { school, created: false, reused: true, displayName: details.displayName };
  }

  const school = await storage.createSchool({
    ...updates,
    studentCount: 0,
    altitude: null,
  });
  await createAlias(alias, school.id);
  return { school, created: true, reused: false, displayName: details.displayName };
}

/** Nominatim suggestions for autocomplete — no database writes. */
export async function suggestSchoolsFromNominatim(
  query: string,
  limit = 5,
): Promise<NominatimSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("countrycodes", "ph");
  url.searchParams.set("q", `${q}, Laguna, Philippines`);

  const response = await fetch(url, {
    headers: {
      "User-Agent": "StudentMappingSystem/1.0 (feeder-school-geocoding)",
      Accept: "application/json",
    },
  });

  if (!response.ok) return [];

  const rows = (await response.json()) as Array<{
    lat?: string;
    lon?: string;
    display_name?: string;
    name?: string;
  }>;

  return rows
    .map((row) => {
      const lat = Number(row.lat);
      const lng = Number(row.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return {
        name: row.name || q,
        displayName: row.display_name || row.name || q,
        lat,
        lng,
      };
    })
    .filter((row): row is NominatimSuggestion => row != null);
}
