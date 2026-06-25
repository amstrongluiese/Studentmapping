import Fuse from "fuse.js";
import * as XLSX from "xlsx";
import type { School } from "@shared/schema";
import type { SchoolInput } from "@shared/routes";
import { requestGeocodeSchool } from "@/lib/geocodeSchoolApi";
import { hasCoordinates, normalizeSchoolName, type SchoolStatus } from "@shared/schoolRegistry";

type UploadRow = Record<string, unknown>;

export interface SchoolImportPreview extends SchoolInput {
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
  name: ["school name", "school_name", "school", "institution", "institution name", "name"],
  municipality: ["municipality", "city", "town", "location"],
  institutionType: ["institution type", "institution_type", "type", "school type", "classification"],
  lat: ["latitude", "lat"],
  lng: ["longitude", "lng", "long", "lon"],
  altitude: ["altitude", "elevation"],
  studentCount: ["student count", "student_count", "enrollees", "total enrollees", "students", "count"],
};

const IMPORT_SOURCE = "Imported Excel";
const GEOCODE_CACHE_KEY = "trimex-school-geocode-cache-v1";

export function buildSchoolFuse(schools: School[] = []) {
  return new Fuse(schools, {
    keys: [
      { name: "name", weight: 0.7 },
      { name: "normalizedName", weight: 0.2 },
      { name: "municipality", weight: 0.1 },
    ],
    threshold: 0.28,
    ignoreLocation: true,
    includeScore: true,
    minMatchCharLength: 2,
  });
}

