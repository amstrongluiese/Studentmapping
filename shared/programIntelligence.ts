import type { SchoolRegistry, StudentProcessed } from "./schema";
import {
  ALL_PROGRAM_FILTER,
  PROGRAM_CATALOG,
  PROGRAM_COLORS,
  buildSchoolProgramDistribution,
  distributionMatchesProgramFilters,
  getDominantDepartment,
  getFilteredStudentCount,
  getProgramInfo,
  normalizeStudentProgramValue,
  normalizeProgramCode,
  programFilterIsActive,
  programMatchesFilters,
  type ProgramDistributionEntry,
  type ProgramFilters,
  type ProgramInfo,
} from "./programRecognition";

export {
  ALL_PROGRAM_FILTER,
  PROGRAM_CATALOG,
  getFullCatalog,
  setDynamicCatalog,
  getDepartmentColor,
  getDominantDepartment,
  getFilteredStudentCount,
  getPinColorByProgram,
  getProgramDistribution,
  getProgramInfo,
  normalizeStudentProgramValue,
  normalizeProgramCode,
  programFilterIsActive,
  programMatchesFilters,
  type ProgramDistributionEntry,
  type ProgramFilters,
  type ProgramInfo,
} from "./programRecognition";

export const ACTIVE_GIS_STUDENT_STATUSES = new Set(["Active", "Enrolled", "Officially Enrolled", "OE"]);

export type ProgramRecord = ProgramInfo;

export type ProgramSchoolRegistry = SchoolRegistry & {
  totalStudentCount: number;
  filteredStudentCount: number;
  dominantProgram?: ProgramDistributionEntry;
  dominantDepartment?: ReturnType<typeof getDominantDepartment>;
  programDistribution: ProgramDistributionEntry[];
};

export interface ProgramAnalytics {
  totalStudents: number;
  totalSchools: number;
  topFeederSchoolRegistry?: ProgramSchoolRegistry;
  topMunicipality?: { name: string; count: number };
  programDistribution: ProgramDistributionEntry[];
  departmentDistribution: Array<{ department: string; departmentName: string; color: string; count: number }>;
  trackDistribution: Array<{ track: string; count: number }>;
}

export function recognizeProgram(value: string | null | undefined): ProgramRecord | undefined {
  return getProgramInfo(value);
}

export function distributionMatchesFilters(entry: ProgramDistributionEntry, filters: ProgramFilters) {
  return distributionMatchesProgramFilters(entry, filters);
}

export function isStudentActiveForProgramGis(student: Pick<StudentProcessed, "enrollmentStatus">) {
  return ACTIVE_GIS_STUDENT_STATUSES.has(student.enrollmentStatus || "Active");
}

export function getProgramOptions(processedStudents: StudentProcessed[]) {
  const records = processedStudents.map((student) => recognizeProgram(student.course)).filter(Boolean) as ProgramRecord[];
  const catalog = [...PROGRAM_CATALOG, ...records];
  return {
    colleges: uniqueBy(catalog, (record) => record.department)
      .map(({ department, departmentName }) => ({ value: department, label: departmentName })),
    programs: uniqueBy(catalog, (record) => record.program)
      .map(({ program }) => ({ value: program, label: program })),
    tracks: uniqueBy(catalog, (record) => record.track || "General").map((record) => {
      const track = record.track || "General";
      return { value: track, label: track };
    }),
  };
}

export function buildProgramSchools(
  schools: SchoolRegistry[],
  processedStudents: StudentProcessed[],
  filters: ProgramFilters,
): ProgramSchoolRegistry[] {
  const {
    distributionBySchoolRegistry,
    filteredCountBySchoolRegistry,
    totalCountBySchoolRegistry,
  } = buildSchoolProgramDistribution(
    schools,
    processedStudents,
    filters,
    (student) => isStudentActiveForProgramGis(student),
  );

  return schools
    .map((school) => {
      const programDistribution = Array.from(distributionBySchoolRegistry.get(school.id)?.values() || [])
        .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
      const filteredStudentCount = getFilteredStudentCount(programDistribution, filters) || filteredCountBySchoolRegistry.get(school.id) || 0;
      const totalStudentCount = totalCountBySchoolRegistry.get(school.id) || 0;
      const dominantDepartment = getDominantDepartment(programDistribution);
      return {
        ...school,
        totalStudentCount,
        studentCount: filteredStudentCount,
        filteredStudentCount,
        dominantProgram: programDistribution[0],
        dominantDepartment,
        programDistribution,
      };
    })
    .filter((school) => school.filteredStudentCount > 0);
}

export function buildProgramAnalytics(
  schools: ProgramSchoolRegistry[],
  filters: ProgramFilters = {
    college: ALL_PROGRAM_FILTER,
    program: ALL_PROGRAM_FILTER,
    track: ALL_PROGRAM_FILTER,
  },
): ProgramAnalytics {
  const programMap = new Map<string, ProgramDistributionEntry>();
  const departmentMap = new Map<string, { department: string; departmentName: string; color: string; count: number }>();
  const municipalityMap = new Map<string, number>();
  const trackMap = new Map<string, number>();

  for (const school of schools) {
    municipalityMap.set(school.municipality || "Unspecified", (municipalityMap.get(school.municipality || "Unspecified") || 0) + school.filteredStudentCount);
    for (const entry of school.programDistribution.filter((item) => distributionMatchesFilters(item, filters))) {
      const currentProgram = programMap.get(entry.code) || { ...entry, count: 0 };
      programMap.set(entry.code, { ...currentProgram, count: currentProgram.count + entry.count });

      const department = entry.department || entry.college || "Unknown";
      const currentDepartment = departmentMap.get(department) || {
        department,
        departmentName: entry.departmentName || entry.collegeName || department,
        color: entry.color,
        count: 0,
      };
      departmentMap.set(department, { ...currentDepartment, count: currentDepartment.count + entry.count });

      const track = entry.track || "General";
      trackMap.set(track, (trackMap.get(track) || 0) + entry.count);
    }
  }

  return {
    totalStudents: schools.reduce((sum, school) => sum + school.filteredStudentCount, 0),
    totalSchools: schools.length,
    topFeederSchoolRegistry: schools.slice().sort((a, b) => b.filteredStudentCount - a.filteredStudentCount)[0],
    topMunicipality: Array.from(municipalityMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)[0],
    programDistribution: Array.from(programMap.values()).sort((a, b) => b.count - a.count),
    departmentDistribution: Array.from(departmentMap.values()).sort((a, b) => b.count - a.count),
    trackDistribution: Array.from(trackMap.entries()).map(([track, count]) => ({ track, count })).sort((a, b) => b.count - a.count),
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
