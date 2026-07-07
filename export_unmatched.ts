import { getDb, getPool } from "./server/db";
import { studentImports } from "./shared/schema";
import * as fs from "fs";
import { resolve } from "path";
import * as dotenv from "dotenv";

dotenv.config();

async function run() {
  try {
    const db = getDb();
    
    // Fetch all student imports
    const imports = await db
      .select()
      .from(studentImports);

    // Get unique unmatched school names
    const unmatchedNames = Array.from(new Set(
      imports
        .filter(r => r.importStatus === "Unmatched")
        .map(r => r.previousSchool)
        .filter(Boolean)
    )) as string[];

    console.log(`Found ${unmatchedNames.length} unique unmatched schools.`);

    if (unmatchedNames.length === 0) {
      console.log("No unmatched schools to export.");
      process.exit(0);
    }

    // Prepare CSV data
    const headers = [
      "School Name",
      "Latitude",
      "Longitude",
      "Address",
      "Notes"
    ];

    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return "";
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = unmatchedNames.map(name => [
      escapeCsv(name),
      "", // Placeholder for user to fill in
      "",
      "",
      ""
    ].join(","));

    const csvContent = [headers.join(","), ...rows].join("\n");
    const outputPath = resolve(process.cwd(), "Unmatched_Schools_Geocoding.csv");
    
    fs.writeFileSync(outputPath, csvContent);
    console.log(`Successfully exported to ${outputPath}`);
    
  } catch (error) {
    console.error("Error exporting:", error);
  } finally {
    const pool = getPool();
    await pool.end();
    process.exit(0);
  }
}

run();
