import { getDb, getPool } from '../server/db.js';
import { schoolRegistry } from '../shared/schema.js';
import { ilike } from 'drizzle-orm';
import { config } from 'dotenv';
config();

async function run() {
  const db = getDb();
  
  const res = await db.select().from(schoolRegistry).where(ilike(schoolRegistry.schoolName, '%San Sebastian%'));
  console.log('San Sebastian:', res.map(s => s.schoolName));

  const res2 = await db.select().from(schoolRegistry).where(ilike(schoolRegistry.schoolName, '%San Pedro College%'));
  console.log('San Pedro:', res2.map(s => s.schoolName));

  const res3 = await db.select().from(schoolRegistry).where(ilike(schoolRegistry.schoolName, '%Buenaventura%'));
  console.log('Buenaventura:', res3.map(s => s.schoolName));

  getPool().end();
}

run().catch(console.error);
