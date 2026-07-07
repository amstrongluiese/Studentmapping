import { getDb } from '../server/db';
import { studentImports } from '../shared/schema';
import { sql } from 'drizzle-orm';

async function run() {
  const db = getDb();
  const res = await db.execute(sql`SELECT import_status, COUNT(*) FROM student_imports GROUP BY import_status`);
  console.log(res.rows);
  process.exit(0);
}
run();
