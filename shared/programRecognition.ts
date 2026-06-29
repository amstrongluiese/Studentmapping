import type { School, StudentProcessed } from "./schema";
import { normalizeSchoolName } from "./schoolRegistry";

export const ALL_PROGRAM_FILTER = "all";

export interface ProgramInfo {
  code: string;
  college: string;
  collegeName: string;
  department: string;
  departmentName: string;
  program: string;
  track: string;
  level: string;
  color: string;
  description?: string;
  note?: string;
}

export interface ProgramFilters {
  college: string;
  program: string;
  track: string;
}

export interface ProgramDistributionEntry {
  code: string;
  college: string;
  collegeName: string;
  department: string;
  departmentName: string;
  program: string;
  track: string;
  color: string;
  count: number;
}

export const PROGRAM_COLORS = {
  COE: "#f97316",
  CBA: "#f2c94c",
  CCS: "#800000",
  COED: "#1d4ed8",
  TOURISM: "#38bdf8",
  COA: "#facc15",
  TESDA: "#6b7280",
  NA: "#166534",
  EIT_IT: "#374151",
  STANDALONE: "#7f1d1d",
  CPTP: "#dc2626",
  UNKNOWN: "#e5e7eb",
} as const;

export const PROGRAM_MAP: Record<string, ProgramInfo> = {
  ABPSY: program("ABPSY", "Standalone", "Standalone Programs", "ABPSY", "", "Bachelor", PROGRAM_COLORS.STANDALONE),
  BSA: program("BSA", "COA", "College of Accountancy", "BSA", "", "Bachelor", PROGRAM_COLORS.COA),
  "BSBA FM": program("BSBA FM", "CBA", "College of Business Administration", "BSBA", "FM", "Bachelor", PROGRAM_COLORS.CBA),
  "BSBA DMM": program("BSBA DMM", "CBA", "College of Business Administration", "BSBA", "DMM", "Bachelor", PROGRAM_COLORS.CBA),
  "BSBA OM": program("BSBA OM", "CBA", "College of Business Administration", "BSBA", "OM", "Bachelor", PROGRAM_COLORS.CBA),
  "BSBA HRM": program("BSBA HRM", "CBA", "College of Business Administration", "BSBA", "HRM", "Bachelor", PROGRAM_COLORS.CBA),
  BSOA: program("BSOA", "CBA", "College of Business Administration", "BSOA", "", "Bachelor", PROGRAM_COLORS.CBA),
  BPA: program("BPA", "CBA", "College of Business Administration", "BPA", "", "Bachelor", PROGRAM_COLORS.CBA),
  BSCA: program("BSCA", "CBA", "College of Business Administration", "BSCA", "", "Bachelor", PROGRAM_COLORS.CBA),
  BSREM: program("BSREM", "Standalone", "Standalone Programs", "BSREM", "", "Bachelor", PROGRAM_COLORS.STANDALONE, undefined, "Created by CBA but standalone for filtering"),
  "BS CRIM": program("BS CRIM", "Standalone", "Standalone Programs", "BS CRIM", "", "Bachelor", PROGRAM_COLORS.STANDALONE),
  BSCPE: program("BSCPE", "COE", "College of Engineering", "BSCPE", "", "Bachelor", PROGRAM_COLORS.COE),
  BSIE: program("BSIE", "COE", "College of Engineering", "BSIE", "", "Bachelor", PROGRAM_COLORS.COE),
  "BSCS CS": program("BSCS CS", "CCS", "College of Computer Studies", "BSCS", "CS", "Bachelor", PROGRAM_COLORS.CCS),
  "BSCS DS": program("BSCS DS", "CCS", "College of Computer Studies", "BSCS", "DS", "Bachelor", PROGRAM_COLORS.CCS),
  "BSIT MWD": program("BSIT MWD", "CCS", "College of Computer Studies", "BSIT", "MWD", "Bachelor", PROGRAM_COLORS.CCS),
  "BSIT MAA": program("BSIT MAA", "CCS", "College of Computer Studies", "BSIT", "MAA", "Bachelor", PROGRAM_COLORS.CCS),
  "BSIT NSA": program("BSIT NSA", "CCS", "College of Computer Studies", "BSIT", "NSA", "Bachelor", PROGRAM_COLORS.CCS),
  "BTVTE FSM": program("BTVTE FSM", "COEd", "College of Education", "BTVTE", "FSM", "Bachelor", PROGRAM_COLORS.COED),
  "BTVTE HRS": program("BTVTE HRS", "COEd", "College of Education", "BTVTE", "HRS", "Bachelor", PROGRAM_COLORS.COED),
  "BTVTE CP": program("BTVTE CP", "COEd", "College of Education", "BTVTE", "CP", "Bachelor", PROGRAM_COLORS.COED),
  "BTVTE ET": program("BTVTE ET", "COEd", "College of Education", "BTVTE", "ET", "Bachelor", PROGRAM_COLORS.COED),
  BSTM: program("BSTM", "Tourism", "Tourism / Hospitality", "BSTM", "", "Bachelor", PROGRAM_COLORS.TOURISM),
  BSSW: program("BSSW", "Standalone", "Standalone Programs", "BSSW", "", "Bachelor", PROGRAM_COLORS.STANDALONE),
  IT: program("IT", "TESDA", "TESDA 2-Year Courses", "IT", "", "2-Year", PROGRAM_COLORS.EIT_IT),
  NA: program("NA", "TESDA", "TESDA 2-Year Courses", "NA", "", "2-Year", PROGRAM_COLORS.NA, "Nursing Aid"),
  EIT: program("EIT", "TESDA", "TESDA 2-Year Courses", "EIT", "", "2-Year", PROGRAM_COLORS.EIT_IT, "Electronics-related 2-year course"),
  BM: program("BM", "TESDA", "TESDA 2-Year Courses", "BM", "", "2-Year", PROGRAM_COLORS.TESDA, "Business Management 2-year course"),
  HRS: program("HRS", "TESDA", "TESDA 2-Year Courses", "HRS", "", "2-Year", PROGRAM_COLORS.TESDA, "Hospitality / Tourism-related 2-year course"),
  CPTP: program("CPTP", "Special Program", "Special Program", "CPTP", "", "Certificate", PROGRAM_COLORS.CPTP, "21-unit education program for LPT exam eligibility"),
};

