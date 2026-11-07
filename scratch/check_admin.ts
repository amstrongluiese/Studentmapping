import { getPool } from "../server/db";
import dotenv from "dotenv";
import { comparePasswords } from "../server/auth";

dotenv.config();

async function run() {
  const pool = getPool();
  
  console.log("--- USERS TABLE ---");
  const [usersRows] = await pool.query("SELECT id, username, password, role, is_active FROM users") as any;
  console.log(usersRows);

  console.log("--- TESTING ADMIN PASSWORD 'admin123' ---");
  const adminUser = usersRows.find((u: any) => u.username === "admin");
  if (adminUser) {
    const isMatch = await comparePasswords("admin123", adminUser.password);
    console.log("Password 'admin123' matches hash:", isMatch);
  } else {
    console.log("No user with username 'admin' found!");
  }

  console.log("--- SESSION TABLE ---");
  try {
    const [sessionRows] = await pool.query("SELECT count(*) as count FROM session") as any;
    console.log("Session table count:", sessionRows[0].count);
  } catch (err: any) {
    console.log("Session table query error:", err.message);
  }

  process.exit(0);
}

run().catch(console.error);
