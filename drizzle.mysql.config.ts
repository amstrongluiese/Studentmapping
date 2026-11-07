import { defineConfig } from "drizzle-kit";
import "dotenv/config";

export default defineConfig({
  out: "./migrations-mysql",
  schema: "./shared/schemaMysql.ts",
  dialect: "mysql",
  dbCredentials: {
    url: process.env.MYSQL_URL || "mysql://root:admin123@localhost:3306/student_mapping",
  },
});
