import { testDatabaseConnection, getDb } from './server/db';
import { systemSettings } from './shared/schema';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  console.log('Testing...');
  await testDatabaseConnection();
  const db = getDb();
  console.log('Querying...');
  const res = await db.select().from(systemSettings);
  console.log(res);
  process.exit(0);
}

run().catch(console.error);
