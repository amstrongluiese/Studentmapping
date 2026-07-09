import { getDb, getPool } from '../server/db.js';
import { SchoolMatchingEngine } from '../server/schoolMatcher.js';
import { schoolRegistry, schoolAliases } from '../shared/schema.js';
import { searchSchools } from '../server/gisPipeline.js';
import { config } from 'dotenv';
config();

async function run() {
  const db = getDb();
  
  const rawName = "San Buenaventura Integrated National High School";
  const dbFuzzy = await searchSchools(rawName, 10);
  
  console.log(`Fuzzy results from Postgres for "${rawName}":`);
  for (const s of dbFuzzy) {
    console.log(`- ${s.schoolName} (Similarity: ${s.similarity})`);
  }

  getPool().end();
}

run().catch(console.error);
