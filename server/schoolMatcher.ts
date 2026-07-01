import * as fs from "fs";
import { DIRECTORY_JSON_PATH, type MasterSchool } from "./syncMasterDirectory";

let masterDirectory: MasterSchool[] = [];

export function normalizeSchoolName(name: string): string {
  if (!name) return "";
  return name
    .toUpperCase()
    .replace(/[.,()'"-]/g, "") // remove punctuation
    .replace(/\s+/g, " ")       // replace multiple spaces with single space
    .trim();
}

export function loadMasterDirectory() {
  if (fs.existsSync(DIRECTORY_JSON_PATH)) {
    try {
      const raw = fs.readFileSync(DIRECTORY_JSON_PATH, "utf-8");
      masterDirectory = JSON.parse(raw);
      console.log(`[SchoolMatcher] Loaded ${masterDirectory.length} schools from JSON directory.`);
    } catch (e) {
      console.error("[SchoolMatcher] Failed to parse JSON directory:", e);
    }
  } else {
    console.warn(`[SchoolMatcher] Master directory JSON not found at ${DIRECTORY_JSON_PATH}. Please sync from Excel.`);
  }
}

export function reloadMasterDirectory(schools: MasterSchool[]) {
  masterDirectory = schools;
  console.log(`[SchoolMatcher] Reloaded ${masterDirectory.length} schools into memory.`);
}

export function getMasterDirectory() {
  return masterDirectory;
}

export function matchSchool(rawName: string): MasterSchool | null {
  if (!rawName) return null;
  const normalized = normalizeSchoolName(rawName);
  
  for (const school of masterDirectory) {
    const schoolNormalized = normalizeSchoolName(school.school_name);
    if (schoolNormalized === normalized) {
      return school;
    }
  }

  // Fallback subset matching
  for (const school of masterDirectory) {
    const schoolNormalized = normalizeSchoolName(school.school_name);
    if (schoolNormalized.length > 5 && normalized.includes(schoolNormalized)) {
      return school;
    }
    if (normalized.length > 5 && schoolNormalized.includes(normalized)) {
      return school;
    }
  }

  return null;
}