export function searchSchools(schools: School[] = [], query: string) {
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
  existingSchools: School[] = [],
): SchoolImportPreview[] {
  const fuse = buildSchoolFuse(existingSchools);
  const seen = new Set<string>();

  return rows.map((row) => {
    const normalizedName = normalizeSchoolName(row.name);
    const issues = [...row.issues];
    const exactExisting = existingSchools.find(
      (school) => normalizeSchoolName(school.normalizedName || school.name) === normalizedName,
    );
    const fuzzyMatch = exactExisting ? null : fuse.search(row.name)[0];
    const matchedSchool = exactExisting || fuzzyMatch?.item;
    const isDuplicateInFile = seen.has(normalizedName);
    seen.add(normalizedName);

    if (isDuplicateInFile) {
      issues.push("Duplicate row in upload.");
      return {
        ...row,
        normalizedName,
        importStatus: "Duplicate Entry",
        status: "Duplicate Entry",
        issues,
      };
    }

    if (matchedSchool && (exactExisting || (fuzzyMatch?.score ?? 1) <= 0.22)) {
      const matchedHasCoordinates = hasCoordinates({
        lat: matchedSchool.lat,
        lng: matchedSchool.lng,
      });

      if (!hasCoordinates(row) && matchedHasCoordinates) {
        issues.push("Coordinates reused from verified registry match.");
      } else {
        issues.push("Matched existing registry record.");
      }

      return {
        ...row,
        normalizedName,
        municipality: row.municipality || matchedSchool.municipality || "Laguna",
        institutionType: row.institutionType || matchedSchool.institutionType || "Feeder Institution",
        lat: row.lat ?? matchedSchool.lat,
        lng: row.lng ?? matchedSchool.lng,
        altitude: row.altitude ?? matchedSchool.altitude,
        verified: row.verified || matchedSchool.verified,
        status: hasCoordinates(row) || matchedHasCoordinates ? "Verified" : "Missing Coordinates",
        importStatus: hasCoordinates(row) || matchedHasCoordinates ? "Verified" : "Missing Coordinates",
        source: matchedHasCoordinates ? "Matched Registry" : row.source,
        matchedSchoolId: matchedSchool.id,
        matchedSchoolName: matchedSchool.name,
        matchScore: fuzzyMatch?.score,
        issues,
      };
    }

    return {
      ...row,
      normalizedName,
      importStatus: hasCoordinates(row) ? "Verified" : "Missing Coordinates",
      status: hasCoordinates(row) ? "Verified" : "Missing Coordinates",
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
  const sessionCache = new Map<string, { lat: number | null; lng: number | null }>();

  for (const row of missing) {
    onProgress?.({ completed, total, current: row.name });
    const index = processed.findIndex((candidate) => candidate.rowNumber === row.rowNumber);
    const cacheKey = getGeocodeCacheKey(row);
    const geocoded = sessionCache.get(cacheKey) || await geocodeSchool(row);
    sessionCache.set(cacheKey, geocoded);
    const hasGeocodedCoordinates = hasNumber(geocoded.lat) && hasNumber(geocoded.lng);

    processed[index] = {
      ...row,
      ...geocoded,
      source: hasGeocodedCoordinates ? "Google/Geocoding Auto-Locate" : row.source,
      importStatus: hasGeocodedCoordinates ? "Auto-Located" : "Missing Coordinates",
      status: hasGeocodedCoordinates ? "Auto-Located" : "Missing Coordinates",
      verified: false,
      issues: hasGeocodedCoordinates
        ? [...row.issues, "Coordinates auto-located with Google Geocoding or fallback geocoder."]
        : [...row.issues, "Coordinates still need review."],
    };

    completed += 1;
    onProgress?.({ completed, total, current: row.name });

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
  const name = stringValue(getField(row, HEADER_ALIASES.name));
  if (!name) return null;

  const lat = numberValue(getField(row, HEADER_ALIASES.lat));
  const lng = numberValue(getField(row, HEADER_ALIASES.lng));
  const altitude = numberValue(getField(row, HEADER_ALIASES.altitude));
  const hasLatLng = typeof lat === "number" && typeof lng === "number";
  const issues: string[] = [];

  if (!hasLatLng) {
    issues.push("Missing coordinates.");
  }

  return {
    rowNumber,
    name,
    normalizedName: normalizeSchoolName(name),
    municipality: stringValue(getField(row, HEADER_ALIASES.municipality)) || "Laguna",
    province: "Laguna",
    institutionType: stringValue(getField(row, HEADER_ALIASES.institutionType)) || "Feeder Institution",
    lat: hasLatLng ? lat : null,
    lng: hasLatLng ? lng : null,
    altitude: altitude ?? null,
    studentCount: numberValue(getField(row, HEADER_ALIASES.studentCount)) ?? 0,
    verified: hasLatLng,
    status: hasLatLng ? "Verified" : "Missing Coordinates",
    source: IMPORT_SOURCE,
    importStatus: hasLatLng ? "Verified" : "Missing Coordinates",
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

async function geocodeSchool(row: SchoolImportPreview): Promise<{ lat: number | null; lng: number | null }> {
  const cache = loadGeocodeCache();
  const cacheKey = getGeocodeCacheKey(row);
  const cached = cache[cacheKey];
  if (cached) return cached;

  try {
    const municipality = row.municipality?.trim() || undefined;
    const result = await requestGeocodeSchool({ name: row.name, municipality });
    if (!result) {
      cache[cacheKey] = { lat: null, lng: null };
      saveGeocodeCache(cache);
      return { lat: null, lng: null };
    }
    cache[cacheKey] = { lat: result.lat, lng: result.lng };
    saveGeocodeCache(cache);
    return { lat: result.lat, lng: result.lng };
  } catch (error) {
    console.warn("[geocode] school import lookup failed:", error);
    cache[cacheKey] = { lat: null, lng: null };
    saveGeocodeCache(cache);
    return { lat: null, lng: null };
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getGeocodeCacheKey(row: SchoolImportPreview) {
  return normalizeSchoolName(`${row.name} ${row.municipality || "Laguna"}`);
}

function hasNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function loadGeocodeCache(): Record<string, { lat: number | null; lng: number | null }> {
  if (typeof window === "undefined") return {};

  try {
    const parsed = JSON.parse(window.localStorage.getItem(GEOCODE_CACHE_KEY) || "{}") as Record<string, { lat: number | null; lng: number | null }>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveGeocodeCache(cache: Record<string, { lat: number | null; lng: number | null }>) {
  if (typeof window === "undefined") return;
  const entries = Object.entries(cache).slice(-1000);
  window.localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
}
