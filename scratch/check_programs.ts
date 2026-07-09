import { getDb, getPool } from '../server/db.js';
import { studentsProcessed } from '../shared/schema.js';
import { sql } from 'drizzle-orm';
import { config } from 'dotenv';
config();

async function run() {
  const db = getDb();
  
  const results = await db.select({
    course: studentsProcessed.course,
    count: sql<number>`count(*)`
  }).from(studentsProcessed)
    .groupBy(studentsProcessed.course)
    .orderBy(sql`count(*) DESC`);
    
  console.log("Student count by program:");
  console.table(results);
  
  getPool().end();
}

run().catch(console.error);
