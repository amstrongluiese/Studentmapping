import Fuse from "fuse.js";
import * as XLSX from "xlsx";
import type { School } from "@shared/schema";
import type { SchoolInput } from "@shared/routes";
import { inferLastSchoolTypeFromName } from "@shared/gisClassification";
import { getSchoolStatus, hasCoordinates, normalizeSchoolName } from "@shared/schoolRegistry";

export type SourceRecord = Record<string, unknown>;

export type AdmissionsFieldKey =
  | "firstName"
  | "lastName"
  | "fullName"
  | "studentNumber"
  | "feederSchool"
  | "seniorHighSchool"
  | "previousCollege"
  | "studentType"
  | "strand"
  | "program"
  | "municipality"
  | "status"
  | "lat"
  | "lng";

export type FieldMappingValue = AdmissionsFieldKey | "ignore";
export type FieldMapping = Record<string, FieldMappingValue>;

export interface AdmissionsSystemField {
  key: AdmissionsFieldKey;
  label: string;
  aliases: string[];
  required?: boolean;
}

export interface FieldSuggestion {
  fieldKey: AdmissionsFieldKey;
  confidence: number;
}

export interface ParsedAdmissionsSource {
  records: SourceRecord[];
  fields: string[];
}

export interface AdmissionsPreviewRow {
  rowNumber: number;
  sourceRecord: SourceRecord;
  firstName: string;
  lastName: string;
  fullName: string;
  studentNumber: string;
  feederSchool: string;
  strand: string;
  program: string;
  municipality: string;
  status: "ready" | "needsReview" | "duplicate" | "blocked";
  issues: string[];
  fingerprint: string;
  matchedSchool?: School;
  matchConfidence?: number;
  lat: number | null;
  lng: number | null;
}

export interface AdmissionsImportPlan {
  schools: SchoolInput[];
  fingerprints: string[];
  summary: Array<{
    schoolName: string;
    count: number;
    status: string;
  }>;
}

export interface MappingTemplate {
  id: string;
  name: string;
  createdAt: string;
  mapping: FieldMapping;
}

export const SYSTEM_FIELDS: AdmissionsSystemField[] = [
  {
    key: "firstName",
    label: "First Name",
    aliases: ["first name", "firstname", "fname", "given name", "given_name"],
  },
  {
    key: "lastName",
    label: "Last Name",
    aliases: ["last name", "lastname", "lname", "surname", "family name", "family_name"],
  },
  {
    key: "fullName",
    label: "Full Name",
    aliases: ["full name", "student name", "student_name", "applicant name", "learner name", "name"],
  },
  {
    key: "studentNumber",
    label: "Student Number",
    aliases: ["student number", "student_number", "student id", "student_id", "lrn", "application number", "applicant id"],
  },
  {
    key: "feederSchool",
    label: "Last Attended School",
    aliases: [
      "senior high school last attended",
      "senior_high_school_last_attended",
      "last school",
      "last_school",
      "last school name",
      "previous school",
      "previous_school",
      "school name",
      "school_name",
      "feeder school",
      "shs",
      "source school",
      "origin school",
    ],
    required: true,
  },
  {
    key: "seniorHighSchool",
    label: "Senior High School",
    aliases: [
      "senior high school",
      "senior_high_school",
      "shs last attended",
      "senior high school last attended",
      "last attended senior high school",
      "grade 12 school",
    ],
  },
  {
    key: "previousCollege",
    label: "Previous College",
    aliases: [
      "previous college",
      "previous_college",
      "college last attended",
      "last college",
      "transferee school",
      "transfer school",
      "origin college",
    ],
  },
  {
    key: "studentType",
    label: "Student Type",
    aliases: [
      "student type",
      "applicant type",
      "admission type",
      "new transferee",
      "entry type",
      "classification",
    ],
  },
  {
    key: "strand",
    label: "Strand",
    aliases: ["strand", "track", "shs strand", "academic track", "senior high strand"],
  },
  {
    key: "program",
    label: "Program",
    aliases: ["program", "course", "preferred program", "college program", "program choice", "program/course"],
  },
  {
    key: "municipality",
    label: "Municipality",
    aliases: ["municipality", "city", "town", "address city", "home municipality"],
  },
  {
    key: "status",
    label: "Admission Status",
    aliases: ["status", "admission status", "enrollment status", "application status"],
  },
  {
    key: "lat",
    label: "Latitude",
    aliases: ["lat", "latitude", "school latitude"],
  },
  {
    key: "lng",
    label: "Longitude",
    aliases: ["lng", "long", "lon", "longitude", "school longitude"],
  },
];

