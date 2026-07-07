import { getDb } from "../server/db";
import { mappingLogs, studentsProcessed, studentsRaw, studentImports, imports, students, referrals } from "../shared/schema";

async function clearData() {
  const db = getDb();
  console.log("Clearing mapping logs...");
  await db.delete(mappingLogs);
  
  console.log("Clearing processed students...");
  await db.delete(studentsProcessed);
  
  console.log("Clearing raw students...");
  await db.delete(studentsRaw);
  
  console.log("Clearing staging student imports...");
  await db.delete(studentImports);
  
  console.log("Clearing import sessions...");
  await db.delete(imports);
  
  console.log("Clearing referrals...");
  await db.delete(referrals);
  
  console.log("Clearing base students...");
  await db.delete(students);
  
  console.log("Data cleared successfully.");
}

clearData().catch(console.error).finally(() => process.exit(0));
