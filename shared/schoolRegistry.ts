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
  const compacted = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^\w\s.-]/g, " ")
    .replace(/\./g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return SCHOOL_ABBREVIATIONS.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    compacted,
  )
    .replace(/\s+/g, " ")
    .trim();
}

export function hasCoordinates(record: {
  lat?: number | null;
  lng?: number | null;
}): record is { lat: number; lng: number } {
  return (
    typeof record.lat === "number" &&
    Number.isFinite(record.lat) &&
    typeof record.lng === "number" &&
    Number.isFinite(record.lng)
  );
}

export function getSchoolStatus(record: {
  status?: string | null;
  verified?: boolean | null;
  lat?: number | null;
  lng?: number | null;
}): SchoolStatus {
  if (record.status && SCHOOL_STATUSES.includes(record.status as SchoolStatus)) {
    return record.status as SchoolStatus;
  }

  if (record.verified && hasCoordinates(record)) return "Verified";
  if (hasCoordinates(record)) return "Needs Review";
  return "Missing Coordinates";
}

