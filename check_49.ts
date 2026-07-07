import * as dotenv from "dotenv";
dotenv.config();
import { getDb, getPool } from "./server/db";
import { schoolRegistry } from "./shared/schema";
import { eq } from "drizzle-orm";

async function run() {
  try {
    const db = getDb();
    const s = await db.select().from(schoolRegistry).where(eq(schoolRegistry.id, 49));
    console.log(s);
  } finally {
    await getPool().end();
  }
}

run().catch(console.error);
