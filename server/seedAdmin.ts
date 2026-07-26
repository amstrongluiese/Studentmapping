import "dotenv/config";
import { getDb } from "./db";
import { users } from "@shared/schema";
import { hashPassword } from "./auth";
import { eq } from "drizzle-orm";

async function seedAdmin() {
  console.log("Checking for admin user...");
  const db = getDb();
  const existingAdmin = await db.select().from(users).where(eq(users.username, "admin")).limit(1);

  if (existingAdmin.length === 0) {
    console.log("No admin user found. Creating one...");
    const hashedPassword = await hashPassword("admin123");
    
    await db.insert(users).values({
      username: "admin",
      password: hashedPassword,
      role: "admin",
    });
    console.log("Admin user created (username: admin, password: admin123)");
  } else {
    console.log("Admin user already exists.");
  }
}

seedAdmin().catch(console.error).finally(() => process.exit(0));
