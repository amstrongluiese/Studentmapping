import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    const db = getDb();
    const res = await db.execute(sql`SELECT * FROM school_registry WHERE school_name ILIKE '%Carmona%' OR normalized_school_name ILIKE '%CARMONA%' LIMIT 10`);
    console.log(res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
