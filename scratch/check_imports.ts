import { getDb, getPool } from '../server/db.js';
import { imports } from '../shared/schema.js';
import { config } from 'dotenv';
config();

async function run() {
  const db = getDb();
  
  const results = await db.select().from(imports);
    
  console.log("Import jobs:");
  console.table(results);
  
  getPool().end();
}

run().catch(console.error);
