import "dotenv/config";
import { getDb } from "../server/db";
import { schoolRegistry } from "../shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "../server/storage";

async function run() {
  const db = getDb();
  console.log("Fetching schools...");
  const schools = await db.select().from(schoolRegistry);
  console.log(`Loaded ${schools.length} schools.`);

  // Find duplicates
  const seen = new Map<string, any>();
  const pairs: { duplicateId: number; targetId: number }[] = [];

  schools.forEach(school => {
    if (!school.isActive) return;
    const key = `${school.municipality.toLowerCase()}__${school.schoolName.toLowerCase()}`;
    if (seen.has(key)) {
      const other = seen.get(key);
      // Let's decide which is duplicate and which is target
      const hasCoords = (s: any) => s.latitude !== null && s.longitude !== null;
      if (hasCoords(other) && !hasCoords(school)) {
        pairs.push({ duplicateId: school.id, targetId: other.id });
      } else {
        pairs.push({ duplicateId: other.id, targetId: school.id });
      }
    } else {
      seen.set(key, school);
    }
  });

  console.log(`Found ${pairs.length} duplicate pairs.`);
  if (pairs.length === 0) {
    console.log("No duplicates to merge!");
    return;
  }

  const testPair = pairs[0];
  console.log(`Testing merge of duplicate ID ${testPair.duplicateId} into target ID ${testPair.targetId}...`);

  try {
    await storage.mergeSchoolRegistry(testPair.duplicateId, testPair.targetId);
    console.log("Test merge succeeded!");
  } catch (err: any) {
    console.error("Test merge failed with error:");
    console.error(err);
  }
}

run().catch(console.error);
