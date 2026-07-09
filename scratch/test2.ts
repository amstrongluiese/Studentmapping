import { getDb, getPool } from '../server/db.js';
import { SchoolMatchingEngine } from '../server/schoolMatcher.js';
import { schoolRegistry, schoolAliases } from '../shared/schema.js';
import { config } from 'dotenv';
config();

async function run() {
  const db = getDb();
  const schools = await db.select().from(schoolRegistry);
  const aliases = await db.select().from(schoolAliases);
  const engine = new SchoolMatchingEngine(schools, aliases);

  const testCases = [
    { name: "San Pedro Relocation Center National High School", metadata: {} },
    { name: "Citi Global Colleges", metadata: {} },
    { name: "Citi Global College", metadata: {} },
    { name: "San Sebastian College-Recoletos", metadata: {} },
    { name: "San Pedro College of Business Adminitration", metadata: {} },
    { name: "Binan City Senior Highschool San Antonio Campus", metadata: {} },
    { name: "AMA Colleges", metadata: {} },
    { name: "CITI Global Colleges", metadata: {} },
    { name: "San Buenaventura Integrated National High School", metadata: {} }
  ];

  for (const tc of testCases) {
    const res = await engine.matchAsync(tc.name, tc.metadata);
    console.log(`Test: ${tc.name}`);
    if (res.status === 'matched') {
      console.log(`✅ Matched! -> ${res.school?.schoolName} (Type: ${res.matchType}, Confidence: ${res.confidence})`);
    } else {
      console.log(`❌ ${res.status}:`, res.suggestions?.map(s => s.schoolName).join(', '));
    }
  }

  getPool().end();
}

run().catch(console.error);
