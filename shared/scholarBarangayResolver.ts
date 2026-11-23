import { cleanRawText, damerauLevenshtein, phPhoneticKey, stringSimilarity } from "./textNormalization";

/**
 * Scholar Barangay & Catchment Intelligence Resolver
 *
 * Handles multi-field disambiguation and typo-tolerant matching for Trimex Colleges
 * scholarship recipients, extracting the true Barangay, Municipality, and Coordinates
 * even with misspellings, accents, abbreviations, or glued words.
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
  return cleanRawText(str)
    .toLowerCase()
    .replace(/\bsto\b/g, "santo")
    .replace(/\bsta\b/g, "santa")
    .replace(/\bst\b/g, "saint")
    .replace(/\bbrgy\b/g, "barangay")
    .replace(/\bbgy\b/g, "barangay")
    .replace(/\bdelapaz\b/g, "de la paz")
    .replace(/\bdela\s+paz\b/g, "de la paz")
    .replace(/\blangkwia\b/g, "langkiwa")
    .replace(/\bmlausak\b/g, "malusak")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Resolves a student's true residential Barangay from whatever field it was typed in,
 * cross-referencing against the PSGC Barangay Registry with 2-tier matching:
 *  - Tier 1: Exact normalized whole-word boundary match (highest precision)
 *  - Tier 2: Typo & Filipino phonetic n-gram fuzzy match (Damerau-Levenshtein + phonetic key)
 */
export function resolveScholarBarangay(
  student: MinimalScholarRecord,
  dbBarangays: any[] = [],
): ResolvedBarangayLocation | null {
  const allBarangays = [...dbBarangays];
  for (const b of BORDER_CATCHMENT_BARANGAYS) {
    if (!allBarangays.some((existing) => existing.barangayName?.toLowerCase() === b.barangayName.toLowerCase())) {
      allBarangays.push(b);
    }
  }

  const rawTokens = [
    student.barangay,
    student.municipality,
    student.iskolarNiKap,
    student.address,
  ].filter(Boolean) as string[];

  if (rawTokens.length === 0) return null;

  const cleanedCombined = cleanBarangayText(rawTokens.join(" "));
  const combinedPadded = ` ${cleanedCombined} `;

  // Sort candidate barangays: Priority cities first, then longer barangay names first
  const sortedDb = [...allBarangays].sort((a, b) => {
    const aMun = (a.municipality || "").toLowerCase();
    const bMun = (b.municipality || "").toLowerCase();
    const aPrio = PRIORITY_CITIES.some((c) => aMun.includes(c)) ? 1 : 0;
    const bPrio = PRIORITY_CITIES.some((c) => bMun.includes(c)) ? 1 : 0;

    if (aPrio !== bPrio) return bPrio - aPrio;
    return (b.barangayName?.length || 0) - (a.barangayName?.length || 0);
  });

  // Tier 1: Exact normalized boundary match
  for (const b of sortedDb) {
    if (!b.barangayName) continue;
    const bClean = cleanBarangayText(b.barangayName);
    if (bClean.length < 3) continue;

    if (combinedPadded.includes(` ${bClean} `)) {
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

  // Tier 2: Typo-tolerant & Filipino phonetic fuzzy match over word n-grams
  const words = cleanedCombined.split(" ").filter((w) => w.length >= 2 && w !== "barangay");
  if (words.length === 0) return null;

  // Build candidate 1-, 2-, and 3-word windows from the student's address/barangay text
  const ngrams: string[] = [];
  for (let i = 0; i < words.length; i++) {
    ngrams.push(words[i]);
    if (i + 1 < words.length) ngrams.push(`${words[i]} ${words[i + 1]}`);
    if (i + 2 < words.length) ngrams.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }

  let bestMatch: { barangay: any; score: number; prio: number } | null = null;

  for (const b of sortedDb) {
    if (!b.barangayName) continue;
    const bClean = cleanBarangayText(b.barangayName);
    if (bClean.length < 4) continue; // Avoid fuzzy false positives on ultra-short 2-3 char names

    const bPhon = phPhoneticKey(bClean);
    const bWordCount = bClean.split(" ").length;
    const aMun = (b.municipality || "").toLowerCase();
    const prio = PRIORITY_CITIES.some((c) => aMun.includes(c)) ? 1 : 0;

    for (const gram of ngrams) {
      if (gram.length < 4) continue;
      // Only compare windows with similar word count (within +-1)
      const gramWords = gram.split(" ").length;
      if (Math.abs(gramWords - bWordCount) > 1) continue;

      const dist = damerauLevenshtein(gram, bClean);
      const sim = stringSimilarity(gram, bClean);
      const phonSim = bPhon && phPhoneticKey(gram) ? stringSimilarity(phPhoneticKey(gram), bPhon) : 0;

      // Require high confidence: either <=1-2 edits with >=0.82 similarity, or exact phonetic match with >=0.75 string sim
      const effectiveScore =
        phonSim === 1 && sim >= 0.72
          ? Math.max(sim, 0.92)
          : Math.max(sim, sim * 0.65 + phonSim * 0.35);

      const allowedMaxEdits = bClean.length <= 6 ? 1 : 2;
      const isSafeMatch = (dist <= allowedMaxEdits && effectiveScore >= 0.8) || effectiveScore >= 0.88;

      if (isSafeMatch) {
        const scoreWithPrio = effectiveScore + prio * 0.03;
        if (!bestMatch || scoreWithPrio > bestMatch.score) {
          bestMatch = { barangay: b, score: scoreWithPrio, prio };
        }
      }
    }
  }

  if (bestMatch) {
    const b = bestMatch.barangay;
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

  return null;
}
