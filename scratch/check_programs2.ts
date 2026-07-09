import { getDb, getPool } from '../server/db.js';
import { studentImports } from '../shared/schema.js';
import { sql } from 'drizzle-orm';
import { config } from 'dotenv';
config();

async function run() {
  const db = getDb();
  
  const results = await db.select({
    program: studentImports.program,
    count: sql<number>`count(*)`
  }).from(studentImports)
    .groupBy(studentImports.program)
    .orderBy(sql`count(*) DESC`);
    
  console.log("Student count by program in studentImports:");
  console.table(results);
  
  getPool().end();
}

run().catch(console.error);
