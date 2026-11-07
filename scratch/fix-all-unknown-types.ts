import "dotenv/config";
import { getDb } from "../server/db";
import { schoolRegistry } from "../shared/schemaMysql";
import { eq, or, isNull } from "drizzle-orm";

function inferSchoolType(name: string): string {
  const upper = (name || "").toUpperCase();
  if (upper.includes("TESDA") || upper.includes("ARTS AND TRADES") || upper.includes("ARTS & TRADES") || upper.includes("VOCATIONAL") || upper.includes("POLYTECHNIC") || upper.includes("TECH-VOC")) {
    return "Technical-Vocational / TESDA";
  }
  if (upper.includes("NATIONAL HIGH") || upper.includes("HIGH SCHOOL") || upper.includes("NHS") || upper.includes("SHS") || upper.includes("SENIOR HIGH")) {
    return "Public Senior High School";
  }
  if (upper.includes("COLLEGE") || upper.includes("UNIVERSITY") || upper.includes("UNIV") || upper.includes("INSTITUTE") || upper.includes("ACADEMY")) {
    return "Higher Education / College";
  }
  if (upper.includes("ELEMENTARY") || upper.includes("ELEM") || upper.includes("CENTRAL")) {
    return "Elementary School";
  }
  return "Public School";
}

async function fixAllUnknowns() {
  const db = getDb();
  const unknowns = await db.select().from(schoolRegistry).where(
    or(
      eq(schoolRegistry.schoolType, "Unknown"),
      isNull(schoolRegistry.schoolType)
    )
  );

  console.log(`Found ${unknowns.length} schools with 'Unknown' schoolType.`);
  let updatedCount = 0;

  for (const school of unknowns) {
    const inferred = inferSchoolType(school.schoolName);
    await db.update(schoolRegistry).set({ schoolType: inferred }).where(eq(schoolRegistry.id, school.id));
    updatedCount++;
  }

  console.log(`Successfully updated ${updatedCount} schools from 'Unknown' to inferred institution types!`);
  process.exit(0);
}

fixAllUnknowns().catch(console.error);
