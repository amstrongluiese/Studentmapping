import { getDb } from "./db";
import { studentImports, schoolAliases } from "@shared/schema";
import { SchoolMatchingEngine } from "./schoolMatcher";
import { storage } from "./storage";

interface ImportProgress {
  total: number;
  processed: number;
  matched: number;
  unmatched: number;
  errors: number;
  percentage: number;
  isProcessing: boolean;
}

let currentProgress: ImportProgress = {
  total: 0,
  processed: 0,
  matched: 0,
  unmatched: 0,
  errors: 0,
  percentage: 0,
  isProcessing: false,
};

// Start a new import session
export function startImportSession(totalRecords: number) {
  currentProgress = {
    total: totalRecords,
    processed: 0,
    matched: 0,
    unmatched: 0,
    errors: 0,
    percentage: 0,
    isProcessing: true,
  };
}

export function getImportProgress(): ImportProgress {
  return currentProgress;
}

export function endImportSession() {
  currentProgress.isProcessing = false;
  currentProgress.percentage = 100;
}

export async function processBatch(records: any[]) {
  if (!currentProgress.isProcessing) return;

  const db = getDb();
  const allSchools = await storage.listSchoolRegistry();
  const aliases = await db.select().from(schoolAliases);
  const matcher = new SchoolMatchingEngine(allSchools, aliases);

  for (const record of records) {
    try {
      // Returnee Heuristic
      const prevSchoolUpper = (record.previousSchool || "").toUpperCase();
      const strandUpper = (record.strand || "").toUpperCase();

      if (
        strandUpper.includes("RETURNEE") ||
        prevSchoolUpper.includes("RETURNEE") ||
        (prevSchoolUpper.includes("TRIMEX") && strandUpper.includes("2ND COURSER")) ||
        (prevSchoolUpper.includes("TRIMEX") && strandUpper.includes("2ND-COURSER"))
      ) {
        record.previousSchool = "Trimex Colleges";
        record.admissionType = "Returnee";
      } else {
        record.admissionType = "Freshman";
      }

      const matchResult = await matcher.matchAsync(record.previousSchool || "", {
        address: record.address,
        municipality: record.municipality,
        province: record.province,
        program: record.program
      });
      
      const status = matchResult.status === "matched" ? "Matched" : 
                    matchResult.status === "suggested" ? "Unmatched" : "Unmatched";

      await db.insert(studentImports).values({
        studentNumber: record.studentNumber || "N/A",
        fullName: record.fullName || "Unknown",
        previousSchool: record.previousSchool || null,
        strand: record.strand || null,
        admissionType: record.admissionType,
        program: record.program || null,
        scholarship: record.scholarship || null,
        municipality: record.municipality || "Laguna",
        importSource: record.importSource || "API Batch",
        importStatus: status,
        matchedSchoolId: matchResult.school?.id || null,
        matchConfidence: matchResult.confidence || 0,
        matchRule: matchResult.matchType || "none",
      });

      currentProgress.processed++;
      if (status === "Matched") currentProgress.matched++;
      else currentProgress.unmatched++;
      
    } catch (e) {
      console.error("[importPipeline] Error processing record:", e);
      currentProgress.processed++;
      currentProgress.errors++;
    }
  }

  currentProgress.percentage = Math.round((currentProgress.processed / currentProgress.total) * 100);
  
  if (currentProgress.processed >= currentProgress.total) {
    currentProgress.isProcessing = false;
  }
}
