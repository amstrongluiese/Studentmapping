import { normalizeSchoolName } from "@shared/schoolRegistry";
import type { SchoolRegistry } from "@shared/schema";

export function matchSchool(rawName: string, schools: SchoolRegistry[]): SchoolRegistry | null {
  if (!rawName) return null;
  const normalized = normalizeSchoolName(rawName);
  
  for (const school of schools) {
    const schoolNormalized = normalizeSchoolName(school.normalizedSchoolName || school.schoolName);
    if (schoolNormalized === normalized) {
      return school;
    }
  }

  // Fallback subset matching
  for (const school of schools) {
    const schoolNormalized = normalizeSchoolName(school.normalizedSchoolName || school.schoolName);
    if (schoolNormalized.length > 5 && normalized.includes(schoolNormalized)) {
      return school;
    }
    if (normalized.length > 5 && schoolNormalized.includes(normalized)) {
      return school;
    }
  }

  return null;
}
