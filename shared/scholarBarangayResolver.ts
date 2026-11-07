/**
 * Scholar Barangay & Catchment Intelligence Resolver
 * 
 * Handles multi-field disambiguation for Trimex Colleges scholarship recipients,
 * extracting the true Barangay, Municipality, and Coordinates even when address
 * data was typed into inconsistent columns (e.g., student.municipality or iskolarNiKap).
 */

export interface ResolvedBarangayLocation {
  barangayName: string;
  municipality: string;
  province: string;
  latitude: number | null;
  longitude: number | null;
  key: string;
  isSpecialOrUnmapped?: boolean;
}

export interface MinimalScholarRecord {
  barangay?: string | null;
  municipality?: string | null;
  iskolarNiKap?: string | null;
  address?: string | null;
}

// Border catchment barangays on the Biñan-Cavite boundary frequently attended by Trimex students
export const BORDER_CATCHMENT_BARANGAYS = [
  {
    province: "Cavite",
    municipality: "Carmona",
    barangayName: "Cabilang Baybay",
    normalizedName: "cabilang baybay",
    latitude: 14.3090,
    longitude: 121.0494,
  },
  {
    province: "Cavite",
    municipality: "Carmona",
    barangayName: "Maduya",
    normalizedName: "maduya",
    latitude: 14.3195,
    longitude: 121.0543,
  },
];

// High-density primary feeder LGUs around Trimex Colleges campus in Biñan
const PRIORITY_CITIES = [
  "biñan",
  "binan",
  "santa rosa",
  "sta rosa",
  "san pedro",
  "carmona",
  "cabuyao",
  "calamba",
];

export function cleanBarangayText(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/ñ/g, "n")
    .replace(/Ñ/g, "n")
    .replace(/\bsto\b/g, "santo")
    .replace(/\bsto\./g, "santo")
    .replace(/\bsta\b/g, "santa")
    .replace(/\bsta\./g, "santa")
    .replace(/\bbrgy\b/g, "barangay")
    .replace(/\bbrgy\./g, "barangay")
    .replace(/\bbgy\b/g, "barangay")
    .replace(/\bbgy\./g, "barangay")
    .replace(/\bdelapaz\b/g, "de la paz")
    .replace(/\bdela paz\b/g, "de la paz")
    .replace(/\blangkwia\b/g, "langkiwa")
    .replace(/\bmlausak\b/g, "malusak")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Resolves a student's true residential Barangay from whatever field it was typed in,
 * cross-referencing against the PSGC Barangay Registry.
 */
export function resolveScholarBarangay(
  student: MinimalScholarRecord,
  dbBarangays: any[] = []
): ResolvedBarangayLocation | null {
  // Combine all database barangays plus border catchment (Carmona)
  const allBarangays = [...dbBarangays];
  for (const b of BORDER_CATCHMENT_BARANGAYS) {
    if (!allBarangays.some(existing => existing.barangayName?.toLowerCase() === b.barangayName.toLowerCase())) {
      allBarangays.push(b);
    }
  }

  const rawTokens = [
    student.barangay,
    student.municipality,
    student.iskolarNiKap,
    student.address,
  ].filter(Boolean);

  if (rawTokens.length === 0) return null;

  const combinedClean = ` ${cleanBarangayText(rawTokens.join(" "))} `;

  // Sort candidate barangays: Priority cities first (Biñan, Sta Rosa, San Pedro, Carmona),
  // then longer barangay names first to avoid partial substring clashes.
  const sortedDb = [...allBarangays].sort((a, b) => {
    const aMun = (a.municipality || "").toLowerCase();
    const bMun = (b.municipality || "").toLowerCase();
    const aPrio = PRIORITY_CITIES.some(c => aMun.includes(c)) ? 1 : 0;
    const bPrio = PRIORITY_CITIES.some(c => bMun.includes(c)) ? 1 : 0;

    if (aPrio !== bPrio) return bPrio - aPrio;
    return (b.barangayName?.length || 0) - (a.barangayName?.length || 0);
  });

  for (const b of sortedDb) {
    if (!b.barangayName) continue;
    const bClean = cleanBarangayText(b.barangayName);
    if (bClean.length < 3) continue;

    // Check whole-word boundary match
    if (combinedClean.includes(` ${bClean} `)) {
      const mun = b.municipality || "Laguna";
      const brgy = b.barangayName;
      return {
        barangayName: brgy,
        municipality: mun,
        province: b.province || "Laguna",
        latitude: b.latitude ? Number(b.latitude) : null,
        longitude: b.longitude ? Number(b.longitude) : null,
        key: `${mun.toLowerCase()}__${brgy.toLowerCase()}`,
      };
    }
  }

  return null;
}
