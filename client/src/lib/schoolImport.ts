import Fuse from "fuse.js";
import * as XLSX from "xlsx";
import { type SchoolRegistry } from "@shared/schema";
import type { SchoolInput } from "@shared/routes";
import { requestGeocodeSchool } from "@/lib/geocodeSchoolApi";
import { hasCoordinates, normalizeSchoolName, type SchoolStatus } from "@shared/schoolRegistry";

type UploadRow = Record<string, unknown>;

export interface SchoolImportPreview extends Partial<SchoolInput> {
  schoolName: string;
  rowNumber: number;
  importStatus: SchoolStatus;
  issues: string[];
  matchedSchoolId?: number;
  matchedSchoolName?: string;
  matchScore?: number;
}

export interface ImportProgress {
  completed: number;
  total: number;
  current?: string;
}

const HEADER_ALIASES = {
  schoolName: ["school name", "school_name", "school", "institution", "institution name", "name"],
  municipality: ["municipality", "city", "town", "location"],
  schoolType: ["institution type", "institution_type", "type", "school type", "classification"],
  latitude: ["latitude", "lat"],
  longitude: ["longitude", "lng", "long", "lon"],
  
  // studentCount: ["student count", "student_count", "enrollees", "total enrollees", "students", "count"],
};

const IMPORT_SOURCE = "Imported Excel";
const GEOCODE_CACHE_KEY = "trimex-school-geocode-cache-v1";

export function buildSchoolFuse(schools: SchoolRegistry[] = []) {
  return new Fuse(schools, {
    keys: [
      { name: "schoolName", weight: 0.7 },
      { name: "normalizedSchoolName", weight: 0.2 },
      { name: "municipality", weight: 0.1 },
    ],
    threshold: 0.28,
    ignoreLocation: true,
    includeScore: true,
    minMatchCharLength: 2,
  });
}

export function searchSchools(schools: SchoolRegistry[] = [], query: string) {
  const trimmed = query.trim();
  if (!trimmed) return schools;

  return buildSchoolFuse(schools)
    .search(trimmed)
    .map((result) => result.item);
}

export async function parseSchoolFile(file: File): Promise<SchoolImportPreview[]> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const rows =
    extension === "json"
      ? await parseJsonFile(file)
      : await parseWorkbookFile(file);

  return rows
    .map((row, index) => normalizeUploadRow(row, index + 2))
    .filter((row): row is SchoolImportPreview => Boolean(row));
}

export function prepareSchoolImport(
  rows: SchoolImportPreview[],
  existingSchools: SchoolRegistry[] = [],
): SchoolImportPreview[] {
  const fuse = buildSchoolFuse(existingSchools);
  const seen = new Set<string>();

  return rows.map((row) => {
    const normalizedSchoolName = normalizeSchoolName(row.schoolName || "");
    const issues = [...row.issues];
    const exactExisting = existingSchools.find(
      (school) => normalizeSchoolName(school.normalizedSchoolName || school.schoolName) === normalizedSchoolName,
    );
    const fuzzyMatch = exactExisting ? null : fuse.search(row.schoolName || "")[0];
    const matchedSchool = exactExisting || fuzzyMatch?.item;
    const isDuplicateInFile = seen.has(normalizedSchoolName);
    seen.add(normalizedSchoolName);

    if (isDuplicateInFile) {
      issues.push("Duplicate row in upload.");
      return {
        ...row,
        normalizedSchoolName,
        importStatus: "Duplicate Entry" as any,
        issues,
      };
    }

    if (matchedSchool && (exactExisting || (fuzzyMatch?.score ?? 1) <= 0.22)) {
      const matchedHasCoordinates = hasCoordinates({
        latitude: matchedSchool.latitude,
        longitude: matchedSchool.longitude,
      });

      if (!hasCoordinates(row) && matchedHasCoordinates) {
        issues.push("Coordinates reused from verified registry match.");
      } else {
        issues.push("Matched existing registry record.");
      }

      return {
        ...row,
        normalizedSchoolName,
        municipality: row.municipality || matchedSchool.municipality || "Laguna",
        schoolType: row.schoolType || matchedSchool.schoolType || "Feeder Institution",
        latitude: row.latitude ?? matchedSchool.latitude,
        longitude: row.longitude ?? matchedSchool.longitude,
        // altitude: // row.altitude ?? matchedSchool.altitude,
        isActive: matchedSchool?.isActive ?? true,
        importStatus: (hasCoordinates(row) || matchedHasCoordinates ? "Verified" : "Missing Coordinates") as any,
        source: matchedHasCoordinates ? "Matched Registry" : row.source,
        matchedSchoolId: matchedSchool?.id,
        matchedSchoolName: matchedSchool?.schoolName,
        matchScore: fuzzyMatch?.score,
        issues,
      };
    }

    return {
      ...row,
      normalizedSchoolName,
      importStatus: (hasCoordinates(row) ? "Verified" : "Missing Coordinates") as any,
      isActive: hasCoordinates(row),
      issues,
    };
  });
}

