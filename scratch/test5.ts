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
    { name: "San Sebastian College-Recoletos", metadata: {} },
    { name: "San Pedro College of Business Adminitration", metadata: {} },
    { name: "San Buenaventura Integrated National High School", metadata: {} },
    { name: "New Sinai School & Colleges", metadata: {} },
    { name: "St. Louis Anne Colleges of San Pedro Laguna Inc.", metadata: {} },
    { name: "Saint Louis Ann Colleges", metadata: {} },
    { name: "Citi Clobal College", metadata: {} },
    { name: "AMA Colleges", metadata: {} }
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
