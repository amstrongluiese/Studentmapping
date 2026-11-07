import "dotenv/config";
import { getDb } from "../server/db";
import { sql } from "drizzle-orm";

async function linkUnmatched() {
  const db = getDb();
  console.log("Linking common aliases and typos to official school_registry IDs...");

  // 1. St. Ignatius Technical Institute of Business and Arts (ID 6462)
  const [r1]: any = await db.execute(sql`
    UPDATE students_processed 
    SET school_registry_id = 6462, mapping_status = 'matched' 
    WHERE school_registry_id IS NULL 
      AND (
        lower(trim(last_school_name)) = 'st. ignatius technical institute of business arts'
        OR lower(trim(last_school_name)) = 'saint ignatius technical institute of business and arts'
        OR lower(trim(last_school_name)) LIKE '%ignatius technical institute%'
      )
  `);
  console.log(`- Linked St. Ignatius students: ${r1.affectedRows || r1.rowCount || 0}`);

  // 2. Biñan Integrated National High School (ID 5656)
  const [r2]: any = await db.execute(sql`
    UPDATE students_processed 
    SET school_registry_id = 5656, mapping_status = 'matched' 
    WHERE school_registry_id IS NULL 
      AND (
        lower(trim(last_school_name)) = 'binhs'
        OR lower(trim(last_school_name)) LIKE 'binhs %'
      )
  `);
  console.log(`- Linked BINHS students: ${r2.affectedRows || r2.rowCount || 0}`);

  // 3. Liceo De Sto. Tomas De Aquinas (ID 6964)
  const [r3]: any = await db.execute(sql`
    UPDATE students_processed 
    SET school_registry_id = 6964, mapping_status = 'matched' 
    WHERE school_registry_id IS NULL 
      AND lower(trim(last_school_name)) LIKE '%liceo de sto%aquinas%'
  `);
  console.log(`- Linked Liceo Aquinas students: ${r3.affectedRows || r3.rowCount || 0}`);

  // 4. UPHSL (ID 6600)
  const [r4]: any = await db.execute(sql`
    UPDATE students_processed 
    SET school_registry_id = 6600, mapping_status = 'matched' 
    WHERE school_registry_id IS NULL 
      AND lower(trim(last_school_name)) = 'uphsl'
  `);
  console.log(`- Linked UPHSL students: ${r4.affectedRows || r4.rowCount || 0}`);

  // Recount matching accuracy
  const [mappingStats]: any = await db.execute(sql`
    SELECT 
      count(*) as total,
      count(CASE WHEN sp.school_registry_id IS NOT NULL THEN 1 END) as matched_count,
      count(CASE WHEN sr.latitude IS NOT NULL AND sr.latitude BETWEEN 13.78 AND 14.58 AND sr.longitude BETWEEN 120.88 AND 121.72 THEN 1 END) as mapped_laguna_gis
    FROM students_processed sp
    LEFT JOIN school_registry sr ON sp.school_registry_id = sr.id
  `);

  const stat = mappingStats[0];
  console.log("\nUPDATED ACCURACY STATS:");
  console.log(`- Matched: ${stat.matched_count} / ${stat.total} (${Math.round((stat.matched_count / stat.total) * 100)}%)`);
  console.log(`- Plotted on Laguna GIS: ${stat.mapped_laguna_gis} / ${stat.total} (${Math.round((stat.mapped_laguna_gis / stat.total) * 100)}%)`);

  process.exit(0);
}

linkUnmatched();
