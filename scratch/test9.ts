import { getDb, getPool } from '../server/db.js';
import { SchoolMatchingEngine } from '../server/schoolMatcher.js';
import { schoolRegistry, schoolAliases } from '../shared/schema.js';
import { sql } from 'drizzle-orm';
import { config } from 'dotenv';
config();

async function run() {
  const db = getDb();
  const rawName = "San Buenaventura Integrated National High School";
  
  const trgmRes = await db.execute(sql`
    SELECT id, similarity(school_name, ${rawName}) as sim 
    FROM school_registry 
    WHERE is_active = true AND similarity(school_name, ${rawName}) > 0.4 
    ORDER BY sim DESC LIMIT 1
  `);
  
  const trgmRows = (trgmRes as any).rows || trgmRes;
  console.log("pg_trgm raw result:");
  console.log(trgmRows);

  getPool().end();
}

run().catch(console.error);
