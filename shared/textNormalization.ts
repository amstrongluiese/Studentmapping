/**
 * Shared Typo, Lettering, Encoding & Filipino Phonetic Normalization Engine
 *
 * Designed for messy real-world Philippine school, barangay, municipality,
 * and academic program data from Google Sheets, Excel, and manual encoding.
 */

const MOJIBAKE_FIXES: Array<[RegExp, string]> = [
  [/Ã±/g, "n"],
  [/Ã‘/g, "N"],
  [/Ã¡/g, "a"],
  [/Ã©/g, "e"],
  [/Ã­/g, "i"],
  [/Ã³/g, "o"],
  [/Ãº/g, "u"],
  [/â€“|â€”|–|—/g, "-"],
  [/â€™|‘|’/g, "'"],
  [/â€œ|â€\u009d|“|”/g, '"'],
  // Corrupted Biñan encodings like "Bi?an" or "Bian"
  [/\bbi[?\uFFFD]an\b/gi, "binan"],
];

/**
 * Cleans broken UTF-8 mojibake, diacritics (Ñ -> N), glued dot prefixes
 * (e.g. "St.Ignatius" -> "St Ignatius", "Brgy.Langkiwa" -> "Brgy Langkiwa"),
 * and stray punctuation while preserving meaningful spaces.
 */
export function cleanRawText(input: string): string {
  if (!input) return "";
  let text = input;

  for (const [pattern, replacement] of MOJIBAKE_FIXES) {
    text = text.replace(pattern, replacement);
  }

  // Separate glued prefixes like "St.Ignatius", "Sta.Rosa", "Sto.Tomas", "Brgy.Langkiwa"
  text = text.replace(/\b(st|sta|sto|brgy|bgy|dr|gen|sr|jr|fr|mem|natl|elem|acad|inst|univ|coll)\.([a-zA-Z])/gi, "$1 $2");

  // Replace ampersand with " and "
  text = text.replace(/&/g, " and ");

  // Strip accents/diacritics (Biñan -> Binan, Peña -> Pena)
  text = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/gi, "n");

  // Normalize punctuation into spaces
  text = text
    .replace(/[.,\/#!$%\^*;:{}=\-_`~()'"?\[\]|\\+]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text;
}

/**
 * Produces a Filipino-aware phonetic skeleton for resilient typo matching.
 * Handles common Tagalog/Filipino vowel & consonant swaps:
 *  - e <-> i, o <-> u
 *  - c/qu <-> k, ph/f <-> p, v <-> b, z <-> s
 *  - collapses repeated characters ("Binnann" -> "binan", "Calambaa" -> "calamba")
 */
export function phPhoneticKey(input: string): string {
  const cleaned = cleanRawText(input).toLowerCase().replace(/\s+/g, "");
  if (!cleaned) return "";

  return cleaned
    .replace(/ph/g, "p")
    .replace(/qu/g, "k")
    .replace(/ck/g, "k")
    .replace(/c(?=[aouklrt]|$)/g, "k")
    .replace(/c(?=[eiy])/g, "s")
    .replace(/f/g, "p")
    .replace(/v/g, "b")
    .replace(/z/g, "s")
    .replace(/e/g, "i")
    .replace(/o/g, "u")
    .replace(/y/g, "i")
    .replace(/h/g, "")
    .replace(/(.)\1+/g, "$1");
}

/**
 * Optimal String Alignment (restricted Damerau-Levenshtein) distance.
 * Treats adjacent character transpositions (e.g. "Langkwia" <-> "Langkiwa",
 * "Ignatuis" <-> "Ignatius") as a single edit instead of two.
 */
export function damerauLevenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const alen = a.length;
  const blen = b.length;
  if (alen === 0) return blen;
  if (blen === 0) return alen;

  const dp: number[][] = Array.from({ length: alen + 1 }, () => new Array<number>(blen + 1).fill(0));

  for (let i = 0; i <= alen; i++) dp[i][0] = i;
  for (let j = 0; j <= blen; j++) dp[0][j] = j;

  for (let i = 1; i <= alen; i++) {
    for (let j = 1; j <= blen; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let val = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost, // substitution
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        val = Math.min(val, dp[i - 2][j - 2] + 1); // transposition
      }
      dp[i][j] = val;
    }
  }

  return dp[alen][blen];
}

/** Normalized Damerau-Levenshtein similarity in [0, 1] */
export function stringSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = damerauLevenshtein(a, b);
  return Math.max(0, 1 - dist / maxLen);
}

/**
 * Hybrid typo & word-order similarity score in [0, 1] combining:
 *  1. Direct normalized Damerau-Levenshtein similarity
 *  2. Token-by-token best-match similarity (handles reordered words & per-word typos)
 *  3. Filipino phonetic similarity (handles e/i, o/u, f/p, v/b, double-letter typos)
 */
export function computeTypoSimilarity(rawA: string, rawB: string): number {
  const a = cleanRawText(rawA).toLowerCase();
  const b = cleanRawText(rawB).toLowerCase();
  if (!a || !b) return 0;
  if (a === b) return 1;

  const directSim = stringSimilarity(a, b);

  // Token-level soft matching (handles reordered words & individual word typos)
  const tokensA = a.split(" ").filter((t) => t.length > 0);
  const tokensB = b.split(" ").filter((t) => t.length > 0);

  let tokenSim = 0;
  if (tokensA.length > 0 && tokensB.length > 0) {
    const scoreDir = (src: string[], dst: string[]) => {
      let sum = 0;
      for (const s of src) {
        let best = 0;
        for (const d of dst) {
          const sim = stringSimilarity(s, d);
          if (sim > best) best = sim;
          if (best === 1) break;
        }
        sum += best;
      }
      return sum / src.length;
    };
    tokenSim = (scoreDir(tokensA, tokensB) + scoreDir(tokensB, tokensA)) / 2;
  }

  const phonA = phPhoneticKey(a);
  const phonB = phPhoneticKey(b);
  const phoneticSim = phonA && phonB ? stringSimilarity(phonA, phonB) : 0;

  // Weighted blend favoring exact/token accuracy with strong phonetic typo recovery
  return Math.max(directSim, tokenSim * 0.72 + phoneticSim * 0.28, phoneticSim * 0.92);
}
