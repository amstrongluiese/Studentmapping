import { getDb, getPool } from '../server/db.js';
import { sql } from 'drizzle-orm';
import { config } from 'dotenv';
config();

async function run() {
  const db = getDb();
  
  // Find unmatched schools using raw SQL
  const result = await db.execute(sql`
    SELECT previous_school as "previousSchool", municipality 
    FROM student_imports 
    WHERE import_status = 'Unmatched'
  `);

  const unmatched = result.rows || result;
  
  // Get unique unmatched names
  const uniqueNames = new Set<string>();
  console.log(`Total unmatched rows: ${unmatched.length}`);
  
  for (const record of unmatched as any[]) {
    if (record.previousSchool && !uniqueNames.has(record.previousSchool)) {
      uniqueNames.add(record.previousSchool);
      console.log(`Unmatched: "${record.previousSchool}" | Muni: "${record.municipality}"`);
    }
  }

  getPool().end();
}

run().catch(console.error);
