import "dotenv/config";
import { validateEnv } from "./env";
import { getDb } from "./db";
import { users } from "@shared/schema";
import { hashPassword } from "./auth";
import { eq } from "drizzle-orm";

async function seedAdmin() {
  const env = validateEnv();
  const username = env.ADMIN_SEED_USERNAME;
  const password = env.ADMIN_SEED_PASSWORD;

  if (!password) {
    throw new Error(
      "ADMIN_SEED_PASSWORD must be set in your .env file (minimum 8 characters) before running seedAdmin.",
    );
  }

  console.log(`Checking for admin user '${username}'...`);
  const db = getDb();
  const existingAdmin = await db.select().from(users).where(eq(users.username, username)).limit(1);

  if (existingAdmin.length === 0) {
    console.log("No admin user found. Creating one...");
    const hashedPassword = await hashPassword(password);

    await db.insert(users).values({
      username,
      password: hashedPassword,
      role: "admin",
      isActive: true,
    });
    console.log(`Admin user '${username}' created successfully.`);
  } else {
    console.log(`Admin user '${username}' already exists.`);
  }
}

seedAdmin()
  .catch((err) => {
    console.error("seedAdmin failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
