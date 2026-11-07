import "dotenv/config";
import { getDb } from "../server/db";
import { schoolRegistry, studentsProcessed } from "../shared/schemaMysql";
import { like, eq, inArray } from "drizzle-orm";

async function fixJacobo() {
  const db = getDb();
  const jacoboList = await db.select().from(schoolRegistry).where(like(schoolRegistry.schoolName, "%Jacobo%"));
  
  console.log(`Found ${jacoboList.length} Jacobo schools.`);
  jacoboList.forEach(s => console.log(`- ID: ${s.id} | Name: "${s.schoolName}" | Lat: ${s.latitude}, Lng: ${s.longitude} | Type: ${s.schoolType}`));

  // Identify target (most complete name)
  const target = jacoboList.find(s => s.schoolName.includes("Arts and Trades")) || jacoboList[0];
  const duplicates = jacoboList.filter(s => s.id !== target.id);

  console.log(`Target master school: ID ${target.id} - "${target.schoolName}"`);
  console.log(`Duplicates to merge (${duplicates.length}):`, duplicates.map(d => d.id));

  // Update target schoolType if Unknown
  await db.update(schoolRegistry).set({
    schoolType: "Technical-Vocational / TESDA",
    sector: "Public",
    municipality: "Biñan"
  }).where(eq(schoolRegistry.id, target.id));

  // Re-link all studentsProcessed from duplicate IDs to target ID
  const dupIds = duplicates.map(d => d.id);
  if (dupIds.length > 0) {
    const updatedStudents = await db.update(studentsProcessed)
      .set({ schoolRegistryId: target.id })
      .where(inArray(studentsProcessed.schoolRegistryId, dupIds));
    
    // Delete duplicate school rows
    await db.delete(schoolRegistry).where(inArray(schoolRegistry.id, dupIds));
    console.log(`Successfully merged ${duplicates.length} duplicate Jacobo schools into Master ID ${target.id}!`);
  }

  process.exit(0);
}

fixJacobo().catch(console.error);
