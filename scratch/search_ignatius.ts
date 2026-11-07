import "dotenv/config";
import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function run() {
  const db = getDb();
  const [rows]: any = await db.execute(sql`SELECT id, school_name, municipality, province FROM school_registry WHERE lower(school_name) LIKE '%ignat%' OR lower(school_name) LIKE '%sitiba%'`);
  console.log("Ignatius results:", rows);
  process.exit(0);
}

run();