const MAPPING_TEMPLATE_KEY = "trimex-admissions-mapping-templates-v1";
const IMPORTED_FINGERPRINTS_KEY = "trimex-admissions-imported-fingerprints-v1";
const DEFAULT_SOURCE = "Admissions Integration Hub";

const systemFieldFuse = new Fuse(SYSTEM_FIELDS, {
  keys: [
    { name: "label", weight: 0.45 },
    { name: "aliases", weight: 0.55 },
  ],
  threshold: 0.42,
  ignoreLocation: true,
  includeScore: true,
});

export async function parseAdmissionsFile(file: File): Promise<ParsedAdmissionsSource> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const records = extension === "json"
    ? extractRecordsFromJson(JSON.parse(await file.text()) as unknown)
    : await parseWorkbook(file);
  const flattenedRecords = records.map((record) => flattenRecord(record));

  return {
    records: flattenedRecords,
    fields: collectFields(flattenedRecords),
  };
}

export function suggestFieldMappings(
  sourceFields: string[],
  template?: FieldMapping,
): { mapping: FieldMapping; suggestions: Record<string, FieldSuggestion> } {
  const candidates = sourceFields
    .map((field) => {
      const templated = template?.[field];
      if (templated && templated !== "ignore") {
        return { sourceField: field, fieldKey: templated, confidence: 100 };
      }

      const suggestion = suggestField(field);
      return suggestion ? { sourceField: field, ...suggestion } : null;
    })
    .filter((candidate): candidate is { sourceField: string; fieldKey: AdmissionsFieldKey; confidence: number } => Boolean(candidate))
    .sort((a, b) => b.confidence - a.confidence);

  const usedTargets = new Set<AdmissionsFieldKey>();
  const mapping: FieldMapping = Object.fromEntries(sourceFields.map((field) => [field, "ignore"]));
  const suggestions: Record<string, FieldSuggestion> = {};

  candidates.forEach((candidate) => {
    suggestions[candidate.sourceField] = {
      fieldKey: candidate.fieldKey,
      confidence: candidate.confidence,
    };

    if (candidate.confidence >= 58 && !usedTargets.has(candidate.fieldKey)) {
      mapping[candidate.sourceField] = candidate.fieldKey;
      usedTargets.add(candidate.fieldKey);
    }
  });

  return { mapping, suggestions };
}

