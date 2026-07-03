import { initializeDatabase, getDb } from "../server/db";
import { schoolRegistry } from "../shared/schema";
import { sql, eq } from "drizzle-orm";

const LOCATIONS = {
  "Cavite": ["Alfonso", "Amadeo", "Bacoor", "Carmona", "Cavite City", "Dasmariñas", "Dasmarinas", "General Emilio Aguinaldo", "General Mariano Alvarez", "GMA", "General Trias", "Imus", "Indang", "Kawit", "Magallanes", "Maragondon", "Mendez", "Naic", "Noveleta", "Rosario", "Silang", "Tagaytay", "Tanza", "Ternate", "Trece Martires"],
  "Laguna": ["Alaminos", "Bay", "Biñan", "Binan", "Cabuyao", "Calamba", "Calauan", "Cavinti", "Famy", "Kalayaan", "Liliw", "Los Baños", "Los Banos", "Luisiana", "Lumban", "Mabitac", "Magdalena", "Majayjay", "Nagcarlan", "Paete", "Pagsanjan", "Pakil", "Pangil", "Pila", "Rizal", "San Pablo", "San Pedro", "Santa Cruz", "Sta. Cruz", "Santa Maria", "Sta. Maria", "Santa Rosa", "Sta. Rosa", "Siniloan", "Victoria"],
  "Batangas": ["Agoncillo", "Alitagtag", "Balayan", "Balete", "Batangas City", "Bauan", "Calaca", "Calatagan", "Cuenca", "Ibaan", "Laurel", "Lemery", "Lian", "Lipa", "Lobo", "Mabini", "Malvar", "Mataasnakahoy", "Nasugbu", "Padre Garcia", "Rosario", "San Jose", "San Juan", "San Luis", "San Nicolas", "San Pascual", "Santa Teresita", "Santo Tomas", "Sto. Tomas", "Taal", "Talisay", "Tanauan", "Taysan", "Tingloy", "Tuy"],
  "Rizal": ["Angono", "Antipolo", "Baras", "Binangonan", "Cainta", "Cardona", "Jalajala", "Morong", "Pililla", "Rodriguez", "Montalban", "San Mateo", "Tanay", "Taytay", "Teresa"],
  "Quezon": ["Agdangan", "Alabat", "Atimonan", "Buenavista", "Burdeos", "Calauag", "Candelaria", "Catanauan", "Dolores", "General Luna", "General Nakar", "Guinayangan", "Gumaca", "Infanta", "Jomalig", "Lopez", "Lucban", "Lucena", "Macalelon", "Mauban", "Mulanay", "Padre Burgos", "Pagbilao", "Panukulan", "Patnanungan", "Perez", "Pitogo", "Plaridel", "Polillo", "Quezon", "Real", "Sampaloc", "San Andres", "San Antonio", "San Francisco", "San Narciso", "Sariaya", "Tagkawayan", "Tayabas", "Tiaong", "Unisan"]
};

async function updateLocations() {
  initializeDatabase();
  const db = getDb();
  
  const schools = await db.select().from(schoolRegistry);
  console.log(`Analyzing ${schools.length} schools...`);
  
  let updatedCount = 0;

  for (const school of schools) {
    const textToSearch = `${school.address || ''} ${school.schoolName || ''}`.toLowerCase();
    
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
        // Use word boundary to avoid partial matches (e.g. "Bay" matching inside "Baytown")
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
    
    // Fallback if still unknown
    if (matchedProvince === "Unknown") matchedProvince = "Region IV-A";
    if (matchedMunicipality === "Unknown") matchedMunicipality = "Unspecified";

    // Only update if it changed or if it was the generic default from earlier
    if (school.municipality !== matchedMunicipality || school.province !== matchedProvince) {
      await db.update(schoolRegistry)
        .set({ municipality: matchedMunicipality, province: matchedProvince })
        .where(eq(schoolRegistry.id, school.id));
      updatedCount++;
    }
  }
  
  console.log(`Updated locations for ${updatedCount} schools!`);
  process.exit(0);
}

updateLocations();
