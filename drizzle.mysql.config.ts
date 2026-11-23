import { defineConfig } from "drizzle-kit";
import "dotenv/config";

const mysqlUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;
if (!mysqlUrl) {
  throw new Error("MYSQL_URL (or DATABASE_URL) must be set in your .env file.");
}

export default defineConfig({
  out: "./migrations-mysql",
  schema: "./shared/schemaMysql.ts",
  dialect: "mysql",
  dbCredentials: {
    url: mysqlUrl,
  },
});
