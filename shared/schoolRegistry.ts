import { cleanRawText } from "./textNormalization";

export const SCHOOL_STATUSES = [
  "Verified",
  "Auto-Located",
  "Needs Review",
  "Missing Coordinates",
  "Duplicate Entry",
] as const;

export type SchoolStatus = (typeof SCHOOL_STATUSES)[number];

const SCHOOL_ABBREVIATIONS: Array<[RegExp, string]> = [
  [/\bmnhs\b/g, "memorial national high school"],
  [/\bnhs\b/g, "national high school"],
  [/\bshs\b/g, "senior high school"],
  [/\bjhs\b/g, "junior high school"],
  [/\bces\b/g, "central elementary school"],
  [/\bhs\b/g, "high school"],
  [/\bes\b/g, "elementary school"],
  [/\bis\b/g, "integrated school"],
  [/\bmem\b/g, "memorial"],
  [/\bnatl\b/g, "national"],
  [/\binteg\b/g, "integrated"],
  [/\belem\b/g, "elementary"],
  [/\bsci\b/g, "science"],
  [/\buniv\b/g, "university"],
  [/\bcoll\b/g, "college"],
  [/\binst\b/g, "institute"],
  [/\bacad\b/g, "academy"],
  [/\btech voc\b/g, "technical vocational"],
  [/\btechvoc\b/g, "technical vocational"],
  [/\bst\b/g, "saint"],
  [/\bsta\b/g, "santa"],
  [/\bsto\b/g, "santo"],
  [/\bsr\b/g, "senior"],
  [/\bjr\b/g, "junior"],
  [/\bgen\b/g, "general"],
  [/\bdr\b/g, "doctor"],
  [/\bbrgy\b/g, "barangay"],
  [/\bbgy\b/g, "barangay"],
  // Common Roman numeral normalization for annexes/districts
  [/\bii\b/g, "2"],
  [/\biii\b/g, "3"],
  [/\biv\b/g, "4"],
];

export function normalizeSchoolName(name: string): string {
  if (!name) return "";

  let normalized = cleanRawText(name).toLowerCase();

  // Apply common school, title & DepEd abbreviations (after punctuation cleanup)
  for (const [regex, replacement] of SCHOOL_ABBREVIATIONS) {
    normalized = normalized.replace(regex, replacement);
  }

  // Fix common merged words, plurals, and frequent encoding typos
  normalized = normalized
    .replace(/\bhighschool\b/g, "high school")
    .replace(/\bhigschool\b/g, "high school")
    .replace(/\bhig school\b/g, "high school")
    .replace(/\bseniorhigh\b/g, "senior high")
    .replace(/\bsenoir\b/g, "senior")
    .replace(/\bnationalhigh\b/g, "national high")
    .replace(/\bnatoinal\b/g, "national")
    .replace(/\bcoleges?\b/g, "college")
    .replace(/\bcolleges\b/g, "college")
    .replace(/\buniverist(y|ies)\b/g, "university")
    .replace(/\bunivesit(y|ies)\b/g, "university")
    .replace(/\buniversities\b/g, "university")
    .replace(/\bacadmey\b/g, "academy")
    .replace(/\bacademies\b/g, "academy")
    .replace(/\binstitue\b/g, "institute")
    .replace(/\binstitutes\b/g, "institute")
    .replace(/\b(schol|skul|scool)s?\b/g, "school")
    .replace(/\bschools\b/g, "school")
    .replace(/\bdelapaz\b/g, "de la paz")
    .replace(/\bdela\b/g, "de la");

  // Remove generic stop words for a tighter canonical key
  normalized = normalized.replace(
    /\b(the|of|in|at|and|inc|incorporated|corp|corporation|campus|branch|academy|institute|university|college|school)\b/g,
    " ",
  );

  return normalized
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function hasCoordinates(record: {
  latitude?: number | null;
  longitude?: number | null;
}): record is { latitude: number; longitude: number } {
  return (
    typeof record.latitude === "number" &&
    Number.isFinite(record.latitude) &&
    typeof record.longitude === "number" &&
    Number.isFinite(record.longitude)
  );
}

export function getSchoolStatus(record: {
  status?: string | null;
  isActive?: boolean | null;
  latitude?: number | null;
  longitude?: number | null;
}): SchoolStatus {
  if (record.status && SCHOOL_STATUSES.includes(record.status as SchoolStatus)) {
    return record.status as SchoolStatus;
  }

  if (record.isActive && hasCoordinates(record)) return "Verified";
  if (hasCoordinates(record)) return "Needs Review";
  return "Missing Coordinates";
}

export function inferSchoolType(name: string): string {
  const upper = cleanRawText(name || "").toUpperCase();
  if (
    upper.includes("TESDA") ||
    upper.includes("ARTS AND TRADES") ||
    upper.includes("VOCATIONAL") ||
    upper.includes("POLYTECHNIC") ||
    upper.includes("TECH VOC") ||
    upper.includes("TECHVOC")
  ) {
    return "Technical-Vocational / TESDA";
  }
  if (
    upper.includes("NATIONAL HIGH") ||
    upper.includes("HIGH SCHOOL") ||
    /\b(NHS|SHS|MNHS)\b/.test(upper) ||
    upper.includes("SENIOR HIGH")
  ) {
    return "Public Senior High School";
  }
  if (
    upper.includes("COLLEGE") ||
    upper.includes("UNIVERSITY") ||
    upper.includes("UNIV") ||
    upper.includes("INSTITUTE") ||
    upper.includes("ACADEMY")
  ) {
    return "Higher Education / College";
  }
  if (upper.includes("ELEMENTARY") || upper.includes("ELEM") || upper.includes("CENTRAL")) {
    return "Elementary School";
  }
  return "Public School";
}
