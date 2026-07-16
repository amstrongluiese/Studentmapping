export const GEO_BOUNDS = {
  LAGUNA: {
    minLat: 13.78,
    maxLat: 14.58,
    minLng: 120.88,
    maxLng: 121.72
  }
} as const;

export const ACTIVE_ENROLLMENT_STATUSES = [
  "Active",
  "Enrolled",
  "Officially Enrolled",
  "OE",
  "NOE"
] as const;

/**
 * Checks if a given student status string represents an active/enrolled student.
 * Case-insensitive match. Defaults to treating null/undefined as "Active" 
 * to preserve backwards compatibility where a blank status implied they were enrolled.
 */
export function isStudentActive(status?: string | null): boolean {
  if (!status) return true;
  
  const normalized = status.trim().toLowerCase();
  return ACTIVE_ENROLLMENT_STATUSES.some(s => s.toLowerCase() === normalized);
}
