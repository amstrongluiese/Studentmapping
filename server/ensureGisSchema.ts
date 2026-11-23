import { getPool } from "./db";

async function ensureIndex(
  pool: ReturnType<typeof getPool>,
  tableName: string,
  indexName: string,
  columnsSql: string,
) {
  const [rows] = await pool.query<any[]>(
    `
      SELECT 1
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND INDEX_NAME = ?
      LIMIT 1
    `,
    [tableName, indexName],
  );
  if (!Array.isArray(rows) || rows.length === 0) {
    await pool.query(`CREATE INDEX \`${indexName}\` ON \`${tableName}\` (${columnsSql})`);
  }
}

export async function ensureGisSchema() {
  console.log("[GIS] Ensuring MySQL schema, public referrals table, and performance indexes...");
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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS public_referrals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        referrer_name VARCHAR(255) NOT NULL,
        referrer_contact VARCHAR(100) NULL,
        referred_name TEXT NOT NULL,
        relationship VARCHAR(255) NOT NULL,
        contact_number VARCHAR(100) NULL,
        notes TEXT NULL,
        status VARCHAR(100) NOT NULL DEFAULT 'pending',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME NULL,
        deleted_by INT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Pillar 3: Idempotent performance indexes for frequent GIS, scholar, referral, and audit queries
    const indexes: Array<[string, string, string]> = [
      ["students_processed", "students_processed_enrollment_status_idx", "`enrollment_status`"],
      ["students_processed", "students_processed_mapping_status_idx", "`mapping_status`"],
      ["students_processed", "students_processed_scholar_idx", "`iskolar_ni_kap`"],
      ["students_processed", "students_processed_barangay_idx", "`barangay`"],
      ["referrals", "idx_referrals_referrer_id", "`referrer_id`"],
      ["referrals", "idx_referrals_status", "`status`"],
      ["public_referrals", "idx_public_referrals_status", "`status`"],
      ["public_referrals", "idx_public_referrals_created_at", "`created_at`"],
      ["mapping_logs", "idx_mapping_logs_import_id", "`import_id`"],
      ["mapping_logs", "idx_mapping_logs_created_at", "`created_at`"],
      ["audit_logs", "idx_audit_logs_timestamp", "`timestamp`"],
      ["data_access_logs", "idx_data_access_logs_user_id", "`user_id`"],
      ["data_access_logs", "idx_data_access_logs_accessed_at", "`accessed_at`"],
    ];

    for (const [table, idxName, cols] of indexes) {
      try {
        await ensureIndex(pool, table, idxName, cols);
      } catch (idxErr: any) {
        console.warn(`[GIS] Skipped index ${idxName} on ${table}:`, idxErr?.message || idxErr);
      }
    }
  } catch (err: any) {
    console.error("[GIS] Error ensuring schema:", err?.message || err);
  }
}
