import { testDatabaseConnection, getPool } from "./server/db";
import dotenv from "dotenv";

dotenv.config();

async function run() {
  console.log("Testing DB connection...");
  await testDatabaseConnection();
  console.log("Test 1 complete.");
  
  const pool = getPool();
  console.log("Querying pool directly...");
  const res = await pool.query("SELECT 1 AS ok");
  console.log("Query returned:", res.rows);
  
  console.log("Testing session query (which connect-pg-simple uses)...");
  try {
    const res2 = await pool.query("SELECT * FROM session LIMIT 1");
    console.log("Session query returned:", res2.rows);
  } catch (err: any) {
    console.log("Session query threw error:", err.message);
  }
  
  console.log("All done.");
  process.exit(0);
}

run().catch(console.error);
