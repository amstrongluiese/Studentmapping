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
    { name: "Batangas State University", metadata: { municipality: "Blk 20 Lot 07 Cartagena St. Gran Seville, Cabuyao" } },
    { name: "University of Rizal System", metadata: { municipality: "Bagumbayan, Pililila, Rizal" } },
    { name: "University of Perpetual Help System Binan Laguna", metadata: { municipality: "24 J. Gonzales St. San Vicente" } },
    { name: "Cavite State University", metadata: { municipality: "Brgy. Platero Biñan Laguna" } },
    { name: "University of Perpetual Help System Laguna - Binan", metadata: { municipality: "Tulay Bato San Antonio" } },
    { name: "Saint Louis Ann Colleges", metadata: { municipality: "Cadiz st. Biñan" } },
    { name: "Citi Clobal College", metadata: { municipality: "Barangay Caingin Purok Uno Sta. Rosa" } },
    { name: "Laguna college of bussiness and arts", metadata: { municipality: "Wawa Street Brgy Malaban" } }
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
