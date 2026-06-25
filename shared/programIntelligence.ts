import type { School, StudentProcessed } from "./schema";

export const ALL_PROGRAM_FILTER = "all";
export const ACTIVE_GIS_STUDENT_STATUSES = new Set(["Active", "Enrolled"]);

export interface ProgramRecord {
  code: string;
  college: string;
  collegeName: string;
  program: string;
  track: string;
  level: string;
  color: string;
  description?: string;
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
  program: string;
  track: string;
  color: string;
  count: number;
}

export type ProgramSchool = School & {
  totalStudentCount: number;
  filteredStudentCount: number;
  dominantProgram?: ProgramDistributionEntry;
  programDistribution: ProgramDistributionEntry[];
};

export interface ProgramAnalytics {
  totalStudents: number;
  totalSchools: number;
  topFeederSchool?: ProgramSchool;
  topMunicipality?: { name: string; count: number };
  programDistribution: ProgramDistributionEntry[];
  trackDistribution: Array<{ track: string; count: number }>;
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
  UNKNOWN: "#cbd5e1",
} as const;

const PROGRAMS: ProgramRecord[] = [
  program("ABPSY", "Standalone", "Standalone Programs", "ABPSY", "", "Bachelor", PROGRAM_COLORS.STANDALONE),
  program("BSREM", "Standalone", "Standalone Programs", "BSREM", "", "Bachelor", PROGRAM_COLORS.STANDALONE),
  program("BS CRIM", "Standalone", "Standalone Programs", "BS CRIM", "", "Bachelor", PROGRAM_COLORS.STANDALONE),
  program("BSTM", "Tourism", "Tourism / Hospitality", "BSTM", "", "Bachelor", PROGRAM_COLORS.TOURISM),
  program("BSSW", "Standalone", "Standalone Programs", "BSSW", "", "Bachelor", PROGRAM_COLORS.STANDALONE),
  program("BSA", "COA", "College of Accountancy", "BSA", "", "Bachelor", PROGRAM_COLORS.COA),
  program("BSBA FM", "CBA", "College of Business Administration", "BSBA", "FM", "Bachelor", PROGRAM_COLORS.CBA),
  program("BSBA DMM", "CBA", "College of Business Administration", "BSBA", "DMM", "Bachelor", PROGRAM_COLORS.CBA),
  program("BSBA OM", "CBA", "College of Business Administration", "BSBA", "OM", "Bachelor", PROGRAM_COLORS.CBA),
  program("BSBA HRM", "CBA", "College of Business Administration", "BSBA", "HRM", "Bachelor", PROGRAM_COLORS.CBA),
  program("BSOA", "CBA", "College of Business Administration", "BSOA", "", "Bachelor", PROGRAM_COLORS.CBA),
  program("BPA", "CBA", "College of Business Administration", "BPA", "", "Bachelor", PROGRAM_COLORS.CBA),
  program("BSCA", "CBA", "College of Business Administration", "BSCA", "", "Bachelor", PROGRAM_COLORS.CBA),
  program("BSCPE", "COE", "College of Engineering", "BSCPE", "", "Bachelor", PROGRAM_COLORS.COE),
  program("BSIE", "COE", "College of Engineering", "BSIE", "", "Bachelor", PROGRAM_COLORS.COE),
  program("BSCS CS", "CCS", "College of Computer Studies", "BSCS", "CS", "Bachelor", PROGRAM_COLORS.CCS),
  program("BSCS DS", "CCS", "College of Computer Studies", "BSCS", "DS", "Bachelor", PROGRAM_COLORS.CCS),
  program("BSIT MWD", "CCS", "College of Computer Studies", "BSIT", "MWD", "Bachelor", PROGRAM_COLORS.CCS),
  program("BSIT MAA", "CCS", "College of Computer Studies", "BSIT", "MAA", "Bachelor", PROGRAM_COLORS.CCS),
  program("BSIT NSA", "CCS", "College of Computer Studies", "BSIT", "NSA", "Bachelor", PROGRAM_COLORS.CCS),
  program("BTVTE FSM", "COEd", "College of Education", "BTVTE", "FSM", "Bachelor", PROGRAM_COLORS.COED),
  program("BTVTE HRS", "COEd", "College of Education", "BTVTE", "HRS", "Bachelor", PROGRAM_COLORS.COED),
  program("BTVTE CP", "COEd", "College of Education", "BTVTE", "CP", "Bachelor", PROGRAM_COLORS.COED),
  program("BTVTE ET", "COEd", "College of Education", "BTVTE", "ET", "Bachelor", PROGRAM_COLORS.COED),
  program("IT", "TESDA", "TESDA 2-Year Courses", "IT", "", "2-Year", PROGRAM_COLORS.EIT_IT),
  program("NA", "TESDA", "TESDA 2-Year Courses", "NA", "", "2-Year", PROGRAM_COLORS.NA, "Nursing Aid"),
  program("EIT", "TESDA", "TESDA 2-Year Courses", "EIT", "", "2-Year", PROGRAM_COLORS.EIT_IT, "Electronics-related 2-year course"),
  program("BM", "TESDA", "TESDA 2-Year Courses", "BM", "", "2-Year", PROGRAM_COLORS.TESDA, "Business Management 2-year course"),
  program("HRS", "TESDA", "TESDA 2-Year Courses", "HRS", "", "2-Year", PROGRAM_COLORS.TESDA, "TESDA Hospitality/Tourism-related 2-year course"),
  program("CPTP", "Special", "Special Program", "CPTP", "", "Certificate", PROGRAM_COLORS.STANDALONE, "21-unit education program for LPT exam eligibility"),
];