export const PROGRAM_CATALOG = Object.values(PROGRAM_MAP);

const PROGRAM_LOOKUP = new Map(PROGRAM_CATALOG.map((record) => [record.code, record]));

const PROGRAM_ALIASES: Record<string, string> = {
  "AB PSY": "ABPSY",
  "AB PSYCHOLOGY": "ABPSY",
  "BACHELOR OF ARTS IN PSYCHOLOGY": "ABPSY",
  "ACCOUNTANCY": "BSA",
  "BACHELOR OF SCIENCE IN ACCOUNTANCY": "BSA",
  "BACHELOR OF SCIENCE IN BUSINESS ADMINISTRATION FINANCIAL MANAGEMENT": "BSBA FM",
  "BACHELOR OF SCIENCE IN BUSINESS ADMINISTRATION MAJOR IN FINANCIAL MANAGEMENT": "BSBA FM",
  "BACHELOR OF SCIENCE IN BUSINESS ADMINISTRATION DIGITAL MARKETING MANAGEMENT": "BSBA DMM",
  "BACHELOR OF SCIENCE IN BUSINESS ADMINISTRATION MAJOR IN DIGITAL MARKETING MANAGEMENT": "BSBA DMM",
  "BACHELOR OF SCIENCE IN BUSINESS ADMINISTRATION OPERATIONS MANAGEMENT": "BSBA OM",
  "BACHELOR OF SCIENCE IN BUSINESS ADMINISTRATION MAJOR IN OPERATIONS MANAGEMENT": "BSBA OM",
  "BACHELOR OF SCIENCE IN BUSINESS ADMINISTRATION HUMAN RESOURCE MANAGEMENT": "BSBA HRM",
  "BACHELOR OF SCIENCE IN BUSINESS ADMINISTRATION MAJOR IN HUMAN RESOURCE MANAGEMENT": "BSBA HRM",
  "BACHELOR OF SCIENCE IN OFFICE ADMINISTRATION": "BSOA",
  "BACHELOR OF PUBLIC ADMINISTRATION": "BPA",
  "BACHELOR OF SCIENCE IN CUSTOMS ADMINISTRATION": "BSCA",
  "BACHELOR OF SCIENCE IN REAL ESTATE MANAGEMENT": "BSREM",
  "BS CPE": "BSCPE",
  "BS CP E": "BSCPE",
  "BS COMPUTER ENGINEERING": "BSCPE",
  "BACHELOR OF SCIENCE IN COMPUTER ENGINEERING": "BSCPE",
  "BACHELOR OF SCIENCE IN INDUSTRIAL ENGINEERING": "BSIE",
  "BACHELOR OF SCIENCE IN COMPUTER SCIENCE": "BSCS CS",
  "BACHELOR OF SCIENCE IN COMPUTER SCIENCE COMPUTER SCIENCE": "BSCS CS",
  "BACHELOR OF SCIENCE IN COMPUTER SCIENCE DATA SCIENCE": "BSCS DS",
  "BACHELOR OF SCIENCE IN COMPUTER SCIENCE MAJOR IN DATA SCIENCE": "BSCS DS",
  "BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY": "BSIT MWD",
  "BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY MOBILE AND WEB DEVELOPMENT": "BSIT MWD",
  "BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY MAJOR IN MOBILE AND WEB DEVELOPMENT": "BSIT MWD",
  "BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY MULTIMEDIA ARTS AND ANIMATION": "BSIT MAA",
  "BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY MAJOR IN MULTIMEDIA ARTS AND ANIMATION": "BSIT MAA",
  "BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY NETWORK AND SECURITY ADMINISTRATION": "BSIT NSA",
  "BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY MAJOR IN NETWORK AND SECURITY ADMINISTRATION": "BSIT NSA",
  "BACHELOR OF TECHNICAL VOCATIONAL TEACHER EDUCATION FOOD SERVICE MANAGEMENT": "BTVTE FSM",
  "BACHELOR OF TECHNICAL VOCATIONAL TEACHER EDUCATION HOTEL AND RESTAURANT SERVICES": "BTVTE HRS",
  "BACHELOR OF TECHNICAL VOCATIONAL TEACHER EDUCATION COMPUTER PROGRAMMING": "BTVTE CP",
  "BACHELOR OF TECHNICAL VOCATIONAL TEACHER EDUCATION ELECTRICAL TECHNOLOGY": "BTVTE ET",
  "BS CRIMINOLOGY": "BS CRIM",
  "BACHELOR OF SCIENCE IN CRIMINOLOGY": "BS CRIM",
  CRIM: "BS CRIM",
  TOURISM: "BSTM",
  "BACHELOR OF SCIENCE IN TOURISM MANAGEMENT": "BSTM",
  "BACHELOR OF SCIENCE IN SOCIAL WORK": "BSSW",
  "INFORMATION TECHNOLOGY": "IT",
  "NURSING AID": "NA",
  "NURSING AIDE": "NA",
  "ELECTRONICS INFORMATION TECHNOLOGY": "EIT",
  "ELECTRONICS RELATED 2 YEAR COURSE": "EIT",
  "BUSINESS MANAGEMENT": "BM",
  "HOSPITALITY RESTAURANT SERVICES": "HRS",
  "HOSPITALITY TOURISM RELATED 2 YEAR COURSE": "HRS",
  "CERTIFICATE IN PROFESSIONAL TEACHING PROGRAM": "CPTP",
  "CERTIFICATE OF PROFESSIONAL TEACHING PROGRAM": "CPTP",
  "PROFESSIONAL TEACHING PROGRAM": "CPTP",
};

