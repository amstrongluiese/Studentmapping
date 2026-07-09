import { getDb, getPool } from '../server/db.js';
import { schoolRegistry } from '../shared/schema.js';
import { normalizeSchoolName } from '../shared/schoolRegistry.js';
import { config } from 'dotenv';
config();

async function run() {
  const db = getDb();
  const allSchools = await db.select().from(schoolRegistry);
  const byNormalized = new Map<string, typeof allSchools>();

  for (const school of allSchools) {
    const key = normalizeSchoolName(school.normalizedSchoolName || school.schoolName);
    byNormalized.set(key, [...(byNormalized.get(key) || []), school]);
  }

  console.log("Possible duplicates:");
  for (const [key, dupes] of byNormalized.entries()) {
    if (dupes.length > 1) {
      console.log(`\nNormalized Key: ${key}`);
      for (const d of dupes) {
        console.log(` - [ID ${d.id}] ${d.schoolName} (normalizedDB: ${d.normalizedSchoolName})`);
      }
    }
  }

  getPool().end();
}

run().catch(console.error);
