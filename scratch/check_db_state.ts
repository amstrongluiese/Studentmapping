import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    const db = getDb();
    
    // Check total in student_imports
    const imports = await db.execute(sql`SELECT count(*) FROM student_imports`);
    console.log(`student_imports total: ${imports.rows[0].count}`);

    // Check total in students_processed
    const processed = await db.execute(sql`SELECT count(*) FROM students_processed`);
    console.log(`students_processed total: ${processed.rows[0].count}`);

    // Check programs in students_processed
    const programs = await db.execute(sql`SELECT course, count(*) FROM students_processed GROUP BY course ORDER BY count DESC`);
    console.log(`\nPrograms in students_processed:`);
    console.log(programs.rows);

  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
