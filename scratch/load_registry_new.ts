import { initializeDatabase, getDb } from "../server/db";
import { schoolRegistry, schoolAliases, schoolMatchHistory, studentImports } from "../shared/schema";
import xlsx from "xlsx";
import { sql } from "drizzle-orm";
import { normalizeSchoolName } from "../shared/schoolRegistry";

const LOCATIONS = {
  "Cavite": ["Alfonso", "Amadeo", "Bacoor", "Carmona", "Cavite City", "Dasmariñas", "Dasmarinas", "General Emilio Aguinaldo", "General Mariano Alvarez", "GMA", "General Trias", "Imus", "Indang", "Kawit", "Magallanes", "Maragondon", "Mendez", "Naic", "Noveleta", "Rosario", "Silang", "Tagaytay", "Tanza", "Ternate", "Trece Martires"],
  "Laguna": ["Alaminos", "Bay", "Biñan", "Binan", "Cabuyao", "Calamba", "Calauan", "Cavinti", "Famy", "Kalayaan", "Liliw", "Los Baños", "Los Banos", "Luisiana", "Lumban", "Mabitac", "Magdalena", "Majayjay", "Nagcarlan", "Paete", "Pagsanjan", "Pakil", "Pangil", "Pila", "Rizal", "San Pablo", "San Pedro", "Santa Cruz", "Sta. Cruz", "Santa Maria", "Sta. Maria", "Santa Rosa", "Sta. Rosa", "Siniloan", "Victoria"],
  "Batangas": ["Agoncillo", "Alitagtag", "Balayan", "Balete", "Batangas City", "Bauan", "Calaca", "Calatagan", "Cuenca", "Ibaan", "Laurel", "Lemery", "Lian", "Lipa", "Lobo", "Mabini", "Malvar", "Mataasnakahoy", "Nasugbu", "Padre Garcia", "Rosario", "San Jose", "San Juan", "San Luis", "San Nicolas", "San Pascual", "Santa Teresita", "Santo Tomas", "Sto. Tomas", "Taal", "Talisay", "Tanauan", "Taysan", "Tingloy", "Tuy"],
  "Rizal": ["Angono", "Antipolo", "Baras", "Binangonan", "Cainta", "Cardona", "Jalajala", "Morong", "Pililla", "Rodriguez", "Montalban", "San Mateo", "Tanay", "Taytay", "Teresa"],
  "Quezon": ["Agdangan", "Alabat", "Atimonan", "Buenavista", "Burdeos", "Calauag", "Candelaria", "Catanauan", "Dolores", "General Luna", "General Nakar", "Guinayangan", "Gumaca", "Infanta", "Jomalig", "Lopez", "Lucban", "Lucena", "Macalelon", "Mauban", "Mulanay", "Padre Burgos", "Pagbilao", "Panukulan", "Patnanungan", "Perez", "Pitogo", "Plaridel", "Polillo", "Quezon", "Real", "Sampaloc", "San Andres", "San Antonio", "San Francisco", "San Narciso", "Sariaya", "Tagkawayan", "Tayabas", "Tiaong", "Unisan"]
};

async function loadRegistry() {
  initializeDatabase();
  const db = getDb();
  // Using the new file provided by the user
  const filePath = 'C:/Users/PC/Documents/GitHub/Studentmapping/Geocoded_region_4a_shs_masterlist.xlsx';
  
  console.log("Reading Excel file...");
  let data = [];
  try {
    const workbook = xlsx.readFile(filePath);
    data = xlsx.utils.sheet_to_json<any>(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
  } catch (err) {
    console.error("Failed to read Excel file:", err);
    process.exit(1);
  }
  
  console.log(`Found ${data.length} records. Clearing old registry...`);
  
  try {
    // Clear dependents
    await db.delete(schoolAliases);
    await db.delete(schoolMatchHistory);
    await db.delete(studentImports);
    
    // Clear registry
    await db.delete(schoolRegistry);
    console.log("Cleared old registry and aliases.");
    
    console.log("Inserting new records with intelligent location parsing...");
    
    const BATCH_SIZE = 50;
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE).map(row => {
        const address = String(row["Address"] || "");
        const schoolName = String(row["School Name"] || "");
        const googleLocation = String(row["Google Location"] || "");
        const textToSearch = `${address} ${schoolName} ${googleLocation}`.toLowerCase();
        
        let matchedProvince = "Unknown";
        let matchedMunicipality = "Unknown";
        
        // Check for province explicitly first
        for (const province of Object.keys(LOCATIONS)) {
          if (textToSearch.includes(province.toLowerCase())) {
            matchedProvince = province;
            break;
          }
        }
        
        // Check for municipality
        for (const [province, munis] of Object.entries(LOCATIONS)) {
          for (const muni of munis) {
            const regex = new RegExp(`\\b${muni.toLowerCase()}\\b`);
            if (regex.test(textToSearch)) {
              matchedMunicipality = muni;
              if (matchedProvince === "Unknown") {
                matchedProvince = province;
              }
              break;
            }
          }
          if (matchedMunicipality !== "Unknown") break;
        }
        
        // Normalize aliases back to standard names
        if (matchedMunicipality === "Binan") matchedMunicipality = "Biñan";
        if (matchedMunicipality === "Dasmarinas") matchedMunicipality = "Dasmariñas";
        if (matchedMunicipality === "Los Banos") matchedMunicipality = "Los Baños";
        if (matchedMunicipality === "GMA") matchedMunicipality = "General Mariano Alvarez";
        if (matchedMunicipality === "Montalban") matchedMunicipality = "Rodriguez";
        if (matchedMunicipality === "Sta. Cruz") matchedMunicipality = "Santa Cruz";
        if (matchedMunicipality === "Sta. Maria") matchedMunicipality = "Santa Maria";
        if (matchedMunicipality === "Sta. Rosa") matchedMunicipality = "Santa Rosa";
        if (matchedMunicipality === "Sto. Tomas") matchedMunicipality = "Santo Tomas";
        
        if (matchedProvince === "Unknown") matchedProvince = "Region IV-A";
        if (matchedMunicipality === "Unknown") matchedMunicipality = "Unspecified";
        
        return {
          schoolId: String(row["School ID"]),
          schoolName,
          normalizedSchoolName: normalizeSchoolName(schoolName),
          schoolType: String(row["School Type"]),
          sector: "Unknown", 
          address,
          municipality: matchedMunicipality,
          province: matchedProvince,
          latitude: Number(row["Latitude"]) || null,
          longitude: Number(row["Longitude"]) || null,
          source: "Geocoded Region 4A Masterlist",
          isActive: true
        };
      });
      
      await db.insert(schoolRegistry).values(batch);
    }
    
    console.log(`Successfully loaded ${data.length} schools into the registry!`);
  } catch (err) {
    console.error("Error loading registry:", err);
  } finally {
    process.exit(0);
  }
}

loadRegistry();
