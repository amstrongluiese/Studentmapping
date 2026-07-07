import * as xlsx from "xlsx";
import * as fs from "fs";
import { getDb, getPool } from "./server/db";
import { schoolRegistry, schoolAliases, studentImports, studentsRaw } from "./shared/schema";
import { normalizeSchoolName } from "./shared/schoolRegistry";
import { resolve } from "path";
import * as dotenv from "dotenv";
import { eq } from "drizzle-orm";

dotenv.config();

function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

async function run() {
  try {
    console.log("Loading Geocoded Excel file...");
    const filePath = "c:/Users/PC/Documents/GitHub/Studentmapping/Geocoded_Unmatched_Schools_Geocoding.xlsx";
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = xlsx.read(fileBuffer, { type: "buffer" });
    const data = xlsx.utils.sheet_to_json<any>(workbook.Sheets[workbook.SheetNames[0]]);
    console.log(`Parsed ${data.length} rows from Excel.`);

    const db = getDb();
    const existingSchools = await db.select().from(schoolRegistry);
    const existingAliases = await db.select().from(schoolAliases);

    const newSchools = [];
    const newAliases = [];
    
    let processed = 0;

    for (const row of data) {
      const rawName = row["School Name"] || row["school_name"] || row.SchoolName || row.name || row.Name;
      if (!rawName) continue;
      
      const normalized = normalizeSchoolName(rawName);
      let lat = parseFloat(row["Latitude"] || row.latitude || row.lat);
      let lng = parseFloat(row["Longitude"] || row.longitude || row.lng);
      
      let isDuplicate = false;

      // 1. Check exact name match
      if (existingSchools.find(s => s.normalizedSchoolName === normalized || normalizeSchoolName(s.schoolName) === normalized)) {
        isDuplicate = true;
      }
      
      // 2. Check alias match
      if (!isDuplicate && existingAliases.find(a => normalizeSchoolName(a.aliasName) === normalized)) {
        isDuplicate = true;
      }

      // 3. Check spatial duplicate (within 50 meters)
      if (!isDuplicate && !isNaN(lat) && !isNaN(lng)) {
        const spatialMatch = existingSchools.find(s => {
          if (!s.latitude || !s.longitude) return false;
          return getDistanceInMeters(lat, lng, s.latitude, s.longitude) < 50;
        });
        
        if (spatialMatch) {
          // It's the exact same location! Create an alias instead of a new school.
          newAliases.push({
            schoolRegistryId: spatialMatch.id,
            aliasName: rawName,
            normalizedAlias: normalized
          });
          isDuplicate = true;
        }
      }

      if (!isDuplicate) {
        newSchools.push({
          schoolName: rawName,
          normalizedSchoolName: normalized,
          schoolType: "Unknown",
          sector: "Unknown",
          address: row.Address || row.address || "",
          municipality: row.Municipality || row.municipality || "Laguna",
          province: "Laguna",
          latitude: !isNaN(lat) ? lat : null,
          longitude: !isNaN(lng) ? lng : null,
          source: "Geocoding API Import",
          isActive: true
        });
      }
      processed++;
    }

    console.log(`Found ${newSchools.length} new schools and ${newAliases.length} new aliases to insert.`);

    if (newSchools.length > 0) {
      console.log("Inserting new schools into schoolRegistry...");
      
      // Deduplicate newSchools by normalizedSchoolName to avoid internal conflicts
      const uniqueSchoolsMap = new Map();
      for (const s of newSchools) {
        uniqueSchoolsMap.set(s.normalizedSchoolName, s);
      }
      const uniqueSchools = Array.from(uniqueSchoolsMap.values());

      const chunkSize = 100;
      for (let i = 0; i < uniqueSchools.length; i += chunkSize) {
        await db.insert(schoolRegistry)
                .values(uniqueSchools.slice(i, i + chunkSize))
                .onConflictDoNothing();
      }
    }

    if (newAliases.length > 0) {
      console.log("Inserting new aliases into schoolAliases...");
      
      // Deduplicate newAliases by normalizedAlias to avoid internal conflicts
      const uniqueAliasesMap = new Map();
      for (const a of newAliases) {
        uniqueAliasesMap.set(a.normalizedAlias, a);
      }
      const uniqueAliases = Array.from(uniqueAliasesMap.values());
      
      const chunkSize = 100;
      for (let i = 0; i < uniqueAliases.length; i += chunkSize) {
        await db.insert(schoolAliases)
                .values(uniqueAliases.slice(i, i + chunkSize))
                .onConflictDoNothing();
      }
    }

    console.log("Cleaning imported data (studentImports and studentsRaw) so we can test fresh matching...");
    await db.delete(studentImports);
    await db.delete(studentsRaw);

    console.log("Done! The database has been updated with the new Geocoded data and the import tables have been cleared.");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await getPool().end();
    process.exit(0);
  }
}

run();
