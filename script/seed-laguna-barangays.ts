import { getDb } from "../server/db";
import { schoolRegistry } from "../shared/schema";
import ph from "phil-reg-prov-mun-brgy";
import { eq, and } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config();

const LAGUNA_PROV_CODE = "0434";

// Approximate center coordinates for Laguna municipalities to place their barangays around
const MUN_COORDS: Record<string, { lat: number; lng: number }> = {
  "BIÑAN CITY": { lat: 14.3316, lng: 121.0827 },
  "CITY OF SAN PEDRO": { lat: 14.3541, lng: 121.0504 },
  "CITY OF SANTA ROSA": { lat: 14.3146, lng: 121.1114 },
  "CITY OF CALAMBA": { lat: 14.2065, lng: 121.1663 },
  "LOS BAÑOS": { lat: 14.1706, lng: 121.2334 },
  "CABUYAO CITY": { lat: 14.2750, lng: 121.1235 },
  "SAN PABLO CITY": { lat: 14.0722, lng: 121.3250 },
  "SANTA CRUZ": { lat: 14.2797, lng: 121.4148 },
  "ALAMINOS": { lat: 14.0628, lng: 121.2488 },
  "BAY": { lat: 14.1822, lng: 121.2858 },
  "CALAUAN": { lat: 14.1492, lng: 121.3147 },
  "CAVINTI": { lat: 14.2444, lng: 121.5036 },
  "FAMY": { lat: 14.4367, lng: 121.4480 },
  "KALAYAAN": { lat: 14.3400, lng: 121.4819 },
  "LILIW": { lat: 14.1294, lng: 121.4361 },
  "LUISIANA": { lat: 14.1842, lng: 121.5064 },
  "LUMBAN": { lat: 14.3000, lng: 121.4619 },
  "MABITAC": { lat: 14.4267, lng: 121.4339 },
  "MAGDALENA": { lat: 14.2003, lng: 121.4281 },
  "MAJAYJAY": { lat: 14.1086, lng: 121.5117 },
  "NAGCARLAN": { lat: 14.1367, lng: 121.4158 },
  "PAETE": { lat: 14.3644, lng: 121.4800 },
  "PAGSANJAN": { lat: 14.2722, lng: 121.4539 },
  "PAKIL": { lat: 14.3814, lng: 121.4822 },
  "PANGIL": { lat: 14.4022, lng: 121.4689 },
  "PILA": { lat: 14.2344, lng: 121.3664 },
  "RIZAL": { lat: 14.1081, lng: 121.3917 },
  "SANTA MARIA": { lat: 14.4697, lng: 121.4261 },
  "SINILOAN": { lat: 14.4194, lng: 121.4464 },
  "VICTORIA": { lat: 14.2239, lng: 121.3325 },
};

async function run() {
  console.log("Starting Laguna Barangay Seeding...");
  const municipalities = ph.getCityMunByProvince(LAGUNA_PROV_CODE);
  
  let totalInserted = 0;

  for (const mun of municipalities) {
    const barangays = ph.getBarangayByMun(mun.mun_code);
    const munName = mun.name;
    const center = MUN_COORDS[munName] || { lat: 14.2797, lng: 121.4148 }; // Default to Santa Cruz

    console.log(`Processing ${munName}... found ${barangays.length} barangays.`);

    for (let i = 0; i < barangays.length; i++) {
      const brgy = barangays[i];
      const brgyName = brgy.name;
      
      // Scatter coordinates slightly so they don't overlap completely
      const angle = (i / barangays.length) * Math.PI * 2;
      const radius = 0.015; // approx 1.5km
      const lat = center.lat + Math.cos(angle) * radius;
      const lng = center.lng + Math.sin(angle) * radius;

      // Check if it already exists
      const existing = await getDb().select().from(schoolRegistry).where(
        and(
          eq(schoolRegistry.schoolName, brgyName),
          eq(schoolRegistry.municipality, munName),
          eq(schoolRegistry.schoolType, "Barangay")
        )
      ).limit(1);

      if (existing.length === 0) {
        await getDb().insert(schoolRegistry).values({
          schoolName: brgyName,
          normalizedSchoolName: brgyName.toLowerCase().replace(/[^a-z0-9]/g, ""),
          schoolType: "Barangay",
          sector: "Public",
          municipality: munName,
          province: "Laguna",
          barangay: brgyName,
          address: `${brgyName}, ${munName}, Laguna`,
          latitude: lat,
          longitude: lng,
          source: "psgc_seeder",
        });
        totalInserted++;
      }
    }
  }

  console.log(`Done! Inserted ${totalInserted} barangays into the School Registry.`);
  process.exit(0);
}

run().catch(console.error);