export function normalizeProgramCode(value: string | null | undefined) {
  const normalized = (value || "")
    .toUpperCase()
    .replace(/[().,]+/g, " ")
    .replace(/[._]+/g, " ")
    .replace(/[\/\\\-–—]+/g, " ")
    .replace(/&/g, " AND ")
    .replace(/\s+/g, " ")
    .trim();

  return PROGRAM_ALIASES[normalized] || normalized;
}

export function normalizeStudentProgramValue(value: string | null | undefined) {
  const trimmed = (value || "").trim();
  if (!trimmed) return null;
  return getProgramInfo(trimmed)?.code || normalizeProgramCode(trimmed);
}

export function getProgramInfo(value: string | null | undefined): ProgramInfo | undefined {
  const normalized = normalizeProgramCode(value);
  if (!normalized) return undefined;

  const exact = PROGRAM_LOOKUP.get(normalized);
  if (exact) return exact;

  const compact = normalized.replace(/\s+/g, "");
  const compactMatch = PROGRAM_CATALOG.find((record) => record.code.replace(/\s+/g, "") === compact);
  if (compactMatch) return compactMatch;

  const tokens = new Set(normalized.split(" "));
  const tokenMatch = PROGRAM_CATALOG.find((record) => {
    const parts = record.code.split(" ");
    return parts.every((part) => tokens.has(part));
  });
  if (tokenMatch) return tokenMatch;

  if (tokens.has("INFORMATION") && tokens.has("TECHNOLOGY")) return PROGRAM_MAP["BSIT MWD"];
  if (tokens.has("COMPUTER") && tokens.has("ENGINEERING")) return PROGRAM_MAP.BSCPE;
  if (tokens.has("COMPUTER") && tokens.has("SCIENCE") && tokens.has("DATA")) return PROGRAM_MAP["BSCS DS"];
  if (tokens.has("COMPUTER") && tokens.has("SCIENCE")) return PROGRAM_MAP["BSCS CS"];
  if (tokens.has("ACCOUNTANCY")) return PROGRAM_MAP.BSA;
  if (tokens.has("CRIMINOLOGY")) return PROGRAM_MAP["BS CRIM"];
  if (tokens.has("TOURISM")) return PROGRAM_MAP.BSTM;
  if (tokens.has("NURSING") && (tokens.has("AID") || tokens.has("AIDE"))) return PROGRAM_MAP.NA;

  return undefined;
}

