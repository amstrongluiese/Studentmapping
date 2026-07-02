export const SCHOOL_STATUSES = [
  "Verified",
  "Auto-Located",
  "Needs Review",
  "Missing Coordinates",
  "Duplicate Entry",
] as const;

export type SchoolStatus = (typeof SCHOOL_STATUSES)[number];

const SCHOOL_ABBREVIATIONS: Array<[RegExp, string]> = [
  [/\bnhs\b/g, "national high school"],
  [/\bshs\b/g, "senior high school"],
  [/\bjhs\b/g, "junior high school"],
  [/\bhs\b/g, "high school"],
  [/\bes\b/g, "elementary school"],
  [/\bmem\.\b/g, "memorial"],
  [/\bmemorial natl\b/g, "memorial national"],
  [/\bnatl\b/g, "national"],
  [/\binteg\b/g, "integrated"],
  [/\buniv\b/g, "university"],
  [/\bcoll\b/g, "college"],
  [/\btech voc\b/g, "technical vocational"],
  [/\btech-voc\b/g, "technical vocational"],
];

export function normalizeSchoolName(name: string): string {
  if (!name) return "";
  
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "") // remove punctuation
    .toUpperCase()
    .replace(/\s+/g, " ") // remove duplicate spaces
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

