import "dotenv/config";
import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function check() {
  const db = getDb();
  const query = async (querySql: any) => {
    const res: any = await db.execute(querySql);
    return Array.isArray(res) && Array.isArray(res[0]) ? res[0] : (res.rows || res[0] || res);
  };

  console.log("Searching school_registry for matching targets:");
  const targets = ["%ignatius%", "%biñan integrated%", "%binan integrated%", "%perpetual%", "%aquinas%"];
  for (const t of targets) {
    const rows = await query(sql`SELECT id, school_name, municipality, province FROM school_registry WHERE lower(school_name) LIKE ${t} LIMIT 5`);
    console.log(`\nMatch for ${t}:`, rows);
  }
  process.exit(0);
}

check();
