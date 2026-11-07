import "dotenv/config";
import { getDb } from "../server/db";
import { schoolRegistry } from "../shared/schemaMysql";
import { like } from "drizzle-orm";

async function check() {
  const db = getDb();
  const schools = await db.select().from(schoolRegistry).where(like(schoolRegistry.schoolName, "%Jacobo%"));
  console.log("Found Jacobo schools:", JSON.stringify(schools, null, 2));
  process.exit(0);
}

check().catch(console.error);