export const PROGRAM_CATALOG = PROGRAMS;

const PROGRAM_LOOKUP = new Map(PROGRAMS.map((record) => [normalizeProgramCode(record.code), record]));

export function normalizeProgramCode(value: string | null | undefined) {
  return (value || "")
    .toUpperCase()
    .replace(/\./g, "")
    .replace(/[\/\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function recognizeProgram(value: string | null | undefined): ProgramRecord | undefined {
  const normalized = normalizeProgramCode(value);
  if (!normalized) return undefined;
  const exact = PROGRAM_LOOKUP.get(normalized);
  if (exact) return exact;

  const tokens = new Set(normalized.split(" "));
  return PROGRAMS.find((record) => {
    const parts = normalizeProgramCode(record.code).split(" ");
    return parts.every((part) => tokens.has(part));
  });
}

export function programFilterIsActive(filters: ProgramFilters) {
  return filters.college !== ALL_PROGRAM_FILTER ||
    filters.program !== ALL_PROGRAM_FILTER ||
    filters.track !== ALL_PROGRAM_FILTER;
}

export function programMatchesFilters(record: ProgramRecord | undefined, filters: ProgramFilters) {
  if (!record) return !programFilterIsActive(filters);
  if (filters.college !== ALL_PROGRAM_FILTER && record.college !== filters.college) return false;
  if (filters.program !== ALL_PROGRAM_FILTER && record.program !== filters.program) return false;
  if (filters.track !== ALL_PROGRAM_FILTER && (record.track || "General") !== filters.track) return false;
  return true;
}

export function isStudentActiveForProgramGis(student: Pick<StudentProcessed, "enrollmentStatus">) {
  return ACTIVE_GIS_STUDENT_STATUSES.has(student.enrollmentStatus || "Active");
}

export function getProgramOptions(processedStudents: StudentProcessed[]) {
  const records = processedStudents.map((student) => recognizeProgram(student.course)).filter(Boolean) as ProgramRecord[];
  const catalog = records.length ? records : PROGRAM_CATALOG;
  return {
    colleges: uniqueBy(catalog, (record) => record.college).map(({ college, collegeName }) => ({ value: college, label: collegeName })),
    programs: uniqueBy(catalog, (record) => record.program).map(({ program }) => ({ value: program, label: program })),
    tracks: uniqueBy(catalog, (record) => record.track || "General").map((record) => {
      const track = record.track || "General";
      return { value: track, label: track };
    }),
  };
}

export function buildProgramSchools(
  schools: School[],
  processedStudents: StudentProcessed[],
  filters: ProgramFilters,
): ProgramSchool[] {
  const distributionBySchool = new Map<number, Map<string, ProgramDistributionEntry>>();
  const filteredCountBySchool = new Map<number, number>();
  const hasProcessedRowsBySchool = new Set<number>();

  for (const student of processedStudents) {
    if (!isStudentActiveForProgramGis(student)) continue;
    if (!student.schoolId) continue;
    hasProcessedRowsBySchool.add(student.schoolId);
    const record = recognizeProgram(student.course);
    const entry = toDistributionEntry(record);
    const schoolMap = distributionBySchool.get(student.schoolId) || new Map<string, ProgramDistributionEntry>();
    const current = schoolMap.get(entry.code) || { ...entry, count: 0 };
    schoolMap.set(entry.code, { ...current, count: current.count + 1 });
    distributionBySchool.set(student.schoolId, schoolMap);
    if (programMatchesFilters(record, filters)) {
      filteredCountBySchool.set(student.schoolId, (filteredCountBySchool.get(student.schoolId) || 0) + 1);
    }
  }

  return schools
    .map((school) => {
      const programDistribution = Array.from(distributionBySchool.get(school.id)?.values() || [])
        .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
      const fallbackCount = programFilterIsActive(filters) ? 0 : school.studentCount;
      const filteredStudentCount = hasProcessedRowsBySchool.has(school.id)
        ? filteredCountBySchool.get(school.id) || 0
        : fallbackCount;
      return {
        ...school,
        totalStudentCount: school.studentCount,
        studentCount: filteredStudentCount,
        filteredStudentCount,
        dominantProgram: programDistribution[0],
        programDistribution,
      };
    })
    .filter((school) => !programFilterIsActive(filters) || school.filteredStudentCount > 0);
}

export function buildProgramAnalytics(
  schools: ProgramSchool[],
  filters: ProgramFilters = {
    college: ALL_PROGRAM_FILTER,
    program: ALL_PROGRAM_FILTER,
    track: ALL_PROGRAM_FILTER,
  },
): ProgramAnalytics {
  const programMap = new Map<string, ProgramDistributionEntry>();
  const municipalityMap = new Map<string, number>();
  const trackMap = new Map<string, number>();

  for (const school of schools) {
    municipalityMap.set(school.municipality || "Unspecified", (municipalityMap.get(school.municipality || "Unspecified") || 0) + school.filteredStudentCount);
    for (const entry of school.programDistribution.filter((item) => distributionMatchesFilters(item, filters))) {
      const current = programMap.get(entry.code) || { ...entry, count: 0 };
      programMap.set(entry.code, { ...current, count: current.count + entry.count });
      const track = entry.track || "General";
      trackMap.set(track, (trackMap.get(track) || 0) + entry.count);
    }
  }

  return {
    totalStudents: schools.reduce((sum, school) => sum + school.filteredStudentCount, 0),
    totalSchools: schools.length,
    topFeederSchool: schools.slice().sort((a, b) => b.filteredStudentCount - a.filteredStudentCount)[0],
    topMunicipality: Array.from(municipalityMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)[0],
    programDistribution: Array.from(programMap.values()).sort((a, b) => b.count - a.count),
    trackDistribution: Array.from(trackMap.entries()).map(([track, count]) => ({ track, count })).sort((a, b) => b.count - a.count),
  };
}

export function distributionMatchesFilters(entry: ProgramDistributionEntry, filters: ProgramFilters) {
  if (filters.college !== ALL_PROGRAM_FILTER && entry.college !== filters.college) return false;
  if (filters.program !== ALL_PROGRAM_FILTER && entry.program !== filters.program) return false;
  if (filters.track !== ALL_PROGRAM_FILTER && (entry.track || "General") !== filters.track) return false;
  return true;
}

function program(
  code: string,
  college: string,
  collegeName: string,
  programName: string,
  track: string,
  level: string,
  color: string,
  description?: string,
): ProgramRecord {
  return { code, college, collegeName, program: programName, track, level, color, description };
}

function toDistributionEntry(record: ProgramRecord | undefined): ProgramDistributionEntry {
  if (!record) {
    return {
      code: "Unknown",
      college: "Unknown",
      collegeName: "Unknown",
      program: "Unknown",
      track: "",
      color: PROGRAM_COLORS.UNKNOWN,
      count: 0,
    };
  }
  return {
    code: record.code,
    college: record.college,
    collegeName: record.collegeName,
    program: record.program,
    track: record.track,
    color: record.color,
    count: 0,
  };
}

function uniqueBy<T>(items: T[], getKey: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