export function getProgramRecognitionAudit(
  rawProgram: string | null | undefined,
  filters?: ProgramFilters,
  matchResult?: boolean,
) {
  const info = getProgramInfo(rawProgram);
  return {
    raw: rawProgram || "",
    normalized: normalizeProgramCode(rawProgram),
    department: info?.department || "Unknown",
    program: info?.program || "Unknown",
    track: info?.track || "",
    filter: filters ? { ...filters } : undefined,
    match: matchResult ?? (filters ? programMatchesFilters(info, filters) : Boolean(info)),
    color: info?.color || PROGRAM_COLORS.UNKNOWN,
  };
}

export function isProgramRecognitionDebugEnabled() {
  const globalDebug = (globalThis as { __PROGRAM_RECOGNITION_DEBUG__?: boolean }).__PROGRAM_RECOGNITION_DEBUG__;
  if (globalDebug) return true;

  const maybeWindow = globalThis as { localStorage?: Storage };
  try {
    if (maybeWindow.localStorage?.getItem("programRecognitionDebug") === "1") return true;
  } catch {
    // Ignore storage access restrictions.
  }

  const maybeProcess = globalThis as { process?: { env?: Record<string, string | undefined> } };
  return maybeProcess.process?.env?.PROGRAM_RECOGNITION_DEBUG === "1";
}

export function logProgramRecognitionAudit(
  rawProgram: string | null | undefined,
  filters?: ProgramFilters,
  matchResult?: boolean,
) {
  if (!isProgramRecognitionDebugEnabled()) return;
  console.debug("[program-recognition]", getProgramRecognitionAudit(rawProgram, filters, matchResult));
}

export function getDepartmentColor(departmentOrProgram: string | null | undefined) {
  const programInfo = getProgramInfo(departmentOrProgram);
  if (programInfo) return programInfo.color;

  const normalized = normalizeProgramCode(departmentOrProgram);
  if (normalized === "COE") return PROGRAM_COLORS.COE;
  if (normalized === "CBA") return PROGRAM_COLORS.CBA;
  if (normalized === "CCS") return PROGRAM_COLORS.CCS;
  if (normalized === "COED") return PROGRAM_COLORS.COED;
  if (normalized === "TOURISM") return PROGRAM_COLORS.TOURISM;
  if (normalized === "COA") return PROGRAM_COLORS.COA;
  if (normalized === "TESDA") return PROGRAM_COLORS.TESDA;
  if (normalized === "NA") return PROGRAM_COLORS.NA;
  if (normalized === "EIT" || normalized === "IT") return PROGRAM_COLORS.EIT_IT;
  if (normalized === "STANDALONE") return PROGRAM_COLORS.STANDALONE;
  if (normalized === "CPTP" || normalized === "SPECIAL PROGRAM") return PROGRAM_COLORS.CPTP;
  return PROGRAM_COLORS.UNKNOWN;
}

export function getPinColorByProgram(value: string | null | undefined) {
  return getProgramInfo(value)?.color || getDepartmentColor(value);
}

export function getDominantDepartment(entries: ProgramDistributionEntry[]) {
  const totals = new Map<string, { department: string; departmentName: string; color: string; count: number }>();

  for (const entry of entries) {
    const department = entry.department || entry.college || "Unknown";
    const current = totals.get(department) || {
      department,
      departmentName: entry.departmentName || entry.collegeName || department,
      color: getDepartmentColor(department),
      count: 0,
    };
    totals.set(department, { ...current, count: current.count + entry.count });
  }

  return Array.from(totals.values()).sort((a, b) => b.count - a.count || a.department.localeCompare(b.department))[0];
}

export function getFilteredStudentCount(entries: ProgramDistributionEntry[], filters: ProgramFilters) {
  return entries
    .filter((entry) => distributionMatchesProgramFilters(entry, filters))
    .reduce((sum, entry) => sum + entry.count, 0);
}