export function buildAdmissionsPreview(
  records: SourceRecord[],
  mapping: FieldMapping,
  schools: School[],
  importedFingerprints: Set<string>,
): AdmissionsPreviewRow[] {
  const seenInBatch = new Set<string>();
  const schoolMatcher = createFeederSchoolMatcher(schools);

  return records.map((sourceRecord, index) => {
    const firstName = stringValue(readMappedValue(sourceRecord, mapping, "firstName"));
    const lastName = stringValue(readMappedValue(sourceRecord, mapping, "lastName"));
    const fullName = stringValue(readMappedValue(sourceRecord, mapping, "fullName")) || [firstName, lastName].filter(Boolean).join(" ");
    const studentNumber = stringValue(readMappedValue(sourceRecord, mapping, "studentNumber"));
    const rawFeederSchool = stringValue(readMappedValue(sourceRecord, mapping, "feederSchool"));
    const seniorHighSchool = stringValue(readMappedValue(sourceRecord, mapping, "seniorHighSchool"));
    const previousCollege = stringValue(readMappedValue(sourceRecord, mapping, "previousCollege"));
    const studentType = stringValue(readMappedValue(sourceRecord, mapping, "studentType"));
    const isTransferee = /\b(transferee|transfer|college transferee)\b/i.test(studentType);
    const feederSchool = isTransferee
      ? previousCollege || rawFeederSchool
      : seniorHighSchool || rawFeederSchool;
    const strand = stringValue(readMappedValue(sourceRecord, mapping, "strand"));
    const program = stringValue(readMappedValue(sourceRecord, mapping, "program"));
    const municipality = stringValue(readMappedValue(sourceRecord, mapping, "municipality")) || "Laguna";
    const lat = numberValue(readMappedValue(sourceRecord, mapping, "lat"));
    const lng = numberValue(readMappedValue(sourceRecord, mapping, "lng"));
    const fingerprint = buildRecordFingerprint({ studentNumber, fullName, feederSchool, strand, program, sourceRecord });
    const schoolMatch = feederSchool ? schoolMatcher(feederSchool) : null;
    const issues: string[] = [];

    if (!feederSchool) issues.push("Missing feeder school field.");
    if (feederSchool && !schoolMatch && (!hasNumber(lat) || !hasNumber(lng))) issues.push("No feeder registry match or incoming coordinates.");
    if (hasNumber(lat) !== hasNumber(lng)) issues.push("Incomplete coordinates.");
    if (hasNumber(lat) && (lat < -90 || lat > 90)) issues.push("Invalid latitude.");
    if (hasNumber(lng) && (lng < -180 || lng > 180)) issues.push("Invalid longitude.");

    const duplicateInBatch = seenInBatch.has(fingerprint);
    seenInBatch.add(fingerprint);
    const duplicateImported = importedFingerprints.has(fingerprint);

    if (duplicateInBatch) issues.push("Duplicate admission record in this batch.");
    if (duplicateImported) issues.push("Record already processed in a previous import.");
    if (schoolMatch?.school && !hasCoordinates(schoolMatch.school)) {
      issues.push("Matched feeder exists but still needs coordinates before map pinning.");
    }

    let status: AdmissionsPreviewRow["status"] = "ready";
    if (duplicateInBatch || duplicateImported) status = "duplicate";
    else if (!feederSchool || (!schoolMatch && (!hasNumber(lat) || !hasNumber(lng)))) status = "blocked";
    else if (issues.length > 0) status = "needsReview";

    return {
      rowNumber: index + 1,
      sourceRecord,
      firstName,
      lastName,
      fullName,
      studentNumber,
      feederSchool,
      strand,
      program,
      municipality,
      status,
      issues,
      fingerprint,
      matchedSchool: schoolMatch?.school,
      matchConfidence: schoolMatch?.confidence,
      lat,
      lng,
    };
  });
}

/** Build GIS pipeline sync payloads from admissions preview rows. */
export function buildGisSyncRecords(preview: AdmissionsPreviewRow[], mapping: FieldMapping) {
  return preview
    .filter((row) => row.studentNumber && row.fullName && row.feederSchool)
    .map((row) => {
      const studentType = stringValue(readMappedValue(row.sourceRecord, mapping, "studentType"));
      const seniorHighSchool = stringValue(readMappedValue(row.sourceRecord, mapping, "seniorHighSchool"));
      const previousCollege = stringValue(readMappedValue(row.sourceRecord, mapping, "previousCollege"));
      const isTransferee = /\b(transferee|transfer|college transferee)\b/i.test(studentType);

      const lastSchoolType = isTransferee || previousCollege
        ? "College"
        : seniorHighSchool
          ? "Senior High School"
          : inferLastSchoolTypeFromName(row.feederSchool);

      return {
        studentNumber: row.studentNumber,
        fullName: row.fullName,
        course: row.program || row.strand || null,
        lastSchoolName: row.feederSchool,
        lastSchoolType,
        studentType: studentType || null,
        municipality: row.municipality || "Laguna",
        rawPayload: row.sourceRecord,
      };
    });
}

