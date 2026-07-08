import { getDb, getPool } from './server/db.js';
import { mappingLogs, studentsProcessed, studentsRaw, studentImports, imports, referrals } from './shared/schema.js';

async function clear() {
  const db = getDb();
  console.log('Clearing data...');
  await db.delete(mappingLogs);
  await db.delete(studentsProcessed);
  await db.delete(studentsRaw);
  await db.delete(studentImports);
  await db.delete(imports);
  await db.delete(referrals);
  console.log('Done clearing! Masterlist and Aliases are preserved.');
  getPool().end();
}

clear().catch(console.error);
