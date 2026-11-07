import { getPool } from "./db";

export async function ensureGisSchema() {
  console.log("[GIS] Ensuring MySQL audit log schema...");
  try {
    const pool = getPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS data_access_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        action TEXT NOT NULL,
        target_table TEXT NOT NULL,
        record_id TEXT NULL,
        ip_address TEXT NULL,
        accessed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        actor VARCHAR(255) NOT NULL DEFAULT 'System',
        role VARCHAR(100) NOT NULL DEFAULT 'User',
        action VARCHAR(100) NOT NULL,
        target_resource VARCHAR(255) NOT NULL,
        details TEXT NULL,
        ip_address VARCHAR(100) NULL,
        status VARCHAR(100) NOT NULL DEFAULT 'SUCCESS',
        timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  } catch (err: any) {
    console.error("[GIS] Error ensuring schema:", err?.message || err);
  }
}
