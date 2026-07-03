import { initializeDatabase, getDb } from "../server/db";
import { schoolRegistry, schoolAliases, schoolMatchHistory, studentImports } from "../shared/schema";
import xlsx from "xlsx";
import { sql } from "drizzle-orm";
import { normalizeSchoolName } from "../shared/schoolRegistry";

import path from "path";

async function loadRegistry() {
  initializeDatabase();
  const db = getDb();
  
  const filePath = path.join(process.cwd(), 'School_Masterlist.xlsx');
  
  console.log("Reading Excel file...");
  let data = [];
  try {
    const workbook = xlsx.readFile(filePath);
    data = xlsx.utils.sheet_to_json<any>(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
  } catch (err) {
    console.error("Failed to read Excel file:", err);
    process.exit(1);
  }
  
  console.log(`Found ${data.length} records. Clearing old registry...`);
  
  try {
    // Clear dependents
    await db.delete(schoolAliases);
    await db.delete(schoolMatchHistory);
    await db.delete(studentImports);
    
    // Clear registry
    await db.delete(schoolRegistry);
    console.log("Cleared old registry and aliases.");
    
    console.log("Inserting new records...");
    
    const BATCH_SIZE = 50;
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE).map(row => {
        const address = String(row["Address"] || "");
        const schoolName = String(row["School Name"] || "");
        
        let municipality = "Unspecified";
        let province = "Region IV-A";
        
        const muniProv = String(row["Municipality & Province"] || "");
        if (muniProv) {
          const parts = muniProv.split(",");
          if (parts.length >= 2) {
            municipality = parts[0].trim();
            province = parts[1].trim();
          } else if (parts.length === 1) {
            municipality = parts[0].trim();
          }
        }
        
        return {
          schoolId: row["School ID"] ? String(row["School ID"]) : null, // Handle if they add it back later
          schoolName,
          normalizedSchoolName: normalizeSchoolName(schoolName),
          schoolType: String(row["School Type"] || "Grade 11-12"),
          sector: "Unknown", 
          address,
          municipality,
          province,
          latitude: Number(row["Latitude"]) || null,
          longitude: Number(row["Longitude"]) || null,
          source: "Masterlist 2026",
          isActive: true
        };
      });
      
      await db.insert(schoolRegistry).values(batch);
    }
    
    console.log(`Successfully loaded ${data.length} schools into the registry!`);
  } catch (err) {
    console.error("Error loading registry:", err);
  } finally {
    process.exit(0);
  }
}

loadRegistry();
