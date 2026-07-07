import * as xlsx from "xlsx";
import { getDb, getPool } from "./server/db";
import { schoolRegistry, schoolAliases } from "./shared/schema";
import { normalizeSchoolName } from "./shared/schoolRegistry";
import { resolve } from "path";
import * as dotenv from "dotenv";
import * as fs from "fs";

dotenv.config();

function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
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
    console.log("Loading Excel file...");
    const filePath = resolve(process.cwd(), "Geocoded_Unmatched_Schools_Geocoding.xlsx");
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = xlsx.read(fileBuffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json<any>(sheet);

    console.log(`Parsed ${data.length} rows from Excel.`);

    const db = getDb();
    const existingSchools = await db.select().from(schoolRegistry);
    const existingAliases = await db.select().from(schoolAliases);

    console.log(`Loaded ${existingSchools.length} schools and ${existingAliases.length} aliases from DB.`);

    const duplicatesByName = [];
    const duplicatesByAlias = [];
    const duplicatesByLocation = [];
    const newSchools = [];
    
    let processed = 0;

    for (const row of data) {
      const rawName = row["School Name"] || row["school_name"] || row.SchoolName || row.name || row.Name;
      if (!rawName) continue;
      
      const normalized = normalizeSchoolName(rawName);
      let lat = parseFloat(row["Latitude"] || row.latitude || row.lat);
      let lng = parseFloat(row["Longitude"] || row.longitude || row.lng);
      
      let isDuplicate = false;

      // 1. Check exact name match in registry
      const nameMatch = existingSchools.find(s => s.normalizedSchoolName === normalized || normalizeSchoolName(s.schoolName) === normalized);
      if (nameMatch) {
        duplicatesByName.push({ rawName, matchedWith: nameMatch.schoolName, type: "Name Match" });
        isDuplicate = true;
      }
      
      // 2. Check alias match
      if (!isDuplicate) {
        const aliasMatch = existingAliases.find(a => normalizeSchoolName(a.alias) === normalized);
        if (aliasMatch) {
          const parentSchool = existingSchools.find(s => s.id === aliasMatch.schoolId);
          duplicatesByAlias.push({ rawName, matchedWith: parentSchool?.schoolName || `School ID ${aliasMatch.schoolId}`, type: "Alias Match" });
          isDuplicate = true;
        }
      }

      // 3. Check spatial duplicate (within 50 meters)
      if (!isDuplicate && !isNaN(lat) && !isNaN(lng)) {
        const spatialMatch = existingSchools.find(s => {
          if (!s.latitude || !s.longitude) return false;
          const dist = getDistanceInMeters(lat, lng, s.latitude, s.longitude);
          return dist < 50; // less than 50 meters
        });
        
        if (spatialMatch) {
          const dist = getDistanceInMeters(lat, lng, spatialMatch.latitude!, spatialMatch.longitude!);
          duplicatesByLocation.push({ rawName, matchedWith: spatialMatch.schoolName, distance: Math.round(dist), type: "Location Match" });
          isDuplicate = true;
        }
      }

      if (!isDuplicate) {
        newSchools.push({
          rawName,
          lat,
          lng,
          address: row.Address || row.address || ""
        });
      }
      
      processed++;
    }

    console.log("\n================ REPORT ================");
    console.log(`Total processed from Excel: ${processed}`);
    console.log(`Duplicates by Name: ${duplicatesByName.length}`);
    console.log(`Duplicates by Alias: ${duplicatesByAlias.length}`);
    console.log(`Duplicates by Location (<50m): ${duplicatesByLocation.length}`);
    console.log(`Completely New Schools: ${newSchools.length}`);
    
    if (duplicatesByName.length > 0) {
      console.log("\n--- Sample Name Duplicates ---");
      duplicatesByName.slice(0, 5).forEach(d => console.log(`"${d.rawName}" -> matched -> "${d.matchedWith}"`));
    }

    if (duplicatesByLocation.length > 0) {
      console.log("\n--- Sample Location Duplicates ---");
      duplicatesByLocation.slice(0, 5).forEach(d => console.log(`"${d.rawName}" -> matched -> "${d.matchedWith}" (${d.distance}m away)`));
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await getPool().end();
    process.exit(0);
  }
}

run();
