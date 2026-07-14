import fs from 'fs';
import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  console.log('Dropping public schema...');
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  
  console.log('Executing database_dump.sql...');
  const sql = fs.readFileSync('database_dump.sql', 'utf8');
  await pool.query(sql);
  
  console.log('Database restored successfully.');
  process.exit(0);
}

run().catch(err => {
  console.error('Error restoring database:', err);
  process.exit(1);
});
