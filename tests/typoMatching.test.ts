import assert from "node:assert/strict";
import { cleanRawText, computeTypoSimilarity, phPhoneticKey } from "../shared/textNormalization";
import { normalizeSchoolName } from "../shared/schoolRegistry";
import { resolveScholarBarangay } from "../shared/scholarBarangayResolver";
import { getProgramInfo } from "../shared/programRecognition";
import { SchoolMatchingEngine } from "../server/schoolMatcher";

async function runTypoTests() {
  // 1. Mojibake, diacritics & glued prefix cleanup
  assert.equal(cleanRawText("BiÃ±an City"), "Binan City");
  assert.equal(cleanRawText("St.Ignatius Inst. & Arts"), "St Ignatius Inst and Arts");
  assert.equal(cleanRawText("Brgy.Langkiwa, Sta.Rosa"), "Brgy Langkiwa Sta Rosa");
  assert.equal(phPhoneticKey("Calambaa"), phPhoneticKey("Kalamba"));
  assert.equal(phPhoneticKey("Langkewa"), phPhoneticKey("Langkiwa"));
  console.log("PASS [1/4]: Mojibake, glued prefixes, and Filipino phonetic normalization verified");

  // 2. School name normalization & typo matching
  assert.equal(
    normalizeSchoolName("St.Ignatius Inst. of Business & Arts Inc."),
    normalizeSchoolName("Saint Ignatius Institute of Business and Arts"),
  );
  assert.equal(
    normalizeSchoolName("BiÃ±an City SHS - San Antonio Campus"),
    normalizeSchoolName("Binan City Senior High School San Antonio"),
  );

  const mockSchools: any[] = [
    { id: 1, schoolName: "St. Ignatius Institute of Business and Arts", normalizedSchoolName: null, municipality: "Biñan", province: "Laguna" },
    { id: 2, schoolName: "Biñan City Senior High School - San Antonio Campus", normalizedSchoolName: null, municipality: "Biñan", province: "Laguna" },
    { id: 3, schoolName: "Trimex Colleges", normalizedSchoolName: null, municipality: "Biñan", province: "Laguna" },
    { id: 4, schoolName: "Calamba City Senior High School", normalizedSchoolName: null, municipality: "Calamba", province: "Laguna" },
  ];
  const matcher = new SchoolMatchingEngine(mockSchools, []);

  assert.equal(matcher.match("St.Ignatuis Inst of Busines & Arts").school?.id, 1);
  assert.equal(matcher.match("BiÃ±an City SHS San Antonio").school?.id, 2);
  assert.equal(matcher.match("Trimx Coleges").school?.id, 3);
  assert.equal(matcher.match("Calmba City SHS").school?.id, 4);
  assert.ok(computeTypoSimilarity("Langkwia", "Langkiwa") >= 0.85);
  console.log("PASS [2/4]: School typo, mojibake, and abbreviation matching verified");

  // 3. Barangay typo & phonetic resolution
  const mockBarangays = [
    { province: "Laguna", municipality: "Biñan", barangayName: "Langkiwa", latitude: 14.302, longitude: 121.062 },
    { province: "Laguna", municipality: "Biñan", barangayName: "Malusak", latitude: 14.337, longitude: 121.084 },
    { province: "Laguna", municipality: "Biñan", barangayName: "Santo Tomas", latitude: 14.316, longitude: 121.073 },
    { province: "Laguna", municipality: "Biñan", barangayName: "De La Paz", latitude: 14.342, longitude: 121.095 },
    { province: "Laguna", municipality: "Biñan", barangayName: "Canlalay", latitude: 14.347, longitude: 121.074 },
  ];

  assert.equal(resolveScholarBarangay({ address: "Brgy.Lankiwa Binan" }, mockBarangays)?.barangayName, "Langkiwa");
  assert.equal(resolveScholarBarangay({ address: "Langkewa, BiÃ±an" }, mockBarangays)?.barangayName, "Langkiwa");
  assert.equal(resolveScholarBarangay({ iskolarNiKap: "Malosak" }, mockBarangays)?.barangayName, "Malusak");
  assert.equal(resolveScholarBarangay({ address: "Sto.Tmas, Binan" }, mockBarangays)?.barangayName, "Santo Tomas");
  assert.equal(resolveScholarBarangay({ address: "De La Pas" }, mockBarangays)?.barangayName, "De La Paz");
  assert.equal(resolveScholarBarangay({ address: "Canlalayy" }, mockBarangays)?.barangayName, "Canlalay");
  console.log("PASS [3/4]: Barangay typo & Filipino phonetic resolution verified (6/6 cases)");

  // 4. Program lettering & typo recognition
  assert.equal(getProgramInfo("B.S.I.T. - MWD")?.code, "BSIT MWD");
  assert.equal(getProgramInfo("BSITMWD")?.code, "BSIT MWD");
  assert.equal(getProgramInfo("BSIT MDW")?.code, "BSIT MWD");
  assert.equal(getProgramInfo("BTVTED-FSM")?.code, "BTVTE FSM");
  assert.equal(getProgramInfo("BSCEP")?.code, "BSCPE");
  assert.equal(getProgramInfo("BSCRIM")?.code, "BS CRIM");
  console.log("PASS [4/4]: Program dotted acronyms, hyphens, and typo recognition verified");
}

runTypoTests().catch((err) => {
  console.error("TYPO MATCHING TEST FAILED:", err);
  process.exit(1);
});
