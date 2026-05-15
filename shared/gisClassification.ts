export type AdmissionTypeLabel = "Freshman" | "Transferee";
export type AdmissionDisplayLabel = AdmissionTypeLabel | "—";

/** Parse student numbers like `26-28347` → year 2026, sequence 28347. */
export function parseStudentNumberTag(studentNumber: string): {
  enrollmentYear: number | null;
  sequenceNumber: number | null;
} {
  const m = studentNumber.trim().match(/^(\d{2})\s*-\s*(\d+)$/);
  if (!m) return { enrollmentYear: null, sequenceNumber: null };
  const yy = parseInt(m[1], 10);
  const seq = parseInt(m[2], 10);
  const enrollmentYear = 2000 + yy;
  return {
    enrollmentYear: Number.isFinite(enrollmentYear) ? enrollmentYear : null,
    sequenceNumber: Number.isFinite(seq) ? seq : null,
  };
}

/**
 * Senior High School → Freshman; College → Transferee.
 * Other school types do not classify.
 */
export function classifyAdmissionFromSchoolType(
  lastSchoolType: string | null | undefined,
): AdmissionTypeLabel | null {
  if (!lastSchoolType) return null;
  const t = lastSchoolType.trim().toLowerCase();
  if (t.includes("senior high") || t === "shs") return "Freshman";
  if (t.includes("college") || t.includes("university")) return "Transferee";
  return null;
}

/** Skip returnees, continuing students, and old students for GIS feeder mapping. */
export function isEligibleForGisMapping(studentType: string | null | undefined): boolean {
  if (!studentType?.trim()) return true;
  const t = studentType.trim().toLowerCase();
  if (t.includes("returnee")) return false;
  if (t.includes("continuing")) return false;
  if (t.includes("old student")) return false;
  return true;
}

export function inferLastSchoolTypeFromName(schoolName: string): string | null {
  const normalized = schoolName.toLowerCase();
  if (/\b(college|university|institute|academy)\b/.test(normalized)) return "College";
  if (/\b(senior high|national high|high school|shs|nhs)\b/.test(normalized)) return "Senior High School";
  return null;
}
