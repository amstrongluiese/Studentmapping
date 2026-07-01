import * as xlsx from "xlsx";
import * as fs from "fs";
import * as path from "path";

export interface MasterSchool {
  school_id: string;
  school_name: string;
  municipality: string;
  province: string;
  latitude: number | null;
  longitude: number | null;
  school_type: string;
}

export const DIRECTORY_JSON_PATH = path.join(process.cwd(), "server", "data", "schools_directory.json");

export function parseExcelToJSON(excelFilePath: string): MasterSchool[] {
  if (!fs.existsSync(excelFilePath)) {
    throw new Error(`Excel file not found at path: ${excelFilePath}`);
  }

  const wb = xlsx.readFile(excelFilePath);
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows: any[] = xlsx.utils.sheet_to_json(sheet);

  const parsed: MasterSchool[] = rows.map((row) => {
    return {
      school_id: row["Directory ID"]?.toString() || row["DepEd School ID"]?.toString() || "",
      school_name: row["Canonical School Name"]?.toString() || row["DepEd School Name"]?.toString() || "",
      municipality: row["Municipality/City"]?.toString() || "Unknown",
      province: row["Province"]?.toString() || "Unknown",
      latitude: row["Latitude"] ? parseFloat(row["Latitude"]) : null,
      longitude: row["Longitude"] ? parseFloat(row["Longitude"]) : null,
      school_type: row["SHS Type"]?.toString() || row["School Category"]?.toString() || "",
    };
  }).filter((school) => school.school_id && school.school_name);

  return parsed;
}

export function syncExcelToJSON(excelFilePath: string): MasterSchool[] {
  const schools = parseExcelToJSON(excelFilePath);
  
  // Ensure directory exists
  const dir = path.dirname(DIRECTORY_JSON_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(DIRECTORY_JSON_PATH, JSON.stringify(schools, null, 2), "utf-8");
  return schools;
}
