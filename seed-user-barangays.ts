import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { getDb } from "./server/db";
import { barangayRegistry } from "./shared/schema";
import { eq } from "drizzle-orm";

async function run() {
  const db = getDb();

  console.log("1. Reading current geocoded coordinates to preserve them...");
  const currentRegistry = await db.select().from(barangayRegistry);
  
  // Store coordinates in a map: key = municipality__barangay (normalized) -> coordinates
  const coordMap = new Map<string, { lat: number; lon: number }>();
  
  const cleanStr = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, "").trim();

  for (const b of currentRegistry) {
    if (b.latitude && b.longitude && b.municipality && b.barangayName) {
      const key = `${cleanStr(b.municipality)}__${cleanStr(b.barangayName)}`;
      coordMap.set(key, {
        lat: Number(b.latitude),
        lon: Number(b.longitude)
      });
    }
  }

  console.log(`Preserved coordinates for ${coordMap.size} unique barangays.`);

  console.log("\n2. Truncating current barangay registry...");
  // Use delete without where clause to truncate safely across MariaDB / MySQL
  await db.delete(barangayRegistry);
  console.log("Registry cleared.");

  console.log("\n3. Parsing user's raw barangay list...");
  const rawFilePath = path.join(process.cwd(), "barangays-raw.txt");
  const fileContent = fs.readFileSync(rawFilePath, "utf8");
  const lines = fileContent.split(/\r?\n/).map(line => line.trim()).filter(Boolean);

  console.log(`Found ${lines.length} lines in raw file.`);
  
  let insertedCount = 0;
  let preservedCount = 0;

  for (const line of lines) {
    const lastComma = line.lastIndexOf(",");
    if (lastComma === -1) {
      console.warn(`Skipping invalid line: "${line}"`);
      continue;
    }

    const barangayName = line.slice(0, lastComma).trim();
    const municipality = line.slice(lastComma + 1).trim();
    const normalizedName = barangayName.toLowerCase();

    // Check if we have preserved coordinates for this barangay
    const lookupKey = `${cleanStr(municipality)}__${cleanStr(barangayName)}`;
    const preservedCoords = coordMap.get(lookupKey);

    const insertData: any = {
      province: "Laguna",
      municipality,
      barangayName,
      normalizedName,
      isActive: true,
    };

    if (preservedCoords) {
      insertData.latitude = preservedCoords.lat;
      insertData.longitude = preservedCoords.lon;
      preservedCount++;
    }

    await db.insert(barangayRegistry).values(insertData);
    insertedCount++;
  }

  console.log(`\nSeeding completed!`);
  console.log(`Total barangays inserted: ${insertedCount}`);
  console.log(`Coordinates preserved from previous runs: ${preservedCount}`);
}

run().catch(console.error);