export async function geocodeMissingSchools(
  rows: SchoolImportPreview[],
  onProgress?: (progress: ImportProgress) => void,
): Promise<SchoolImportPreview[]> {
  const missing = rows.filter(
    (row) => row.importStatus !== "Duplicate Entry" && !hasCoordinates(row),
  );
  const total = missing.length;
  let completed = 0;

  const processed = [...rows];
  const sessionCache = new Map<string, { latitude: number | null; longitude: number | null }>();

  for (const row of missing) {
    onProgress?.({ completed, total, current: row.schoolName });
    const index = processed.findIndex((candidate) => candidate.rowNumber === row.rowNumber);
    const cacheKey = getGeocodeCacheKey(row);
    const geocoded = sessionCache.get(cacheKey) || await geocodeSchool(row);
    sessionCache.set(cacheKey, geocoded);
    const hasGeocodedCoordinates = hasNumber(geocoded.latitude) && hasNumber(geocoded.longitude);

    processed[index] = {
      ...row,
      ...geocoded,
      source: hasGeocodedCoordinates ? "Google/Geocoding Auto-Locate" : row.source,
      importStatus: (hasGeocodedCoordinates ? "Auto-Located" : "Missing Coordinates") as any,
      isActive: hasGeocodedCoordinates,
      // isActive: false,
      issues: hasGeocodedCoordinates
        ? [...row.issues, "Coordinates auto-located with Google Geocoding or fallback geocoder."]
        : [...row.issues, "Coordinates still need review."],
    };

    completed += 1;
    onProgress?.({ completed, total, current: row.schoolName });

    if (completed < total) {
      await sleep(1100);
    }
  }

  return processed;
}

export function getImportableSchools(rows: SchoolImportPreview[]): SchoolInput[] {
  return rows
    .filter((row) => row.importStatus !== "Duplicate Entry")
    .map(({ rowNumber, importStatus, issues, matchedSchoolId, matchedSchoolName, matchScore, ...school }) => school);
}

async function parseWorkbookFile(file: File): Promise<UploadRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) return [];

  return XLSX.utils.sheet_to_json<UploadRow>(workbook.Sheets[firstSheet], {
    defval: "",
    raw: false,
  });
}

async function parseJsonFile(file: File): Promise<UploadRow[]> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) {
    throw new Error("JSON upload must contain an array of school records.");
  }

  return parsed as UploadRow[];
}

function normalizeUploadRow(row: UploadRow, rowNumber: number): SchoolImportPreview | null {
  const name = stringValue(getField(row, HEADER_ALIASES.schoolName));
  if (!name) return null;

  const latitude = numberValue(getField(row, HEADER_ALIASES.latitude));
  const longitude = numberValue(getField(row, HEADER_ALIASES.longitude));
  // const altitude = numberValue(getField(row, HEADER_ALIASES.altitude));
  const hasLatLng = typeof latitude === "number" && typeof longitude === "number";
  const issues: string[] = [];

  if (!hasLatLng) {
    issues.push("Missing coordinates.");
  }

  return {
    rowNumber,
    schoolName: name,
    normalizedSchoolName: normalizeSchoolName(name),
    municipality: stringValue(getField(row, HEADER_ALIASES.municipality)) || "Laguna",
    province: "Laguna",
    schoolType: stringValue(getField(row, HEADER_ALIASES.schoolType)) || "Feeder Institution",
    latitude: hasLatLng ? latitude : null,
    longitude: hasLatLng ? longitude : null,
    // altitude: altitude ?? null,
    // studentCount: numberValue(getField(row, HEADER_ALIASES.studentCount)) ?? 0,
    // isActive: hasLatLng,
    isActive: hasLatLng,
    source: IMPORT_SOURCE,
    importStatus: (hasLatLng ? "Verified" : "Missing Coordinates") as any,
    issues,
  };
}

function getField(row: UploadRow, aliases: string[]) {
  const normalizedEntries = Object.entries(row).map(([key, value]) => [
    normalizeHeader(key),
    value,
  ] as const);
  const aliasSet = new Set(aliases.map(normalizeHeader));
  return normalizedEntries.find(([key]) => aliasSet.has(key))?.[1];
}

function normalizeHeader(header: string) {
  return header
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stringValue(value: unknown) {
  return String(value ?? "").trim();
}

function numberValue(value: unknown) {
  if (value == null || value === "") return null;
  const parsed = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

async function geocodeSchool(row: SchoolImportPreview): Promise<{ latitude: number | null; longitude: number | null }> {
  const cache = loadGeocodeCache();
  const cacheKey = getGeocodeCacheKey(row);
  const cached = cache[cacheKey];
  if (cached) return cached;

  try {
    const municipality = row.municipality?.trim() || undefined;
    const result = await requestGeocodeSchool({ schoolName: (row.schoolName || ''), municipality });
    if (!result) {
      cache[cacheKey] = { latitude: null, longitude: null };
      saveGeocodeCache(cache);
      return { latitude: null, longitude: null };
    }
    cache[cacheKey] = { latitude: result.latitude, longitude: result.longitude };
    saveGeocodeCache(cache);
    return { latitude: result.latitude, longitude: result.longitude };
  } catch (error) {
    console.warn("[geocode] school import lookup failed:", error);
    cache[cacheKey] = { latitude: null, longitude: null };
    saveGeocodeCache(cache);
    return { latitude: null, longitude: null };
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getGeocodeCacheKey(row: SchoolImportPreview) {
  return normalizeSchoolName(`${row.schoolName} ${row.municipality || "Laguna"}`);
}

function hasNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function loadGeocodeCache(): Record<string, { latitude: number | null; longitude: number | null }> {
  if (typeof window === "undefined") return {};

  try {
    const parsed = JSON.parse(window.localStorage.getItem(GEOCODE_CACHE_KEY) || "{}") as Record<string, { latitude: number | null; longitude: number | null }>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveGeocodeCache(cache: Record<string, { latitude: number | null; longitude: number | null }>) {
  if (typeof window === "undefined") return;
  const entries = Object.entries(cache).slice(-1000);
  window.localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
}
