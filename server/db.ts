import { getMysqlDb, getMysqlPool, initializeMysqlDatabase, testMysqlDatabaseConnection } from "./dbMysql";

// Re-export MySQL implementations as the primary DB provider
export function initializeDatabase() {
  return initializeMysqlDatabase();
}

export function getPool() {
  return getMysqlPool();
}

export function getDb() {
  return getMysqlDb();
}

export async function testDatabaseConnection() {
  return testMysqlDatabaseConnection();
}