export function getProgramDistribution(
  processedStudents: StudentProcessed[],
  filters: ProgramFilters = { college: ALL_PROGRAM_FILTER, program: ALL_PROGRAM_FILTER, track: ALL_PROGRAM_FILTER },
) {
  const distribution = new Map<string, ProgramDistributionEntry>();

  for (const student of processedStudents) {
    const info = getProgramInfo(student.course);
    const entry = toDistributionEntry(info);
    if (!distributionMatchesProgramFilters(entry, filters)) continue;
    const current = distribution.get(entry.code) || { ...entry, count: 0 };
    distribution.set(entry.code, { ...current, count: current.count + 1 });
  }

  return Array.from(distribution.values()).sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
}

export function buildSchoolProgramDistribution(
  schools: School[],
  processedStudents: StudentProcessed[],
  filters: ProgramFilters,
  isActiveStudent: (student: StudentProcessed) => boolean,
) {
  const distributionBySchool = new Map<number, Map<string, ProgramDistributionEntry>>();
  const filteredCountBySchool = new Map<number, number>();
  const totalCountBySchool = new Map<number, number>();
  const schoolByNormalizedName = new Map<string, School>();

  for (const school of schools) {
    const normalized = normalizeSchoolName(school.normalizedName || school.name);
    if (normalized && !schoolByNormalizedName.has(normalized)) {
      schoolByNormalizedName.set(normalized, school);
    }
  }

  for (const student of processedStudents.filter(isActiveStudent)) {
    const school = schoolByNormalizedName.get(normalizeSchoolName(student.lastSchoolName));
    if (!school) continue;

    totalCountBySchool.set(school.id, (totalCountBySchool.get(school.id) || 0) + 1);
    const info = getProgramInfo(student.course);
    const entry = toDistributionEntry(info);
    const matchesFilter = distributionMatchesProgramFilters(entry, filters);
    logProgramRecognitionAudit(student.course, filters, matchesFilter);
    if (!matchesFilter) continue;

    const schoolMap = distributionBySchool.get(school.id) || new Map<string, ProgramDistributionEntry>();
    const current = schoolMap.get(entry.code) || { ...entry, count: 0 };
    schoolMap.set(entry.code, { ...current, count: current.count + 1 });
    distributionBySchool.set(school.id, schoolMap);
    filteredCountBySchool.set(school.id, (filteredCountBySchool.get(school.id) || 0) + 1);
  }

  return { distributionBySchool, filteredCountBySchool, totalCountBySchool };
}

export function programMatchesFilters(info: ProgramInfo | undefined, filters: ProgramFilters) {
  if (!info) return !programFilterIsActive(filters);
  if (filters.college !== ALL_PROGRAM_FILTER && info.department !== filters.college) return false;
  if (filters.program !== ALL_PROGRAM_FILTER && info.program !== filters.program) return false;
  if (filters.track !== ALL_PROGRAM_FILTER && (info.track || "General") !== filters.track) return false;
  return true;
}

export function distributionMatchesProgramFilters(entry: ProgramDistributionEntry, filters: ProgramFilters) {
  if (filters.college !== ALL_PROGRAM_FILTER && (entry.department || entry.college) !== filters.college) return false;
  if (filters.program !== ALL_PROGRAM_FILTER && entry.program !== filters.program) return false;
  if (filters.track !== ALL_PROGRAM_FILTER && (entry.track || "General") !== filters.track) return false;
  return true;
}

export function programFilterIsActive(filters: ProgramFilters) {
  return filters.college !== ALL_PROGRAM_FILTER ||
    filters.program !== ALL_PROGRAM_FILTER ||
    filters.track !== ALL_PROGRAM_FILTER;
}

export function toDistributionEntry(info: ProgramInfo | undefined): ProgramDistributionEntry {
  if (!info) {
    return {
      code: "Unknown",
      college: "Unknown",
      collegeName: "Unknown",
      department: "Unknown",
      departmentName: "Unknown",
      program: "Unknown",
      track: "",
      color: PROGRAM_COLORS.UNKNOWN,
      count: 0,
    };
  }

  return {
    code: info.code,
    college: info.department,
    collegeName: info.departmentName,
    department: info.department,
    departmentName: info.departmentName,
    program: info.program,
    track: info.track,
    color: info.color,
    count: 0,
  };
}

function program(
  code: string,
  department: string,
  departmentName: string,
  programName: string,
  track: string,
  level: string,
  color: string,
  description?: string,
  note?: string,
): ProgramInfo {
  return { code, college: department, collegeName: departmentName, department, departmentName, program: programName, track, level, color, description, note };
}
