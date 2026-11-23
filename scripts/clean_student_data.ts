import "dotenv/config";
import { initializeDatabase, getDb } from "../server/db";
import { closeMysqlPool } from "../server/dbMysql";
import { studentsProcessed, schoolRegistry, schoolAliases, barangayRegistry } from "@shared/schema";
import { SchoolMatchingEngine } from "../server/schoolMatcher";
import { normalizeStudentProgramValue, getProgramInfo } from "@shared/programRecognition";
import { resolveScholarBarangay } from "@shared/scholarBarangayResolver";
import { cleanRawText } from "@shared/textNormalization";
import { eq } from "drizzle-orm";

const VALID_STATUSES = new Set([
  "OE",
  "NOE",
  "Active",
  "Archived",
  "PULL OUT",
  "Officially Enrolled",
  "Not Officially Enrolled",
  "Pending",
  "Dropped",
  "Enrolled",
  "For Verification",
]);

async function cleanStudentData() {
  initializeDatabase();
  const db = getDb();

  const [allSchools, allAliases, allBarangays, allStudents] = await Promise.all([
    db.select().from(schoolRegistry),
    db.select().from(schoolAliases),
    db.select().from(barangayRegistry),
    db.select().from(studentsProcessed),
  ]);

  const matcher = new SchoolMatchingEngine(allSchools, allAliases);

  let fixedStatuses = 0;
  let fixedPrograms = 0;
  let newlyLinkedSchools = 0;
  let fixedBarangays = 0;
  let cleanedTextNames = 0;

  for (const s of allStudents) {
    const updates: Record<string, any> = {};

    // 1. Fix corrupted enrollment_status values (e.g. shifted column name or '0')
    const rawStatus = (s.enrollmentStatus || "").trim();
    if (!rawStatus || !VALID_STATUSES.has(rawStatus)) {
      updates.enrollmentStatus = "Active";
      fixedStatuses++;
    }

    // 2. Normalize messy/typo program codes (only when recognized by official catalog)
    if (s.course) {
      const info = getProgramInfo(s.course);
      const canonical = info?.code || normalizeStudentProgramValue(s.course);
      if (canonical && canonical !== s.course) {
        updates.course = canonical;
        fixedPrograms++;
      }
    }

    // 3. Re-match unlinked schools using the upgraded typo/phonetic SchoolMatchingEngine
    if (!s.schoolRegistryId && s.lastSchoolName && s.lastSchoolName.trim().length >= 3) {
      const res = matcher.match(s.lastSchoolName);
      if (res.status === "matched" && res.school && (res.confidence ?? 0) >= 80) {
        updates.schoolRegistryId = res.school.id;
        updates.mappingStatus = "mapped";
        if (!s.municipality && res.school.municipality) {
          updates.municipality = res.school.municipality;
        }
        newlyLinkedSchools++;
      }
    }

    // 4. Clean mojibake in municipality/barangay and resolve missing barangay via 2-tier typo resolver
    const resolvedBrgy = resolveScholarBarangay(
      {
        barangay: s.barangay,
        municipality: s.municipality,
        iskolarNiKap: s.iskolarNiKap,
      },
      allBarangays,
    );
    if (resolvedBrgy && (!s.barangay || s.barangay.trim() !== resolvedBrgy.barangayName)) {
      updates.barangay = resolvedBrgy.barangayName;
      fixedBarangays++;
    }

    if (s.municipality && /[Ã?]/.test(s.municipality)) {
      updates.municipality = cleanRawText(s.municipality);
      cleanedTextNames++;
    }

    if (Object.keys(updates).length > 0) {
      await db.update(studentsProcessed).set(updates).where(eq(studentsProcessed.id, s.id));
    }
  }

  const remainingUnlinked = allStudents.filter((s) => !s.schoolRegistryId).length - newlyLinkedSchools;

  console.log("=== DATA ACCURACY CLEANUP REPORT ===");
  console.log(`Total students scanned:         ${allStudents.length}`);
  console.log(`Corrupted statuses fixed:       ${fixedStatuses}`);
  console.log(`Program codes normalized:       ${fixedPrograms}`);
  console.log(`Unlinked schools auto-matched:  ${newlyLinkedSchools}`);
  console.log(`Remaining unlinked schools:     ${remainingUnlinked}`);
  console.log(`Barangays resolved/cleaned:     ${fixedBarangays}`);
  console.log(`Mojibake municipalities fixed:  ${cleanedTextNames}`);

  await closeMysqlPool();
}

cleanStudentData().catch((err) => {
  console.error("Cleanup failed:", err);
  process.exit(1);
});
