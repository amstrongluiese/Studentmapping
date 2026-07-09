import { getDb, getPool } from '../server/db.js';
import { schoolMatchHistory } from '../shared/schema.js';
import { config } from 'dotenv';
config();

async function run() {
  const db = getDb();
  const res = await db.select().from(schoolMatchHistory);
  console.log(res);
  getPool().end();
}

run().catch(console.error);
