import "dotenv/config";
import { getDb } from "./server/db";
import { barangayRegistry } from "./shared/schema";
import { eq, and } from "drizzle-orm";

async function geocode(barangay: string, municipality: string) {
  const query = `${barangay}, ${municipality}, Laguna, Philippines`;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
  
  try {
    const res = await fetch(url, { headers: { "User-Agent": "StudentMappingSeed/1.0" } });
    const data = await res.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
      };
    }
  } catch (e) {
    console.error(`Geocode failed for ${query}`);
  }
  return null;
}

async function run() {
  console.log("Fetching all Laguna municipalities...");
  const munRes = await fetch("https://psgc.gitlab.io/api/provinces/043400000/cities-municipalities");
  const municipalities = await munRes.json();
  
  const munMap = new Map();
  for (const m of municipalities) {
    munMap.set(m.code, m.name.replace("City of ", ""));
  }

  console.log("Fetching all Laguna barangays...");
  const brgyRes = await fetch("https://psgc.gitlab.io/api/provinces/043400000/barangays");
  const barangays = await brgyRes.json();
  
  console.log(`Found ${barangays.length} total barangays in Laguna.`);
  
  const db = getDb();
  let totalInserted = 0;

  for (const brgy of barangays) {
    const brgyName = brgy.name;
    const munName = munMap.get(brgy.municipalityCode) || munMap.get(brgy.cityCode);
    
    if (!munName) {
      console.log(`Warning: Could not find municipality for ${brgyName}`);
      continue;
    }

    // Check if already exists
    const existing = await db.select().from(barangayRegistry).where(
      and(
        eq(barangayRegistry.municipality, munName),
        eq(barangayRegistry.barangayName, brgyName)
      )
    ).limit(1);
    
    if (existing.length > 0) {
      // Already seeded
      continue;
    }

    // Geocode (with rate limit delay)
    await new Promise(r => setTimeout(r, 1200));
    const coords = await geocode(brgyName, munName);
    
    if (coords) {
      await db.insert(barangayRegistry).values({
        municipality: munName,
        barangayName: brgyName,
        latitude: coords.lat,
        longitude: coords.lon,
        isActive: true
      });
      console.log(`Inserted ${brgyName}, ${munName} [${coords.lat}, ${coords.lon}]`);
      totalInserted++;
    } else {
      // Insert without coords
      await db.insert(barangayRegistry).values({
        municipality: munName,
        barangayName: brgyName,
        isActive: true
      });
      console.log(`Inserted ${brgyName}, ${munName} [NO COORDS]`);
      totalInserted++;
    }
  }
  
  console.log(`\nDone! Successfully seeded ${totalInserted} missing barangays for all of Laguna.`);
}

run().catch(console.error);
