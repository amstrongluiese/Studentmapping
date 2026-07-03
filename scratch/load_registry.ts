import { initializeDatabase, getDb } from "../server/db";
import { schoolRegistry, schoolAliases, schoolMatchHistory, studentImports } from "../shared/schema";
import xlsx from "xlsx";
import { sql } from "drizzle-orm";
import { normalizeSchoolName } from "../shared/schoolRegistry";

async function loadRegistry() {
  initializeDatabase();
  const db = getDb();
  const filePath = 'C:/Users/PC/Documents/GitHub/Studentmapping/Geocoded_region_4a_shs_masterlist.csv.xlsx';
  
  console.log("Reading Excel file...");
  const workbook = xlsx.readFile(filePath);
  const data = xlsx.utils.sheet_to_json<any>(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
  
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
        // Extract municipality from address if possible (very basic heuristics)
        let municipality = "Laguna";
        let province = "Laguna";
        
        const addr = String(row["Address"]).toLowerCase();
        // Since this is Region 4A, it could be Batangas, Cavite, Laguna, Rizal, Quezon
        if (addr.includes("batangas")) province = "Batangas";
        else if (addr.includes("cavite")) province = "Cavite";
        else if (addr.includes("rizal")) province = "Rizal";
        else if (addr.includes("quezon")) province = "Quezon";
        
        return {
          schoolId: String(row["School ID"]),
          schoolName: String(row["School Name"]),
          normalizedSchoolName: normalizeSchoolName(String(row["School Name"])),
          schoolType: String(row["School Type"]),
          sector: "Unknown", 
          address: String(row["Address"]),
          municipality,
          province,
          latitude: Number(row["Latitude"]) || null,
          longitude: Number(row["Longitude"]) || null,
          source: "Geocoded Region 4A Masterlist",
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
