import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

let pool: pg.Pool;
let db: ReturnType<typeof drizzle>;
let initialized = false;

export function initializeDatabase() {
  if (initialized) return { pool, db };

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Please set DATABASE_URL in your .env file or environment.",
    );
  }

  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool, { schema });
  initialized = true;

  return { pool, db };
}

// Lazy getters to ensure initialization happens after dotenv.config()
export function getPool() {
  if (!initialized) initializeDatabase();
  return pool;
}

export function getDb() {
  if (!initialized) initializeDatabase();
  return db;
}


export async function testDatabaseConnection() {
  try {
    const client = await getPool().connect();
    await client.query("SELECT 1");
    client.release();
    console.log("✅ PostgreSQL connected successfully.");
  } catch (error) {
    console.error("❌ PostgreSQL connection failed:", error instanceof Error ? error.message : error);
    throw new Error(
      "Unable to connect to PostgreSQL. Check your DATABASE_URL and ensure the database is running.",
    );
  }
}
