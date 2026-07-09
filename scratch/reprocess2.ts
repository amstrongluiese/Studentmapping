import { getDb, getPool } from '../server/db.js';
import { studentImports, schoolRegistry, schoolAliases } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import { SchoolMatchingEngine } from '../server/schoolMatcher.js';
import { config } from 'dotenv';
config();

async function run() {
  const db = getDb();
  const schools = await db.select().from(schoolRegistry);
  const aliases = await db.select().from(schoolAliases);
  const engine = new SchoolMatchingEngine(schools, aliases);

  const unmatched = await db.select().from(studentImports).where(eq(studentImports.importStatus, 'Unmatched'));
  let fixedCount = 0;

  for (const record of unmatched) {
    if (!record.previousSchool) continue;
    
    const res = await engine.matchAsync(record.previousSchool, {
      municipality: record.municipality || undefined
    });

    if (res.status === 'matched' && res.school) {
      console.log(`✅ Fixed: ${record.previousSchool} -> ${res.school.schoolName}`);
      await db.update(studentImports)
        .set({ 
          importStatus: 'Matched', 
          matchedSchoolId: res.school.id,
          matchConfidence: res.confidence || 90,
          matchRule: res.matchType || "re-process"
        })
        .where(eq(studentImports.id, record.id));
      fixedCount++;
    } else {
      console.log(`❌ Still Unmatched: ${record.previousSchool}`);
    }
  }

  console.log(`\nSuccessfully re-processed and matched ${fixedCount} out of ${unmatched.length} unmatched records!`);
  getPool().end();
}

run().catch(console.error);
