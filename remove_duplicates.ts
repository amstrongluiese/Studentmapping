import * as dotenv from "dotenv";
dotenv.config();
import { getDb, getPool } from "./server/db";
import { schoolRegistry, schoolAliases } from "./shared/schema";
import { normalizeSchoolName } from "./shared/schoolRegistry";
import { eq, inArray } from "drizzle-orm";

async function run() {
  try {
    const db = getDb();
    const schools = await db.select().from(schoolRegistry);
    
    // Group by normalized name
    const byName = new Map<string, typeof schools[0][]>();
    schools.forEach(s => {
      const key = normalizeSchoolName(s.normalizedSchoolName || s.schoolName);
      if (key) {
        byName.set(key, [...(byName.get(key) || []), s]);
      }
    });

    const duplicates = Array.from(byName.values()).filter(g => g.length > 1);
    console.log(`Found ${duplicates.length} duplicate groups.`);

    let deletedCount = 0;

    for (const group of duplicates) {
      // Sort to find the best primary:
      // 1. isActive true first
      // 2. Has coordinates first
      // 3. Lowest ID first
      group.sort((a, b) => {
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        
        const aHasCoords = a.latitude !== null && a.longitude !== null;
        const bHasCoords = b.latitude !== null && b.longitude !== null;
        if (aHasCoords && !bHasCoords) return -1;
        if (!aHasCoords && bHasCoords) return 1;
        
        return a.id - b.id;
      });

      const primary = group[0];
      const others = group.slice(1);
      const otherIds = others.map(s => s.id);

      console.log(`Keeping primary: [${primary.id}] ${primary.schoolName}`);
      console.log(`Removing duplicates: ${otherIds.join(", ")}`);

      // Update any aliases that point to the ones we are deleting to point to the primary instead
      for (const otherId of otherIds) {
        await db.update(schoolAliases)
          .set({ schoolRegistryId: primary.id })
          .where(eq(schoolAliases.schoolRegistryId, otherId));
      }

      // Delete the duplicate schools
      if (otherIds.length > 0) {
        await db.delete(schoolRegistry).where(inArray(schoolRegistry.id, otherIds));
        deletedCount += otherIds.length;
      }
    }

    console.log(`Successfully deleted ${deletedCount} duplicate schools.`);
  } finally {
    await getPool().end();
  }
}

run().catch(console.error);