export function buildAdmissionsImportPlan(
  preview: AdmissionsPreviewRow[],
  existingSchools: School[],
): AdmissionsImportPlan {
  const existingById = new Map(existingSchools.map((school) => [school.id, school]));
  const groups = new Map<string, { rows: AdmissionsPreviewRow[]; school?: School }>();

  preview
    .filter((row) => row.status !== "blocked" && row.status !== "duplicate")
    .forEach((row) => {
      const school = row.matchedSchool ? existingById.get(row.matchedSchool.id) || row.matchedSchool : undefined;
      if (!school && (!hasNumber(row.lat) || !hasNumber(row.lng))) return;

      const key = school ? `school:${school.id}` : `new:${normalizeSchoolName(row.feederSchool)}`;
      const current = groups.get(key) || { rows: [], school };
      current.rows.push(row);
      groups.set(key, current);
    });

  const schools = Array.from(groups.values()).map(({ rows, school }) => {
    const first = rows[0];
    const count = rows.length;
    const hasIncomingCoordinates = hasNumber(first.lat) && hasNumber(first.lng);
    const lat = school?.lat ?? (hasIncomingCoordinates ? first.lat : null);
    const lng = school?.lng ?? (hasIncomingCoordinates ? first.lng : null);
    const hasLatLng = hasNumber(lat) && hasNumber(lng);

    return {
      name: school?.name || first.feederSchool,
      normalizedName: normalizeSchoolName(school?.normalizedName || school?.name || first.feederSchool),
      municipality: first.municipality || school?.municipality || "Laguna",
      province: school?.province || "Laguna",
      institutionType: school?.institutionType || "Feeder Institution",
      lat,
      lng,
      altitude: school?.altitude ?? null,
      studentCount: (school?.studentCount || 0) + count,
      verified: school?.verified || false,
      status: school ? getSchoolStatus({ ...school, lat, lng }) : hasLatLng ? "Needs Review" : "Missing Coordinates",
      source: DEFAULT_SOURCE,
    } satisfies SchoolInput;
  });

  return {
    schools,
    fingerprints: Array.from(new Set(preview
      .filter((row) => row.status !== "blocked" && row.status !== "duplicate")
      .map((row) => row.fingerprint))),
    summary: schools.map((school) => ({
      schoolName: school.name,
      count: Math.max(0, school.studentCount - (existingSchools.find((existing) => normalizeSchoolName(existing.name) === normalizeSchoolName(school.name))?.studentCount || 0)),
      status: school.status,
    })),
  };
}

