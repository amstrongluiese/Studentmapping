import { getDb, getPool } from '../server/db.js';
import { SchoolMatchingEngine } from '../server/schoolMatcher.js';
import { schoolRegistry, schoolAliases } from '../shared/schema.js';
import { sql } from 'drizzle-orm';
import { config } from 'dotenv';
config();

async function run() {
  const db = getDb();
  const schools = await db.select().from(schoolRegistry);
  const aliases = await db.select().from(schoolAliases);
  const engine = new SchoolMatchingEngine(schools, aliases);

  const rawName = "San Buenaventura Integrated National High School";
  
  const trgmRes = await db.execute(sql`
    SELECT id, similarity(school_name, ${rawName}) as sim 
    FROM school_registry 
    WHERE is_active = true AND similarity(school_name, ${rawName}) > 0.4 
    ORDER BY sim DESC LIMIT 1
  `);
  
  const trgmRows = (trgmRes as any).rows || trgmRes;
  const dbTopSim = Number((trgmRows[0] as any).sim);
  const schoolId = (trgmRows[0] as any).id;
  const dbTopSchool = engine['registry'].find((s: any) => s.id === schoolId) || null;
  
  console.log({ dbTopSim, schoolId, dbTopSchoolFound: !!dbTopSchool });

  const fuzzyResults = engine['fuse'].search(rawName);
  const fuseTopSim = 1 - (fuzzyResults[0].score ?? 1);
  const fuseTopSchool = fuzzyResults[0].item;
  
  console.log({ fuseTopSim, fuseSchoolId: fuseTopSchool.id });
  
  const bestSim = Math.max(dbTopSim, fuseTopSim);
  console.log({ bestSim });

  getPool().end();
}

run().catch(console.error);
