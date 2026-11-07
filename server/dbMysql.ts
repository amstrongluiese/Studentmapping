import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../shared/schemaMysql";

let pool: mysql.Pool;
let db: ReturnType<typeof drizzle>;
let initialized = false;

export function initializeMysqlDatabase() {
  if (initialized) return { pool, db };

  const mysqlUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;

  if (!mysqlUrl) {
    throw new Error(
      "MYSQL_URL must be set in your .env file or environment for MySQL connection.",
    );
  }

  // High-scaling connection pool settings for MySQL / MariaDB
  pool = mysql.createPool({
    uri: mysqlUrl,
    connectionLimit: 100, // High-scaling max concurrent connection pool
    queueLimit: 0,
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
  try {
    const conn = await getMysqlPool().getConnection();
    await conn.query("SELECT 1");
    conn.release();
    console.log("✅ MySQL / MariaDB connected successfully with High-Scaling pool (100 max conns).");
  } catch (error) {
    console.error("❌ MySQL connection failed:", error instanceof Error ? error.message : error);
    throw new Error("Unable to connect to MySQL. Check your MYSQL_URL in .env file.");
  }
}
