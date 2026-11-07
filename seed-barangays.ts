import "dotenv/config";
import { getDb } from "./server/db";
import { barangayRegistry } from "./shared/schema";
import { eq, and } from "drizzle-orm";

const targetCities = [
  "City of Biñan",
  "City of Cabuyao",
  "City of Calamba",
  "City of San Pablo",
  "City of Santa Rosa",
  "City of San Pedro"
];

// Normalize city names for comparison
const normalizeCity = (c: string) => c.replace("City of ", "").trim().toLowerCase().replace("ñ", "n");

async function geocode(barangay: string, city: string) {
  const query = `${barangay}, ${city}, Laguna, Philippines`;
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
  console.log("Fetching Laguna cities...");
  const citiesRes = await fetch("https://psgc.gitlab.io/api/provinces/043400000/cities-municipalities");
  const citiesData = await citiesRes.json();
  
  const selectedCities = citiesData.filter((c: any) => 
    targetCities.some(tc => normalizeCity(tc) === normalizeCity(c.name))
  );

  console.log(`Found ${selectedCities.length} target cities.`);
  
  const db = getDb();
  let totalInserted = 0;

  for (const city of selectedCities) {
    const cityName = city.name.replace("City of ", "");
    console.log(`\nFetching barangays for ${cityName}...`);
    
    const brgyRes = await fetch(`https://psgc.gitlab.io/api/cities-municipalities/${city.code}/barangays`);
    const brgys = await brgyRes.json();
    
    console.log(`Found ${brgys.length} barangays for ${cityName}. Geocoding and inserting...`);
    
    for (const brgy of brgys) {
      const brgyName = brgy.name;
      
      // Check if already exists
      const existing = await db.select().from(barangayRegistry).where(
        and(
          eq(barangayRegistry.municipality, cityName),
          eq(barangayRegistry.barangayName, brgyName)
        )
      ).limit(1);
      
      if (existing.length > 0) {
        console.log(`Skipping ${brgyName}, ${cityName} (already exists)`);
        continue;
      }

      // Geocode
      // Sleep for 1s to respect Nominatim rate limits (1 req/sec)
      await new Promise(r => setTimeout(r, 1200));
      const coords = await geocode(brgyName, cityName);
      
      if (coords) {
        await db.insert(barangayRegistry).values({
          municipality: cityName,
          barangayName: brgyName,
          latitude: String(coords.lat),
          longitude: String(coords.lon),
          isActive: true
        });
        console.log(`Inserted ${brgyName}, ${cityName} [${coords.lat}, ${coords.lon}]`);
        totalInserted++;
      } else {
        // Insert without coords
        await db.insert(barangayRegistry).values({
          municipality: cityName,
          barangayName: brgyName,
          isActive: true
        });
        console.log(`Inserted ${brgyName}, ${cityName} [NO COORDS FOUND]`);
        totalInserted++;
      }
    }
  }
  
  console.log(`\nDone! Successfully seeded ${totalInserted} new barangays.`);
}

run().catch(console.error);
