import "dotenv/config";
import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    const db = getDb();
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
    console.log("Successfully enabled pg_trgm extension");
    process.exit(0);
  } catch (err) {
    console.error("Failed to enable pg_trgm:", err);
    process.exit(1);
  }
}

main();
