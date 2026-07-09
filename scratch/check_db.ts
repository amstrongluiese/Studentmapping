import { getDb, getPool } from '../server/db.js';
import { studentImports } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import { config } from 'dotenv';
config();

async function run() {
  const db = getDb();

  const allRecords = await db.select().from(studentImports);
  const unmatched = allRecords.filter(r => r.importStatus === 'Unmatched');
  const matched = allRecords.filter(r => r.importStatus === 'Matched');
  
  console.log(`Total records: ${allRecords.length}`);
  console.log(`Matched: ${matched.length}`);
  console.log(`Unmatched: ${unmatched.length}`);
  
  console.log("\nUnmatched Schools:");
  const uniqueUnmatched = new Set(unmatched.map(r => r.previousSchool));
  for (const name of uniqueUnmatched) {
    console.log(`- ${name}`);
  }

  getPool().end();
}

run().catch(console.error);
