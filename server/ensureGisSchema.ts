import { getPool } from "./db";

/**
 * Idempotent GIS table setup when drizzle-kit push was not completed.
 * Safe to run on every server start.
 */
export async function ensureGisSchema() {
  const pool = getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS imports (
      id SERIAL PRIMARY KEY,
      source TEXT NOT NULL DEFAULT 'api',
      status TEXT NOT NULL DEFAULT 'completed',
      imported_count INTEGER NOT NULL DEFAULT 0,
      failed_count INTEGER NOT NULL DEFAULT 0,
      started_at TIMESTAMP NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMP,
      notes TEXT
    );
  `);

  await pool.query(`
    ALTER TABLE imports ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'api';
    ALTER TABLE imports ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed';
    ALTER TABLE imports ADD COLUMN IF NOT EXISTS imported_count INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE imports ADD COLUMN IF NOT EXISTS failed_count INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE imports ADD COLUMN IF NOT EXISTS started_at TIMESTAMP NOT NULL DEFAULT NOW();
    ALTER TABLE imports ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
    ALTER TABLE imports ADD COLUMN IF NOT EXISTS notes TEXT;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS students_raw (
      id SERIAL PRIMARY KEY,
      import_id INTEGER REFERENCES imports(id),
      student_number TEXT NOT NULL,
      full_name TEXT NOT NULL,
      course TEXT,
      last_school_name TEXT NOT NULL,
      last_school_type TEXT,
      student_type TEXT,
      municipality TEXT NOT NULL DEFAULT 'Laguna',
      raw_payload TEXT,
      synced_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  const legacyProcessed = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'students_processed';
  `);

  const processedCols = new Set(legacyProcessed.rows.map((r: { column_name: string }) => r.column_name));
  const isLegacyProcessed =
    processedCols.size > 0 && processedCols.has("enrollment_year") && !processedCols.has("raw_id");

  if (isLegacyProcessed) {
    await pool.query(`ALTER TABLE IF EXISTS students_processed RENAME TO students_processed_legacy;`);
    processedCols.clear();
  }

  if (!processedCols.has("raw_id") && processedCols.size === 0) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS students_processed (
        id SERIAL PRIMARY KEY,
        raw_id INTEGER REFERENCES students_raw(id),
        student_number TEXT NOT NULL,
        full_name TEXT NOT NULL,
        course TEXT,
        admission_type TEXT,
        last_school_name TEXT NOT NULL,
        last_school_type TEXT,
        school_id INTEGER REFERENCES schools(id),
        mapping_status TEXT NOT NULL DEFAULT 'pending',
        synced_at TIMESTAMP NOT NULL DEFAULT NOW(),
        processed_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
  } else {
    await pool.query(`
      ALTER TABLE students_processed ADD COLUMN IF NOT EXISTS raw_id INTEGER;
      ALTER TABLE students_processed ADD COLUMN IF NOT EXISTS student_number TEXT;
      ALTER TABLE students_processed ADD COLUMN IF NOT EXISTS full_name TEXT;
      ALTER TABLE students_processed ADD COLUMN IF NOT EXISTS course TEXT;
      ALTER TABLE students_processed ADD COLUMN IF NOT EXISTS admission_type TEXT;
      ALTER TABLE students_processed ADD COLUMN IF NOT EXISTS last_school_name TEXT;
      ALTER TABLE students_processed ADD COLUMN IF NOT EXISTS last_school_type TEXT;
      ALTER TABLE students_processed ADD COLUMN IF NOT EXISTS school_id INTEGER;
      ALTER TABLE students_processed ADD COLUMN IF NOT EXISTS mapping_status TEXT NOT NULL DEFAULT 'pending';
      ALTER TABLE students_processed ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP NOT NULL DEFAULT NOW();
      ALTER TABLE students_processed ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP NOT NULL DEFAULT NOW();
    `);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS school_aliases (
      id SERIAL PRIMARY KEY,
      alias_normalized TEXT NOT NULL UNIQUE,
      school_id INTEGER NOT NULL REFERENCES schools(id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS mapping_logs (
      id SERIAL PRIMARY KEY,
      import_id INTEGER REFERENCES imports(id),
      action TEXT NOT NULL,
      school_id INTEGER REFERENCES schools(id),
      student_processed_id INTEGER,
      message TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
}
