import { getDb } from '../server/db';
import { studentImports } from '../shared/schema';

async function run() {
  try {
    const db = getDb();
    const rows = await db.select().from(studentImports);
    console.log(`Found ${rows.length} rows in student_imports`);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
