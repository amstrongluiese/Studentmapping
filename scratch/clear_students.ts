import { initializeDatabase, getDb } from "../server/db";
import { studentImports, students, studentsProcessed, studentsRaw, imports, schoolMatchHistory } from "../shared/schema";
import { sql } from "drizzle-orm";

async function clearStudents() {
  initializeDatabase();
  const db = getDb();
  console.log("Starting deletion...");
  try {
    await db.delete(studentsProcessed);
    console.log("Cleared students_processed table.");
    
    await db.delete(studentsRaw);
    console.log("Cleared students_raw table.");
    
    await db.delete(imports);
    console.log("Cleared imports table.");

    await db.delete(studentImports);
    console.log("Cleared student_imports table.");

    await db.delete(students);
    console.log("Cleared students table.");

    console.log("Successfully cleared all student data. Ready for fresh import.");
  } catch (error) {
    console.error("Error clearing students:", error);
  } finally {
    process.exit(0);
  }
}

clearStudents();
