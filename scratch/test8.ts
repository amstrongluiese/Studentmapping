import { getDb, getPool } from '../server/db.js';
import { sql } from 'drizzle-orm';
import { config } from 'dotenv';
config();

async function run() {
  const db = getDb();
  
  const rawName = "San Buenaventura Integrated National High School";
  const trgmRes = await db.execute(sql`
    SELECT school_name, similarity(school_name, ${rawName}) as sim 
    FROM school_registry 
    ORDER BY sim DESC LIMIT 5
  `);
  
  console.log(`Fuzzy results from Postgres for "${rawName}":`);
  const trgmRows = (trgmRes as any).rows || trgmRes;
  for (const r of trgmRows) {
    console.log(`- ${r.school_name} (Similarity: ${r.sim})`);
  }

  getPool().end();
}

run().catch(console.error);
