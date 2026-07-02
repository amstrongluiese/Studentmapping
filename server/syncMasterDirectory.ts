import * as xlsx from "xlsx";
import * as fs from "fs";
import * as path from "path";

import { normalizeSchoolName } from "@shared/schoolRegistry";
import type { InsertSchoolRegistry } from "@shared/schema";

export const DIRECTORY_JSON_PATH = path.join(process.cwd(), "server", "data", "schools_directory.json");

export function parseExcelToJSON(excelFilePath: string): InsertSchoolRegistry[] {
  if (!fs.existsSync(excelFilePath)) {
    throw new Error(`Excel file not found at path: ${excelFilePath}`);
  }

  const buf = fs.readFileSync(excelFilePath);
  const wb = xlsx.read(buf, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows: any[] = xlsx.utils.sheet_to_json(sheet);

  const parsed: InsertSchoolRegistry[] = rows.map((row) => {
    const rawName = row["Canonical School Name"]?.toString() || row["DepEd School Name"]?.toString() || "";
    return {
      schoolId: row["Directory ID"]?.toString() || row["DepEd School ID"]?.toString() || null,
      schoolName: rawName,
      normalizedSchoolName: normalizeSchoolName(rawName),
      municipality: row["Municipality/City"]?.toString() || "Laguna",
      province: row["Province"]?.toString() || "Laguna",
      latitude: row["Latitude"] ? parseFloat(row["Latitude"]) : null,
      longitude: row["Longitude"] ? parseFloat(row["Longitude"]) : null,
      schoolType: row["SHS Type"]?.toString() || row["School Category"]?.toString() || null,
      source: "Master Directory 2026",
      isActive: true,
    };
  }).filter((school) => school.schoolName);

  return parsed;
}

export function syncExcelToJSON(excelFilePath: string): InsertSchoolRegistry[] {
  const schools = parseExcelToJSON(excelFilePath);
  
  // Ensure directory exists
  const dir = path.dirname(DIRECTORY_JSON_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(DIRECTORY_JSON_PATH, JSON.stringify(schools, null, 2), "utf-8");
  return schools;
}