export function loadMappingTemplates(): MappingTemplate[] {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(MAPPING_TEMPLATE_KEY) || "[]") as MappingTemplate[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMappingTemplate(name: string, mapping: FieldMapping): MappingTemplate[] {
  const templates = loadMappingTemplates();
  const nextTemplate: MappingTemplate = {
    id: crypto.randomUUID(),
    name: name.trim() || "Admissions Mapping",
    createdAt: new Date().toISOString(),
    mapping,
  };
  const nextTemplates = [nextTemplate, ...templates].slice(0, 8);
  window.localStorage.setItem(MAPPING_TEMPLATE_KEY, JSON.stringify(nextTemplates));
  return nextTemplates;
}

export function loadImportedAdmissionFingerprints(): Set<string> {
  if (typeof window === "undefined") return new Set();

  try {
    const parsed = JSON.parse(window.localStorage.getItem(IMPORTED_FINGERPRINTS_KEY) || "[]") as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function saveImportedAdmissionFingerprints(fingerprints: Set<string>) {
  window.localStorage.setItem(IMPORTED_FINGERPRINTS_KEY, JSON.stringify(Array.from(fingerprints).slice(-5000)));
}

export function collectFields(records: SourceRecord[]): string[] {
  const fields = new Set<string>();
  records.slice(0, 100).forEach((record) => {
    Object.keys(record).forEach((key) => fields.add(key));
  });

  return Array.from(fields);
}

function suggestField(sourceField: string): FieldSuggestion | null {
  const normalizedField = normalizeFieldName(sourceField);
  const exact = SYSTEM_FIELDS.find((field) =>
    [field.label, ...field.aliases].map(normalizeFieldName).includes(normalizedField),
  );

  if (exact) {
    return { fieldKey: exact.key, confidence: 98 };
  }

  const [result] = systemFieldFuse.search(normalizedField);
  if (!result) return null;

  return {
    fieldKey: result.item.key,
    confidence: Math.max(0, Math.round((1 - (result.score ?? 1)) * 100)),
  };
}

async function parseWorkbook(file: File): Promise<SourceRecord[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) return [];

  return XLSX.utils.sheet_to_json<SourceRecord>(workbook.Sheets[firstSheet], {
    defval: "",
    raw: false,
  });
}

function extractRecordsFromJson(value: unknown): SourceRecord[] {
  if (Array.isArray(value)) {
    const directRecords = value.filter(isPlainRecord);
    if (directRecords.length > 0) return directRecords;

    for (const item of value) {
      const nested = extractRecordsFromJson(item);
      if (nested.length > 0) return nested;
    }
  }

  if (!isPlainRecord(value)) return [];

  for (const key of ["data", "records", "results", "items", "rows", "students", "enrollees", "admissions"]) {
    const nested = extractRecordsFromJson(value[key]);
    if (nested.length > 0) return nested;
  }

  return [value];
}

function flattenRecord(record: SourceRecord, prefix = "", output: SourceRecord = {}): SourceRecord {
  Object.entries(record).forEach(([key, value]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;

    if (isPlainRecord(value)) {
      flattenRecord(value, nextKey, output);
      return;
    }

    if (Array.isArray(value)) {
      output[nextKey] = value.every((item) => typeof item !== "object") ? value.join(", ") : JSON.stringify(value);
      return;
    }

    output[nextKey] = value;
  });

  return output;
}

function createFeederSchoolMatcher(schools: School[]) {
  const exactByNormalized = new Map(
    schools.map((school) => [normalizeSchoolName(school.normalizedName || school.name), school]),
  );
  const schoolFuse = new Fuse(schools, {
    keys: [
      { name: "name", weight: 0.75 },
      { name: "normalizedName", weight: 0.2 },
      { name: "municipality", weight: 0.05 },
    ],
    threshold: 0.36,
    ignoreLocation: true,
    includeScore: true,
    minMatchCharLength: 2,
  });

  return (feederSchool: string): { school: School; confidence: number } | null => {
    const normalized = normalizeSchoolName(feederSchool);
    const exact = exactByNormalized.get(normalized);

    if (exact) {
      return { school: exact, confidence: 100 };
    }

    const [result] = schoolFuse.search(feederSchool);

    if (!result || (result.score ?? 1) > 0.34) return null;

    return {
      school: result.item,
      confidence: Math.max(55, Math.round((1 - (result.score ?? 1)) * 100)),
    };
  };
}

function readMappedValue(record: SourceRecord, mapping: FieldMapping, fieldKey: AdmissionsFieldKey): unknown {
  const sourceField = Object.entries(mapping).find(([, mappedField]) => mappedField === fieldKey)?.[0];
  return sourceField ? record[sourceField] : undefined;
}

function buildRecordFingerprint(parts: {
  studentNumber: string;
  fullName: string;
  feederSchool: string;
  strand: string;
  program: string;
  sourceRecord: SourceRecord;
}): string {
  const primary = parts.studentNumber || [parts.fullName, parts.feederSchool, parts.strand, parts.program].filter(Boolean).join("|");
  if (!primary) return normalizeFieldName(JSON.stringify(parts.sourceRecord));
  return normalizeFieldName(primary);
}

function normalizeFieldName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_./-]/g, " ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stringValue(value: unknown): string {
  return String(value ?? "").trim();
}

function numberValue(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function hasNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPlainRecord(value: unknown): value is SourceRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
