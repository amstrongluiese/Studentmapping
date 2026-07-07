import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    const db = getDb();
    const res = await db.execute(sql`SELECT COUNT(*) FROM students_processed`);
    console.log('students_processed count:', res.rows);
    
    const res2 = await db.execute(sql`SELECT import_status, COUNT(*) FROM student_imports GROUP BY import_status`);
    console.log('student_imports:', res2.rows);
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
run();
