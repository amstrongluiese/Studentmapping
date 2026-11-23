import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../shared/schemaMysql";
import { getEnv } from "./env";

let pool: mysql.Pool;
let db: ReturnType<typeof drizzle>;
let initialized = false;

export function initializeMysqlDatabase() {
  if (initialized) return { pool, db };

  const env = getEnv();

  // Env-configurable connection pool tuned for starter/VPS MySQL & horizontal scaling
  pool = mysql.createPool({
    uri: env.MYSQL_URL,
    connectionLimit: env.MYSQL_POOL_LIMIT,
    queueLimit: env.MYSQL_QUEUE_LIMIT,
    connectTimeout: env.MYSQL_CONNECT_TIMEOUT_MS,
    waitForConnections: true,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  });

  db = drizzle(pool, { schema, mode: "default" });
  initialized = true;

  return { pool, db };
}

export function getMysqlPool() {
  if (!initialized) initializeMysqlDatabase();
  return pool;
}

export function getMysqlDb() {
  if (!initialized) initializeMysqlDatabase();
  return db;
}

export async function testMysqlDatabaseConnection() {
  const env = getEnv();
  try {
    const conn = await getMysqlPool().getConnection();
    await conn.query("SELECT 1");
    conn.release();
    console.log(
      `✅ MySQL / MariaDB connected successfully (pool limit: ${env.MYSQL_POOL_LIMIT}, timeout: ${env.MYSQL_CONNECT_TIMEOUT_MS}ms).`,
    );
  } catch (error) {
    console.error("❌ MySQL connection failed:", error instanceof Error ? error.message : error);
    throw new Error("Unable to connect to MySQL. Check your MYSQL_URL in .env file.");
  }
}

export async function closeMysqlPool() {
  if (initialized && pool) {
    await pool.end().catch(() => {});
    initialized = false;
  }
}
