import dotenv from "dotenv";
dotenv.config();

import { getPool as getPgPool } from "../server/db";
import { getMysqlPool, initializeMysqlDatabase } from "../server/dbMysql";

async function runMigration() {
  console.log("🚀 Starting High-Scaling PostgreSQL -> MySQL Data Migration...\n");

  const pgPool = getPgPool();
  initializeMysqlDatabase();
  const mysqlPool = getMysqlPool();

  const tables = [
    { name: "users", pk: "id" },
    { name: "school_registry", pk: "id" },
    { name: "imports", pk: "id" },
    { name: "students_raw", pk: "id" },
    { name: "student_imports", pk: "id" },
    { name: "students_processed", pk: "id" },
    { name: "departments", pk: "id" },
    { name: "programs", pk: "id" },
    { name: "school_aliases", pk: "id" },
    { name: "school_match_history", pk: "id" },
    { name: "system_settings", pk: "key" },
    { name: "audit_logs", pk: "id" },
  ];

  // Disable foreign keys temporarily during batch insert
  await mysqlPool.query("SET FOREIGN_KEY_CHECKS = 0;");

  for (const t of tables) {
    try {
      console.log(`📦 Migrating table '${t.name}'...`);
      const [rows] = await pgPool.query(`SELECT * FROM ${t.name}`) as any;

      if (rows.length === 0) {
        console.log(`   └─ Table '${t.name}' has 0 rows. Skipped.\n`);
        continue;
      }

      let insertedCount = 0;
      for (const row of rows) {
        const keys = Object.keys(row);
        const placeholders = keys.map(() => "?").join(", ");
        const columns = keys.map((k) => `\`${k}\``).join(", ");
        const values = Object.values(row).map((v) => {
          if (v instanceof Date) return v.toISOString().slice(0, 19).replace("T", " ");
          if (typeof v === "object" && v !== null) return JSON.stringify(v);
          return v;
        });

        const sql = `INSERT INTO \`${t.name}\` (${columns}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${keys.map(k => `\`${k}\` = VALUES(\`${k}\`)`).join(", ")}`;
        await mysqlPool.query(sql, values);
        insertedCount++;
      }

      console.log(`   └─ Successfully migrated ${insertedCount}/${rows.length} rows into '${t.name}'.\n`);
    } catch (err: any) {
      console.error(`   ❌ Error migrating '${t.name}':`, err.message);
    }
  }

  await mysqlPool.query("SET FOREIGN_KEY_CHECKS = 1;");
  console.log("✅ MySQL Data Migration finished successfully!");
  process.exit(0);
}

runMigration().catch((err) => {
  console.error("Migration failed fatal error:", err);
  process.exit(1);
});
