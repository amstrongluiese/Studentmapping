import { getDb, getPool } from '../server/db.js';
import { sql } from 'drizzle-orm';
import { config } from 'dotenv';
config();

async function clearData() {
  const db = getDb();
  console.log('Clearing database tables...');
  try {
    await db.execute(sql`TRUNCATE TABLE student_imports CASCADE`);
    await db.execute(sql`TRUNCATE TABLE imports CASCADE`);
    await db.execute(sql`TRUNCATE TABLE students_raw CASCADE`);
    await db.execute(sql`TRUNCATE TABLE students_processed CASCADE`);
    await db.execute(sql`TRUNCATE TABLE mapping_logs CASCADE`);
    console.log('✅ Successfully cleared student and import tables!');
  } catch (error) {
    console.error('Error clearing data:', error);
  } finally {
    getPool().end();
  }
}

clearData();
