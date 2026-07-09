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
    { name: "Citi Global Colleges", metadata: { address: "M.H Del pilar brgy san jose Binan Laguna" } },
    { name: "Citi Global College", metadata: { address: "Barangay Caingin Purok Uno Sta. Rosa" } },
    { name: "San Sebastian College-Recoletos", metadata: { address: "Kanluran, Rosario, Cavite" } },
    { name: "San Pedro College of Business Adminitration", metadata: { address: "Lumil Silang Cavite" } },
    { name: "Binan City Senior Highschool San Antonio Campus", metadata: { address: "Ilaya street, Malaban Binan Laguna" } },
    { name: "AMA Colleges", metadata: { address: "Poblacion Binan" } },
    { name: "CITI Global Colleges", metadata: { address: "Laguna" } },
    { name: "San Buenaventura Integrated National High School", metadata: { address: "Purok 1 Brgy. Milagrosa Calamba" } }
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
