/**
 * Location Intelligence Module
 * 
 * Extracts location hints from Philippine school names and detects mismatches
 * between the school name and geocoded coordinates. Also provides smart geocode
 * query building using student address demographics.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface LocationHint {
  place: string;
  type: "province" | "city" | "municipality" | "island" | "region";
  /** Provinces this place belongs to (used for matching) */
  parentProvinces?: string[];
}

export interface MismatchResult {
  hasMismatch: boolean;
  severity?: "high" | "medium" | "low";
  expectedLocation?: string;
  actualLocation?: string;
  message?: string;
  isAmbiguous?: boolean;
  suggestedQuery?: string;
}

// ─── Philippine Location Dictionary ─────────────────────────────────────────

/** Philippine provinces — the 81 provinces + key identifiers */
const PHILIPPINE_PROVINCES: string[] = [
  // Region I — Ilocos
  "Ilocos Norte", "Ilocos Sur", "La Union", "Pangasinan",
  // Region II — Cagayan Valley
  "Batanes", "Cagayan", "Isabela", "Nueva Vizcaya", "Quirino",
  // Region III — Central Luzon
  "Aurora", "Bataan", "Bulacan", "Nueva Ecija", "Pampanga", "Tarlac", "Zambales",
  // Region IV-A — CALABARZON
  "Batangas", "Cavite", "Laguna", "Quezon", "Rizal",
  // MIMAROPA
  "Marinduque", "Occidental Mindoro", "Oriental Mindoro", "Palawan", "Romblon",
  // Region V — Bicol
  "Albay", "Camarines Norte", "Camarines Sur", "Catanduanes", "Masbate", "Sorsogon",
  // Region VI — Western Visayas
  "Aklan", "Antique", "Capiz", "Guimaras", "Iloilo", "Negros Occidental",
  // Region VII — Central Visayas
  "Bohol", "Cebu", "Negros Oriental", "Siquijor",
  // Region VIII — Eastern Visayas
  "Biliran", "Eastern Samar", "Leyte", "Northern Samar", "Samar", "Southern Leyte",
  // Region IX — Zamboanga Peninsula
  "Zamboanga del Norte", "Zamboanga del Sur", "Zamboanga Sibugay",
  // Region X — Northern Mindanao
  "Bukidnon", "Camiguin", "Lanao del Norte", "Misamis Occidental", "Misamis Oriental",
  // Region XI — Davao
  "Davao de Oro", "Davao del Norte", "Davao del Sur", "Davao Occidental", "Davao Oriental",
  // Region XII — SOCCSKSARGEN
  "Cotabato", "Sarangani", "South Cotabato", "Sultan Kudarat",
  // Region XIII — Caraga
  "Agusan del Norte", "Agusan del Sur", "Dinagat Islands", "Surigao del Norte", "Surigao del Sur",
  // BARMM
  "Basilan", "Lanao del Sur", "Maguindanao del Norte", "Maguindanao del Sur", "Sulu", "Tawi-Tawi",
  // NCR (treated as province-level)
  "Metro Manila", "Manila",
  // CAR
  "Abra", "Apayao", "Benguet", "Ifugao", "Kalinga", "Mountain Province",
];

/** Single-word province names for easy matching in school names */
const SINGLE_WORD_PROVINCES: string[] = [
  "Batangas", "Cavite", "Laguna", "Quezon", "Rizal", "Bulacan", "Pampanga",
  "Tarlac", "Zambales", "Pangasinan", "Isabela", "Cagayan", "Aurora", "Bataan",
  "Palawan", "Romblon", "Marinduque", "Albay", "Masbate", "Sorsogon", "Catanduanes",
  "Aklan", "Antique", "Capiz", "Guimaras", "Iloilo", "Bohol", "Cebu", "Siquijor",
  "Biliran", "Leyte", "Samar", "Bukidnon", "Camiguin", "Cotabato", "Sarangani",
  "Basilan", "Sulu", "Abra", "Apayao", "Benguet", "Ifugao", "Kalinga", "Manila",
];

/** Major Philippine cities (independent & component cities) */
const PHILIPPINE_CITIES: Array<{ name: string; province: string }> = [
  {
    "name": "Manila",
    "province": "Metro Manila"
  },
  {
    "name": "Quezon City",
    "province": "Metro Manila"
  },
  {
    "name": "Makati",
    "province": "Metro Manila"
  },
  {
    "name": "Pasig",
    "province": "Metro Manila"
  },
  {
    "name": "Taguig",
    "province": "Metro Manila"
  },
  {
    "name": "Calamba",
    "province": "Laguna"
  },
  {
    "name": "San Pablo",
    "province": "Laguna"
  },
  {
    "name": "Santa Rosa",
    "province": "Laguna"
  },
  {
    "name": "Biñan",
    "province": "Laguna"
  },
  {
    "name": "Cabuyao",
    "province": "Laguna"
  },
  {
    "name": "San Pedro",
    "province": "Laguna"
  },
  {
    "name": "Los Baños",
    "province": "Laguna"
  },
  {
    "name": "Adams",
    "province": ""
  },
  {
    "name": "Bacarra",
    "province": ""
  },
  {
    "name": "Badoc",
    "province": ""
  },
  {
    "name": "Bangui",
    "province": ""
  },
  {
    "name": "Batac",
    "province": ""
  },
  {
    "name": "Burgos",
    "province": ""
  },
  {
    "name": "Carasi",
    "province": ""
  },
  {
    "name": "Currimao",
    "province": ""
  },
  {
    "name": "Dingras",
    "province": ""
  },
  {
    "name": "Dumalneg",
    "province": ""
  },
  {
    "name": "Banna",
    "province": ""
  },
  {
    "name": "Laoag",
    "province": ""
  },
  {
    "name": "Marcos",
    "province": ""
  },
  {
    "name": "Nueva Era",
    "province": ""
  },
  {
    "name": "Pagudpud",
    "province": ""
  },
  {
    "name": "Paoay",
    "province": ""
  },
  {
    "name": "Pasuquin",
    "province": ""
  },
  {
    "name": "Piddig",
    "province": ""
  },
  {
    "name": "Pinili",
    "province": ""
  },
  {
    "name": "San Nicolas",
    "province": ""
  },
  {
    "name": "Sarrat",
    "province": ""
  },
  {
    "name": "Solsona",
    "province": ""
  },
  {
    "name": "Vintar",
    "province": ""
  },
  {
    "name": "Alilem",
    "province": ""
  },
  {
    "name": "Banayoyo",
    "province": ""
  },
  {
    "name": "Bantay",
    "province": ""
  },
  {
    "name": "Cabugao",
    "province": ""
  },
  {
    "name": "Candon",
    "province": ""
  },
  {
    "name": "Caoayan",
    "province": ""
  },
  {
    "name": "Cervantes",
    "province": ""
  },
  {
    "name": "Galimuyod",
    "province": ""
  },
  {
    "name": "Gregorio Del Pilar",
    "province": ""
  },
  {
    "name": "Lidlidda",
    "province": ""
  },
  {
    "name": "Magsingal",
    "province": ""
  },
  {
    "name": "Nagbukel",
    "province": ""
  },
  {
    "name": "Narvacan",
    "province": ""
  },
  {
    "name": "Quirino",
    "province": ""
  },
  {
    "name": "Salcedo",
    "province": ""
  },
  {
    "name": "San Emilio",
    "province": ""
  },
  {
    "name": "San Esteban",
    "province": ""
  },
  {
    "name": "San Ildefonso",
    "province": ""
  },
  {
    "name": "San Juan",
    "province": ""
  },
  {
    "name": "San Vicente",
    "province": ""
  },
  {
    "name": "Santa Catalina",
    "province": ""
  },
  {
    "name": "Santa Cruz",
    "province": ""
  },
  {
    "name": "Santa Lucia",
    "province": ""
  },
  {
    "name": "Santa Maria",
    "province": ""
  },
  {
    "name": "Santiago",
    "province": ""
  },
  {
    "name": "Santo Domingo",
    "province": ""
  },
  {
    "name": "Sigay",
    "province": ""
  },
  {
    "name": "Sinait",
    "province": ""
  },
  {
    "name": "Sugpon",
    "province": ""
  },
  {
    "name": "Suyo",
    "province": ""
  },
  {
    "name": "Tagudin",
    "province": ""
  },
  {
    "name": "Vigan",
    "province": ""
  },
  {
    "name": "Agoo",
    "province": ""
  },
  {
    "name": "Aringay",
    "province": ""
  },
  {
    "name": "Bacnotan",
    "province": ""
  },
  {
    "name": "Bagulin",
    "province": ""
  },
  {
    "name": "Balaoan",
    "province": ""
  },
  {
    "name": "Bangar",
    "province": ""
  },
  {
    "name": "Bauang",
    "province": ""
  },
  {
    "name": "Caba",
    "province": ""
  },
  {
    "name": "Luna",
    "province": ""
  },
  {
    "name": "Naguilian",
    "province": ""
  },
  {
    "name": "Pugo",
    "province": ""
  },
  {
    "name": "Rosario",
    "province": ""
  },
  {
    "name": "San Fernando",
    "province": ""
  },
  {
    "name": "San Gabriel",
    "province": ""
  },
  {
    "name": "Santo Tomas",
    "province": ""
  },
  {
    "name": "Santol",
    "province": ""
  },
  {
    "name": "Sudipen",
    "province": ""
  },
  {
    "name": "Tubao",
    "province": ""
  },
  {
    "name": "Agno",
    "province": ""
  },
  {
    "name": "Aguilar",
    "province": ""
  },
  {
    "name": "Alaminos",
    "province": ""
  },
  {
    "name": "Alcala",
    "province": ""
  },
  {
    "name": "Anda",
    "province": ""
  },
  {
    "name": "Asingan",
    "province": ""
  },
  {
    "name": "Balungao",
    "province": ""
  },
  {
    "name": "Bani",
    "province": ""
  },
  {
    "name": "Basista",
    "province": ""
  },
  {
    "name": "Bautista",
    "province": ""
  },
  {
    "name": "Bayambang",
    "province": ""
  },
  {
    "name": "Binalonan",
    "province": ""
  },
  {
    "name": "Binmaley",
    "province": ""
  },
  {
    "name": "Bolinao",
    "province": ""
  },
  {
    "name": "Bugallon",
    "province": ""
  },
  {
    "name": "Calasiao",
    "province": ""
  },
  {
    "name": "Dagupan",
    "province": ""
  },
  {
    "name": "Dasol",
    "province": ""
  },
  {
    "name": "Infanta",
    "province": ""
  },
  {
    "name": "Labrador",
    "province": ""
  },
  {
    "name": "Lingayen",
    "province": ""
  },
  {
    "name": "Mabini",
    "province": ""
  },
  {
    "name": "Malasiqui",
    "province": ""
  },
  {
    "name": "Manaoag",
    "province": ""
  },
  {
    "name": "Mangaldan",
    "province": ""
  },
  {
    "name": "Mangatarem",
    "province": ""
  },
  {
    "name": "Mapandan",
    "province": ""
  },
  {
    "name": "Natividad",
    "province": ""
  },
  {
    "name": "Pozorrubio",
    "province": ""
  },
  {
    "name": "Rosales",
    "province": ""
  },
  {
    "name": "San Carlos",
    "province": ""
  },
  {
    "name": "San Fabian",
    "province": ""
  },
  {
    "name": "San Jacinto",
    "province": ""
  },
  {
    "name": "San Manuel",
    "province": ""
  },
  {
    "name": "San Quintin",
    "province": ""
  },
  {
    "name": "Santa Barbara",
    "province": ""
  },
  {
    "name": "Sison",
    "province": ""
  },
  {
    "name": "Sual",
    "province": ""
  },
  {
    "name": "Tayug",
    "province": ""
  },
  {
    "name": "Umingan",
    "province": ""
  },
  {
    "name": "Urbiztondo",
    "province": ""
  },
  {
    "name": "Urdaneta",
    "province": ""
  },
  {
    "name": "Villasis",
    "province": ""
  },
  {
    "name": "Laoac",
    "province": ""
  },
  {
    "name": "Basco",
    "province": ""
  },
  {
    "name": "Itbayat",
    "province": ""
  },
  {
    "name": "Ivana",
    "province": ""
  },
  {
    "name": "Mahatao",
    "province": ""
  },
  {
    "name": "Sabtang",
    "province": ""
  },
  {
    "name": "Uyugan",
    "province": ""
  },
  {
    "name": "Abulug",
    "province": ""
  },
  {
    "name": "Allacapan",
    "province": ""
  },
  {
    "name": "Amulung",
    "province": ""
  },
  {
    "name": "Aparri",
    "province": ""
  },
  {
    "name": "Baggao",
    "province": ""
  },
  {
    "name": "Ballesteros",
    "province": ""
  },
  {
    "name": "Buguey",
    "province": ""
  },
  {
    "name": "Calayan",
    "province": ""
  },
  {
    "name": "Camalaniugan",
    "province": ""
  },
  {
    "name": "Claveria",
    "province": ""
  },
  {
    "name": "Enrile",
    "province": ""
  },
  {
    "name": "Gattaran",
    "province": ""
  },
  {
    "name": "Gonzaga",
    "province": ""
  },
  {
    "name": "Iguig",
    "province": ""
  },
  {
    "name": "Lal-Lo",
    "province": ""
  },
  {
    "name": "Lasam",
    "province": ""
  },
  {
    "name": "Pamplona",
    "province": ""
  },
  {
    "name": "Peñablanca",
    "province": ""
  },
  {
    "name": "Piat",
    "province": ""
  },
  {
    "name": "Rizal",
    "province": ""
  },
  {
    "name": "Sanchez-Mira",
    "province": ""
  },
  {
    "name": "Santa Ana",
    "province": ""
  },
  {
    "name": "Santa Praxedes",
    "province": ""
  },
  {
    "name": "Santa Teresita",
    "province": ""
  },
  {
    "name": "Santo Niño",
    "province": ""
  },
  {
    "name": "Solana",
    "province": ""
  },
  {
    "name": "Tuao",
    "province": ""
  },
  {
    "name": "Tuguegarao",
    "province": ""
  },
  {
    "name": "Alicia",
    "province": ""
  },
  {
    "name": "Angadanan",
    "province": ""
  },
  {
    "name": "Aurora",
    "province": ""
  },
  {
    "name": "Benito Soliven",
    "province": ""
  },
  {
    "name": "Cabagan",
    "province": ""
  },
  {
    "name": "Cabatuan",
    "province": ""
  },
  {
    "name": "Cauayan",
    "province": ""
  },
  {
    "name": "Cordon",
    "province": ""
  },
  {
    "name": "Dinapigue",
    "province": ""
  },
  {
    "name": "Divilacan",
    "province": ""
  },
  {
    "name": "Echague",
    "province": ""
  },
  {
    "name": "Gamu",
    "province": ""
  },
  {
    "name": "Ilagan",
    "province": ""
  },
  {
    "name": "Jones",
    "province": ""
  },
  {
    "name": "Maconacon",
    "province": ""
  },
  {
    "name": "Delfin Albano",
    "province": ""
  },
  {
    "name": "Mallig",
    "province": ""
  },
  {
    "name": "Palanan",
    "province": ""
  },
  {
    "name": "Quezon",
    "province": ""
  },
  {
    "name": "Ramon",
    "province": ""
  },
  {
    "name": "Reina Mercedes",
    "province": ""
  },
  {
    "name": "Roxas",
    "province": ""
  },
  {
    "name": "San Agustin",
    "province": ""
  },
  {
    "name": "San Guillermo",
    "province": ""
  },
  {
    "name": "San Isidro",
    "province": ""
  },
  {
    "name": "San Mariano",
    "province": ""
  },
  {
    "name": "San Mateo",
    "province": ""
  },
  {
    "name": "Tumauini",
    "province": ""
  },
  {
    "name": "Ambaguio",
    "province": ""
  },
  {
    "name": "Aritao",
    "province": ""
  },
  {
    "name": "Bagabag",
    "province": ""
  },
  {
    "name": "Bambang",
    "province": ""
  },
  {
    "name": "Bayombong",
    "province": ""
  },
  {
    "name": "Diadi",
    "province": ""
  },
  {
    "name": "Dupax Del Norte",
    "province": ""
  },
  {
    "name": "Dupax Del Sur",
    "province": ""
  },
  {
    "name": "Kasibu",
    "province": ""
  },
  {
    "name": "Kayapa",
    "province": ""
  },
  {
    "name": "Santa Fe",
    "province": ""
  },
  {
    "name": "Solano",
    "province": ""
  },
  {
    "name": "Villaverde",
    "province": ""
  },
  {
    "name": "Alfonso Castaneda",
    "province": ""
  },
  {
    "name": "Aglipay",
    "province": ""
  },
  {
    "name": "Cabarroguis",
    "province": ""
  },
  {
    "name": "Diffun",
    "province": ""
  },
  {
    "name": "Maddela",
    "province": ""
  },
  {
    "name": "Saguday",
    "province": ""
  },
  {
    "name": "Nagtipunan",
    "province": ""
  },
  {
    "name": "Abucay",
    "province": ""
  },
  {
    "name": "Bagac",
    "province": ""
  },
  {
    "name": "Balanga",
    "province": ""
  },
  {
    "name": "Dinalupihan",
    "province": ""
  },
  {
    "name": "Hermosa",
    "province": ""
  },
  {
    "name": "Limay",
    "province": ""
  },
  {
    "name": "Mariveles",
    "province": ""
  },
  {
    "name": "Morong",
    "province": ""
  },
  {
    "name": "Orani",
    "province": ""
  },
  {
    "name": "Orion",
    "province": ""
  },
  {
    "name": "Pilar",
    "province": ""
  },
  {
    "name": "Samal",
    "province": ""
  },
  {
    "name": "Angat",
    "province": ""
  },
  {
    "name": "Balagtas",
    "province": ""
  },
  {
    "name": "Baliuag",
    "province": ""
  },
  {
    "name": "Bocaue",
    "province": ""
  },
  {
    "name": "Bulacan",
    "province": ""
  },
  {
    "name": "Bustos",
    "province": ""
  },
  {
    "name": "Calumpit",
    "province": ""
  },
  {
    "name": "Guiguinto",
    "province": ""
  },
  {
    "name": "Hagonoy",
    "province": ""
  },
  {
    "name": "Malolos",
    "province": ""
  },
  {
    "name": "Marilao",
    "province": ""
  },
  {
    "name": "Meycauayan",
    "province": ""
  },
  {
    "name": "Norzagaray",
    "province": ""
  },
  {
    "name": "Obando",
    "province": ""
  },
  {
    "name": "Pandi",
    "province": ""
  },
  {
    "name": "Paombong",
    "province": ""
  },
  {
    "name": "Plaridel",
    "province": ""
  },
  {
    "name": "Pulilan",
    "province": ""
  },
  {
    "name": "San Jose Del Monte",
    "province": ""
  },
  {
    "name": "San Miguel",
    "province": ""
  },
  {
    "name": "San Rafael",
    "province": ""
  },
  {
    "name": "Doña Remedios Trinidad",
    "province": ""
  },
  {
    "name": "Aliaga",
    "province": ""
  },
  {
    "name": "Bongabon",
    "province": ""
  },
  {
    "name": "Cabanatuan",
    "province": ""
  },
  {
    "name": "Cabiao",
    "province": ""
  },
  {
    "name": "Carranglan",
    "province": ""
  },
  {
    "name": "Cuyapo",
    "province": ""
  },
  {
    "name": "Gabaldon",
    "province": ""
  },
  {
    "name": "Gapan",
    "province": ""
  },
  {
    "name": "General Mamerto Natividad",
    "province": ""
  },
  {
    "name": "General Tinio",
    "province": ""
  },
  {
    "name": "Guimba",
    "province": ""
  },
  {
    "name": "Jaen",
    "province": ""
  },
  {
    "name": "Laur",
    "province": ""
  },
  {
    "name": "Licab",
    "province": ""
  },
  {
    "name": "Llanera",
    "province": ""
  },
  {
    "name": "Lupao",
    "province": ""
  },
  {
    "name": "Science City of Muñoz",
    "province": ""
  },
  {
    "name": "Nampicuan",
    "province": ""
  },
  {
    "name": "Palayan",
    "province": ""
  },
  {
    "name": "Pantabangan",
    "province": ""
  },
  {
    "name": "Peñaranda",
    "province": ""
  },
  {
    "name": "San Antonio",
    "province": ""
  },
  {
    "name": "San Jose",
    "province": ""
  },
  {
    "name": "San Leonardo",
    "province": ""
  },
  {
    "name": "Talavera",
    "province": ""
  },
  {
    "name": "Talugtug",
    "province": ""
  },
  {
    "name": "Zaragoza",
    "province": ""
  },
  {
    "name": "Angeles",
    "province": ""
  },
  {
    "name": "Apalit",
    "province": ""
  },
  {
    "name": "Arayat",
    "province": ""
  },
  {
    "name": "Bacolor",
    "province": ""
  },
  {
    "name": "Candaba",
    "province": ""
  },
  {
    "name": "Floridablanca",
    "province": ""
  },
  {
    "name": "Guagua",
    "province": ""
  },
  {
    "name": "Lubao",
    "province": ""
  },
  {
    "name": "Mabalacat",
    "province": ""
  },
  {
    "name": "Macabebe",
    "province": ""
  },
  {
    "name": "Magalang",
    "province": ""
  },
  {
    "name": "Masantol",
    "province": ""
  },
  {
    "name": "Mexico",
    "province": ""
  },
  {
    "name": "Minalin",
    "province": ""
  },
  {
    "name": "Porac",
    "province": ""
  },
  {
    "name": "San Luis",
    "province": ""
  },
  {
    "name": "San Simon",
    "province": ""
  },
  {
    "name": "Santa Rita",
    "province": ""
  },
  {
    "name": "Sto. Tomas",
    "province": ""
  },
  {
    "name": "Sasmuan",
    "province": ""
  },
  {
    "name": "Anao",
    "province": ""
  },
  {
    "name": "Bamban",
    "province": ""
  },
  {
    "name": "Camiling",
    "province": ""
  },
  {
    "name": "Capas",
    "province": ""
  },
  {
    "name": "Concepcion",
    "province": ""
  },
  {
    "name": "Gerona",
    "province": ""
  },
  {
    "name": "La Paz",
    "province": ""
  },
  {
    "name": "Mayantoc",
    "province": ""
  },
  {
    "name": "Moncada",
    "province": ""
  },
  {
    "name": "Paniqui",
    "province": ""
  },
  {
    "name": "Pura",
    "province": ""
  },
  {
    "name": "Ramos",
    "province": ""
  },
  {
    "name": "San Clemente",
    "province": ""
  },
  {
    "name": "Santa Ignacia",
    "province": ""
  },
  {
    "name": "Tarlac",
    "province": ""
  },
  {
    "name": "Victoria",
    "province": ""
  },
  {
    "name": "Botolan",
    "province": ""
  },
  {
    "name": "Cabangan",
    "province": ""
  },
  {
    "name": "Candelaria",
    "province": ""
  },
  {
    "name": "Castillejos",
    "province": ""
  },
  {
    "name": "Masinloc",
    "province": ""
  },
  {
    "name": "Olongapo",
    "province": ""
  },
  {
    "name": "Palauig",
    "province": ""
  },
  {
    "name": "San Felipe",
    "province": ""
  },
  {
    "name": "San Marcelino",
    "province": ""
  },
  {
    "name": "San Narciso",
    "province": ""
  },
  {
    "name": "Subic",
    "province": ""
  },
  {
    "name": "Baler",
    "province": ""
  },
  {
    "name": "Casiguran",
    "province": ""
  },
  {
    "name": "Dilasag",
    "province": ""
  },
  {
    "name": "Dinalungan",
    "province": ""
  },
  {
    "name": "Dingalan",
    "province": ""
  },
  {
    "name": "Dipaculao",
    "province": ""
  },
  {
    "name": "Maria Aurora",
    "province": ""
  },
  {
    "name": "Agoncillo",
    "province": ""
  },
  {
    "name": "Alitagtag",
    "province": ""
  },
  {
    "name": "Balayan",
    "province": ""
  },
  {
    "name": "Balete",
    "province": ""
  },
  {
    "name": "Batangas",
    "province": ""
  },
  {
    "name": "Bauan",
    "province": ""
  },
  {
    "name": "Calaca",
    "province": ""
  },
  {
    "name": "Calatagan",
    "province": ""
  },
  {
    "name": "Cuenca",
    "province": ""
  },
  {
    "name": "Ibaan",
    "province": ""
  },
  {
    "name": "Laurel",
    "province": ""
  },
  {
    "name": "Lemery",
    "province": ""
  },
  {
    "name": "Lian",
    "province": ""
  },
  {
    "name": "Lipa",
    "province": ""
  },
  {
    "name": "Lobo",
    "province": ""
  },
  {
    "name": "Malvar",
    "province": ""
  },
  {
    "name": "Mataasnakahoy",
    "province": ""
  },
  {
    "name": "Nasugbu",
    "province": ""
  },
  {
    "name": "Padre Garcia",
    "province": ""
  },
  {
    "name": "San Pascual",
    "province": ""
  },
  {
    "name": "Taal",
    "province": ""
  },
  {
    "name": "Talisay",
    "province": ""
  },
  {
    "name": "Tanauan",
    "province": ""
  },
  {
    "name": "Taysan",
    "province": ""
  },
  {
    "name": "Tingloy",
    "province": ""
  },
  {
    "name": "Alfonso",
    "province": ""
  },
  {
    "name": "Amadeo",
    "province": ""
  },
  {
    "name": "Bacoor",
    "province": ""
  },
  {
    "name": "Carmona",
    "province": ""
  },
  {
    "name": "Cavite",
    "province": ""
  },
  {
    "name": "Dasmariñas",
    "province": ""
  },
  {
    "name": "General Emilio Aguinaldo",
    "province": ""
  },
  {
    "name": "General Trias",
    "province": ""
  },
  {
    "name": "Imus",
    "province": ""
  },
  {
    "name": "Indang",
    "province": ""
  },
  {
    "name": "Kawit",
    "province": ""
  },
  {
    "name": "Magallanes",
    "province": ""
  },
  {
    "name": "Maragondon",
    "province": ""
  },
  {
    "name": "Mendez",
    "province": ""
  },
  {
    "name": "Naic",
    "province": ""
  },
  {
    "name": "Noveleta",
    "province": ""
  },
  {
    "name": "Silang",
    "province": ""
  },
  {
    "name": "Tagaytay",
    "province": ""
  },
  {
    "name": "Tanza",
    "province": ""
  },
  {
    "name": "Ternate",
    "province": ""
  },
  {
    "name": "Trece Martires",
    "province": ""
  },
  {
    "name": "Gen. Mariano Alvarez",
    "province": ""
  },
  {
    "name": "Calauan",
    "province": ""
  },
  {
    "name": "Cavinti",
    "province": ""
  },
  {
    "name": "Famy",
    "province": ""
  },
  {
    "name": "Kalayaan",
    "province": ""
  },
  {
    "name": "Liliw",
    "province": ""
  },
  {
    "name": "Luisiana",
    "province": ""
  },
  {
    "name": "Lumban",
    "province": ""
  },
  {
    "name": "Mabitac",
    "province": ""
  },
  {
    "name": "Magdalena",
    "province": ""
  },
  {
    "name": "Majayjay",
    "province": ""
  },
  {
    "name": "Nagcarlan",
    "province": ""
  },
  {
    "name": "Paete",
    "province": ""
  },
  {
    "name": "Pagsanjan",
    "province": ""
  },
  {
    "name": "Pakil",
    "province": ""
  },
  {
    "name": "Pangil",
    "province": ""
  },
  {
    "name": "Pila",
    "province": ""
  },
  {
    "name": "Siniloan",
    "province": ""
  },
  {
    "name": "Agdangan",
    "province": ""
  },
  {
    "name": "Alabat",
    "province": ""
  },
  {
    "name": "Atimonan",
    "province": ""
  },
  {
    "name": "Buenavista",
    "province": ""
  },
  {
    "name": "Burdeos",
    "province": ""
  },
  {
    "name": "Calauag",
    "province": ""
  },
  {
    "name": "Catanauan",
    "province": ""
  },
  {
    "name": "Dolores",
    "province": ""
  },
  {
    "name": "General Luna",
    "province": ""
  },
  {
    "name": "General Nakar",
    "province": ""
  },
  {
    "name": "Guinayangan",
    "province": ""
  },
  {
    "name": "Gumaca",
    "province": ""
  },
  {
    "name": "Jomalig",
    "province": ""
  },
  {
    "name": "Lopez",
    "province": ""
  },
  {
    "name": "Lucban",
    "province": ""
  },
  {
    "name": "Lucena",
    "province": ""
  },
  {
    "name": "Macalelon",
    "province": ""
  },
  {
    "name": "Mauban",
    "province": ""
  },
  {
    "name": "Mulanay",
    "province": ""
  },
  {
    "name": "Padre Burgos",
    "province": ""
  },
  {
    "name": "Pagbilao",
    "province": ""
  },
  {
    "name": "Panukulan",
    "province": ""
  },
  {
    "name": "Patnanungan",
    "province": ""
  },
  {
    "name": "Perez",
    "province": ""
  },
  {
    "name": "Pitogo",
    "province": ""
  },
  {
    "name": "Polillo",
    "province": ""
  },
  {
    "name": "Real",
    "province": ""
  },
  {
    "name": "Sampaloc",
    "province": ""
  },
  {
    "name": "San Andres",
    "province": ""
  },
  {
    "name": "San Francisco",
    "province": ""
  },
  {
    "name": "Sariaya",
    "province": ""
  },
  {
    "name": "Tagkawayan",
    "province": ""
  },
  {
    "name": "Tayabas",
    "province": ""
  },
  {
    "name": "Tiaong",
    "province": ""
  },
  {
    "name": "Unisan",
    "province": ""
  },
  {
    "name": "Angono",
    "province": ""
  },
  {
    "name": "Antipolo",
    "province": ""
  },
  {
    "name": "Baras",
    "province": ""
  },
  {
    "name": "Binangonan",
    "province": ""
  },
  {
    "name": "Cainta",
    "province": ""
  },
  {
    "name": "Cardona",
    "province": ""
  },
  {
    "name": "Jala-Jala",
    "province": ""
  },
  {
    "name": "Rodriguez",
    "province": ""
  },
  {
    "name": "Pililla",
    "province": ""
  },
  {
    "name": "Tanay",
    "province": ""
  },
  {
    "name": "Taytay",
    "province": ""
  },
  {
    "name": "Teresa",
    "province": ""
  },
  {
    "name": "Boac",
    "province": ""
  },
  {
    "name": "Gasan",
    "province": ""
  },
  {
    "name": "Mogpog",
    "province": ""
  },
  {
    "name": "Torrijos",
    "province": ""
  },
  {
    "name": "Abra De Ilog",
    "province": ""
  },
  {
    "name": "Calintaan",
    "province": ""
  },
  {
    "name": "Looc",
    "province": ""
  },
  {
    "name": "Lubang",
    "province": ""
  },
  {
    "name": "Magsaysay",
    "province": ""
  },
  {
    "name": "Mamburao",
    "province": ""
  },
  {
    "name": "Paluan",
    "province": ""
  },
  {
    "name": "Sablayan",
    "province": ""
  },
  {
    "name": "Baco",
    "province": ""
  },
  {
    "name": "Bansud",
    "province": ""
  },
  {
    "name": "Bongabong",
    "province": ""
  },
  {
    "name": "Bulalacao",
    "province": ""
  },
  {
    "name": "Calapan",
    "province": ""
  },
  {
    "name": "Gloria",
    "province": ""
  },
  {
    "name": "Mansalay",
    "province": ""
  },
  {
    "name": "Naujan",
    "province": ""
  },
  {
    "name": "Pinamalayan",
    "province": ""
  },
  {
    "name": "Pola",
    "province": ""
  },
  {
    "name": "Puerto Galera",
    "province": ""
  },
  {
    "name": "San Teodoro",
    "province": ""
  },
  {
    "name": "Socorro",
    "province": ""
  },
  {
    "name": "Aborlan",
    "province": ""
  },
  {
    "name": "Agutaya",
    "province": ""
  },
  {
    "name": "Araceli",
    "province": ""
  },
  {
    "name": "Balabac",
    "province": ""
  },
  {
    "name": "Bataraza",
    "province": ""
  },
  {
    "name": "Brooke's Point",
    "province": ""
  },
  {
    "name": "Busuanga",
    "province": ""
  },
  {
    "name": "Cagayancillo",
    "province": ""
  },
  {
    "name": "Coron",
    "province": ""
  },
  {
    "name": "Cuyo",
    "province": ""
  },
  {
    "name": "Dumaran",
    "province": ""
  },
  {
    "name": "El Nido",
    "province": ""
  },
  {
    "name": "Linapacan",
    "province": ""
  },
  {
    "name": "Narra",
    "province": ""
  },
  {
    "name": "Puerto Princesa",
    "province": ""
  },
  {
    "name": "Culion",
    "province": ""
  },
  {
    "name": "Sofronio Española",
    "province": ""
  },
  {
    "name": "Alcantara",
    "province": ""
  },
  {
    "name": "Banton",
    "province": ""
  },
  {
    "name": "Cajidiocan",
    "province": ""
  },
  {
    "name": "Calatrava",
    "province": ""
  },
  {
    "name": "Corcuera",
    "province": ""
  },
  {
    "name": "Magdiwang",
    "province": ""
  },
  {
    "name": "Odiongan",
    "province": ""
  },
  {
    "name": "Romblon",
    "province": ""
  },
  {
    "name": "Ferrol",
    "province": ""
  },
  {
    "name": "Bacacay",
    "province": ""
  },
  {
    "name": "Camalig",
    "province": ""
  },
  {
    "name": "Daraga",
    "province": ""
  },
  {
    "name": "Guinobatan",
    "province": ""
  },
  {
    "name": "Jovellar",
    "province": ""
  },
  {
    "name": "Legazpi",
    "province": ""
  },
  {
    "name": "Libon",
    "province": ""
  },
  {
    "name": "Ligao",
    "province": ""
  },
  {
    "name": "Malilipot",
    "province": ""
  },
  {
    "name": "Malinao",
    "province": ""
  },
  {
    "name": "Manito",
    "province": ""
  },
  {
    "name": "Pio Duran",
    "province": ""
  },
  {
    "name": "Polangui",
    "province": ""
  },
  {
    "name": "Rapu-Rapu",
    "province": ""
  },
  {
    "name": "Tabaco",
    "province": ""
  },
  {
    "name": "Tiwi",
    "province": ""
  },
  {
    "name": "Basud",
    "province": ""
  },
  {
    "name": "Capalonga",
    "province": ""
  },
  {
    "name": "Daet",
    "province": ""
  },
  {
    "name": "San Lorenzo Ruiz",
    "province": ""
  },
  {
    "name": "Jose Panganiban",
    "province": ""
  },
  {
    "name": "Labo",
    "province": ""
  },
  {
    "name": "Mercedes",
    "province": ""
  },
  {
    "name": "Paracale",
    "province": ""
  },
  {
    "name": "Santa Elena",
    "province": ""
  },
  {
    "name": "Vinzons",
    "province": ""
  },
  {
    "name": "Baao",
    "province": ""
  },
  {
    "name": "Balatan",
    "province": ""
  },
  {
    "name": "Bato",
    "province": ""
  },
  {
    "name": "Bombon",
    "province": ""
  },
  {
    "name": "Buhi",
    "province": ""
  },
  {
    "name": "Bula",
    "province": ""
  },
  {
    "name": "Cabusao",
    "province": ""
  },
  {
    "name": "Calabanga",
    "province": ""
  },
  {
    "name": "Camaligan",
    "province": ""
  },
  {
    "name": "Canaman",
    "province": ""
  },
  {
    "name": "Caramoan",
    "province": ""
  },
  {
    "name": "Del Gallego",
    "province": ""
  },
  {
    "name": "Gainza",
    "province": ""
  },
  {
    "name": "Garchitorena",
    "province": ""
  },
  {
    "name": "Iriga",
    "province": ""
  },
  {
    "name": "Lagonoy",
    "province": ""
  },
  {
    "name": "Libmanan",
    "province": ""
  },
  {
    "name": "Lupi",
    "province": ""
  },
  {
    "name": "Magarao",
    "province": ""
  },
  {
    "name": "Milaor",
    "province": ""
  },
  {
    "name": "Minalabac",
    "province": ""
  },
  {
    "name": "Nabua",
    "province": ""
  },
  {
    "name": "Naga",
    "province": ""
  },
  {
    "name": "Ocampo",
    "province": ""
  },
  {
    "name": "Pasacao",
    "province": ""
  },
  {
    "name": "Pili",
    "province": ""
  },
  {
    "name": "Presentacion",
    "province": ""
  },
  {
    "name": "Ragay",
    "province": ""
  },
  {
    "name": "Sagñay",
    "province": ""
  },
  {
    "name": "Sipocot",
    "province": ""
  },
  {
    "name": "Siruma",
    "province": ""
  },
  {
    "name": "Tigaon",
    "province": ""
  },
  {
    "name": "Tinambac",
    "province": ""
  },
  {
    "name": "Bagamanoc",
    "province": ""
  },
  {
    "name": "Caramoran",
    "province": ""
  },
  {
    "name": "Gigmoto",
    "province": ""
  },
  {
    "name": "Pandan",
    "province": ""
  },
  {
    "name": "Panganiban",
    "province": ""
  },
  {
    "name": "Viga",
    "province": ""
  },
  {
    "name": "Virac",
    "province": ""
  },
  {
    "name": "Aroroy",
    "province": ""
  },
  {
    "name": "Baleno",
    "province": ""
  },
  {
    "name": "Balud",
    "province": ""
  },
  {
    "name": "Batuan",
    "province": ""
  },
  {
    "name": "Cataingan",
    "province": ""
  },
  {
    "name": "Cawayan",
    "province": ""
  },
  {
    "name": "Dimasalang",
    "province": ""
  },
  {
    "name": "Esperanza",
    "province": ""
  },
  {
    "name": "Mandaon",
    "province": ""
  },
  {
    "name": "Masbate",
    "province": ""
  },
  {
    "name": "Milagros",
    "province": ""
  },
  {
    "name": "Mobo",
    "province": ""
  },
  {
    "name": "Monreal",
    "province": ""
  },
  {
    "name": "Palanas",
    "province": ""
  },
  {
    "name": "Pio v. Corpuz",
    "province": ""
  },
  {
    "name": "Placer",
    "province": ""
  },
  {
    "name": "Uson",
    "province": ""
  },
  {
    "name": "Barcelona",
    "province": ""
  },
  {
    "name": "Bulan",
    "province": ""
  },
  {
    "name": "Bulusan",
    "province": ""
  },
  {
    "name": "Castilla",
    "province": ""
  },
  {
    "name": "Donsol",
    "province": ""
  },
  {
    "name": "Gubat",
    "province": ""
  },
  {
    "name": "Irosin",
    "province": ""
  },
  {
    "name": "Juban",
    "province": ""
  },
  {
    "name": "Matnog",
    "province": ""
  },
  {
    "name": "Prieto Diaz",
    "province": ""
  },
  {
    "name": "Santa Magdalena",
    "province": ""
  },
  {
    "name": "Sorsogon",
    "province": ""
  },
  {
    "name": "Altavas",
    "province": ""
  },
  {
    "name": "Banga",
    "province": ""
  },
  {
    "name": "Batan",
    "province": ""
  },
  {
    "name": "Buruanga",
    "province": ""
  },
  {
    "name": "Ibajay",
    "province": ""
  },
  {
    "name": "Kalibo",
    "province": ""
  },
  {
    "name": "Lezo",
    "province": ""
  },
  {
    "name": "Libacao",
    "province": ""
  },
  {
    "name": "Madalag",
    "province": ""
  },
  {
    "name": "Makato",
    "province": ""
  },
  {
    "name": "Malay",
    "province": ""
  },
  {
    "name": "Nabas",
    "province": ""
  },
  {
    "name": "New Washington",
    "province": ""
  },
  {
    "name": "Numancia",
    "province": ""
  },
  {
    "name": "Tangalan",
    "province": ""
  },
  {
    "name": "Anini-Y",
    "province": ""
  },
  {
    "name": "Barbaza",
    "province": ""
  },
  {
    "name": "Belison",
    "province": ""
  },
  {
    "name": "Bugasong",
    "province": ""
  },
  {
    "name": "Caluya",
    "province": ""
  },
  {
    "name": "Culasi",
    "province": ""
  },
  {
    "name": "Tobias Fornier",
    "province": ""
  },
  {
    "name": "Hamtic",
    "province": ""
  },
  {
    "name": "Laua-An",
    "province": ""
  },
  {
    "name": "Libertad",
    "province": ""
  },
  {
    "name": "Patnongon",
    "province": ""
  },
  {
    "name": "San Remigio",
    "province": ""
  },
  {
    "name": "Sebaste",
    "province": ""
  },
  {
    "name": "Sibalom",
    "province": ""
  },
  {
    "name": "Tibiao",
    "province": ""
  },
  {
    "name": "Valderrama",
    "province": ""
  },
  {
    "name": "Cuartero",
    "province": ""
  },
  {
    "name": "Dumalag",
    "province": ""
  },
  {
    "name": "Dumarao",
    "province": ""
  },
  {
    "name": "Ivisan",
    "province": ""
  },
  {
    "name": "Jamindan",
    "province": ""
  },
  {
    "name": "Ma-Ayon",
    "province": ""
  },
  {
    "name": "Mambusao",
    "province": ""
  },
  {
    "name": "Panay",
    "province": ""
  },
  {
    "name": "Panitan",
    "province": ""
  },
  {
    "name": "Pontevedra",
    "province": ""
  },
  {
    "name": "President Roxas",
    "province": ""
  },
  {
    "name": "Sapi-An",
    "province": ""
  },
  {
    "name": "Sigma",
    "province": ""
  },
  {
    "name": "Tapaz",
    "province": ""
  },
  {
    "name": "Ajuy",
    "province": ""
  },
  {
    "name": "Alimodian",
    "province": ""
  },
  {
    "name": "Anilao",
    "province": ""
  },
  {
    "name": "Badiangan",
    "province": ""
  },
  {
    "name": "Balasan",
    "province": ""
  },
  {
    "name": "Banate",
    "province": ""
  },
  {
    "name": "Barotac Nuevo",
    "province": ""
  },
  {
    "name": "Barotac Viejo",
    "province": ""
  },
  {
    "name": "Batad",
    "province": ""
  },
  {
    "name": "Bingawan",
    "province": ""
  },
  {
    "name": "Calinog",
    "province": ""
  },
  {
    "name": "Carles",
    "province": ""
  },
  {
    "name": "Dingle",
    "province": ""
  },
  {
    "name": "Dueñas",
    "province": ""
  },
  {
    "name": "Dumangas",
    "province": ""
  },
  {
    "name": "Estancia",
    "province": ""
  },
  {
    "name": "Guimbal",
    "province": ""
  },
  {
    "name": "Igbaras",
    "province": ""
  },
  {
    "name": "Iloilo",
    "province": ""
  },
  {
    "name": "Janiuay",
    "province": ""
  },
  {
    "name": "Lambunao",
    "province": ""
  },
  {
    "name": "Leganes",
    "province": ""
  },
  {
    "name": "Leon",
    "province": ""
  },
  {
    "name": "Maasin",
    "province": ""
  },
  {
    "name": "Miagao",
    "province": ""
  },
  {
    "name": "Mina",
    "province": ""
  },
  {
    "name": "New Lucena",
    "province": ""
  },
  {
    "name": "Oton",
    "province": ""
  },
  {
    "name": "Passi",
    "province": ""
  },
  {
    "name": "Pavia",
    "province": ""
  },
  {
    "name": "Pototan",
    "province": ""
  },
  {
    "name": "San Dionisio",
    "province": ""
  },
  {
    "name": "San Enrique",
    "province": ""
  },
  {
    "name": "San Joaquin",
    "province": ""
  },
  {
    "name": "Sara",
    "province": ""
  },
  {
    "name": "Tigbauan",
    "province": ""
  },
  {
    "name": "Tubungan",
    "province": ""
  },
  {
    "name": "Zarraga",
    "province": ""
  },
  {
    "name": "Bacolod",
    "province": ""
  },
  {
    "name": "Bago",
    "province": ""
  },
  {
    "name": "Binalbagan",
    "province": ""
  },
  {
    "name": "Cadiz",
    "province": ""
  },
  {
    "name": "Candoni",
    "province": ""
  },
  {
    "name": "Enrique B. Magalona",
    "province": ""
  },
  {
    "name": "Escalante",
    "province": ""
  },
  {
    "name": "Himamaylan",
    "province": ""
  },
  {
    "name": "Hinigaran",
    "province": ""
  },
  {
    "name": "Hinoba-An",
    "province": ""
  },
  {
    "name": "Ilog",
    "province": ""
  },
  {
    "name": "Isabela",
    "province": ""
  },
  {
    "name": "Kabankalan",
    "province": ""
  },
  {
    "name": "La Carlota",
    "province": ""
  },
  {
    "name": "La Castellana",
    "province": ""
  },
  {
    "name": "Manapla",
    "province": ""
  },
  {
    "name": "Moises Padilla",
    "province": ""
  },
  {
    "name": "Murcia",
    "province": ""
  },
  {
    "name": "Pulupandan",
    "province": ""
  },
  {
    "name": "Sagay",
    "province": ""
  },
  {
    "name": "Silay",
    "province": ""
  },
  {
    "name": "Sipalay",
    "province": ""
  },
  {
    "name": "Toboso",
    "province": ""
  },
  {
    "name": "Valladolid",
    "province": ""
  },
  {
    "name": "Victorias",
    "province": ""
  },
  {
    "name": "Salvador Benedicto",
    "province": ""
  },
  {
    "name": "Jordan",
    "province": ""
  },
  {
    "name": "Nueva Valencia",
    "province": ""
  },
  {
    "name": "San Lorenzo",
    "province": ""
  },
  {
    "name": "Sibunag",
    "province": ""
  },
  {
    "name": "Alburquerque",
    "province": ""
  },
  {
    "name": "Antequera",
    "province": ""
  },
  {
    "name": "Baclayon",
    "province": ""
  },
  {
    "name": "Balilihan",
    "province": ""
  },
  {
    "name": "Bilar",
    "province": ""
  },
  {
    "name": "Calape",
    "province": ""
  },
  {
    "name": "Candijay",
    "province": ""
  },
  {
    "name": "Carmen",
    "province": ""
  },
  {
    "name": "Catigbian",
    "province": ""
  },
  {
    "name": "Clarin",
    "province": ""
  },
  {
    "name": "Corella",
    "province": ""
  },
  {
    "name": "Cortes",
    "province": ""
  },
  {
    "name": "Dagohoy",
    "province": ""
  },
  {
    "name": "Danao",
    "province": ""
  },
  {
    "name": "Dauis",
    "province": ""
  },
  {
    "name": "Dimiao",
    "province": ""
  },
  {
    "name": "Duero",
    "province": ""
  },
  {
    "name": "Garcia Hernandez",
    "province": ""
  },
  {
    "name": "Guindulman",
    "province": ""
  },
  {
    "name": "Inabanga",
    "province": ""
  },
  {
    "name": "Jagna",
    "province": ""
  },
  {
    "name": "Getafe",
    "province": ""
  },
  {
    "name": "Lila",
    "province": ""
  },
  {
    "name": "Loay",
    "province": ""
  },
  {
    "name": "Loboc",
    "province": ""
  },
  {
    "name": "Loon",
    "province": ""
  },
  {
    "name": "Maribojoc",
    "province": ""
  },
  {
    "name": "Panglao",
    "province": ""
  },
  {
    "name": "President Carlos P. Garcia",
    "province": ""
  },
  {
    "name": "Sagbayan",
    "province": ""
  },
  {
    "name": "Sevilla",
    "province": ""
  },
  {
    "name": "Sierra Bullones",
    "province": ""
  },
  {
    "name": "Sikatuna",
    "province": ""
  },
  {
    "name": "Tagbilaran",
    "province": ""
  },
  {
    "name": "Talibon",
    "province": ""
  },
  {
    "name": "Trinidad",
    "province": ""
  },
  {
    "name": "Tubigon",
    "province": ""
  },
  {
    "name": "Ubay",
    "province": ""
  },
  {
    "name": "Valencia",
    "province": ""
  },
  {
    "name": "Bien Unido",
    "province": ""
  },
  {
    "name": "Alcoy",
    "province": ""
  },
  {
    "name": "Alegria",
    "province": ""
  },
  {
    "name": "Aloguinsan",
    "province": ""
  },
  {
    "name": "Argao",
    "province": ""
  },
  {
    "name": "Asturias",
    "province": ""
  },
  {
    "name": "Badian",
    "province": ""
  },
  {
    "name": "Balamban",
    "province": ""
  },
  {
    "name": "Bantayan",
    "province": ""
  },
  {
    "name": "Barili",
    "province": ""
  },
  {
    "name": "Bogo",
    "province": ""
  },
  {
    "name": "Boljoon",
    "province": ""
  },
  {
    "name": "Borbon",
    "province": ""
  },
  {
    "name": "Carcar",
    "province": ""
  },
  {
    "name": "Catmon",
    "province": ""
  },
  {
    "name": "Cebu",
    "province": ""
  },
  {
    "name": "Compostela",
    "province": ""
  },
  {
    "name": "Consolacion",
    "province": ""
  },
  {
    "name": "Cordova",
    "province": ""
  },
  {
    "name": "Daanbantayan",
    "province": ""
  },
  {
    "name": "Dalaguete",
    "province": ""
  },
  {
    "name": "Dumanjug",
    "province": ""
  },
  {
    "name": "Ginatilan",
    "province": ""
  },
  {
    "name": "Lapu-Lapu",
    "province": ""
  },
  {
    "name": "Liloan",
    "province": ""
  },
  {
    "name": "Madridejos",
    "province": ""
  },
  {
    "name": "Malabuyoc",
    "province": ""
  },
  {
    "name": "Mandaue",
    "province": ""
  },
  {
    "name": "Medellin",
    "province": ""
  },
  {
    "name": "Minglanilla",
    "province": ""
  },
  {
    "name": "Moalboal",
    "province": ""
  },
  {
    "name": "Oslob",
    "province": ""
  },
  {
    "name": "Pinamungajan",
    "province": ""
  },
  {
    "name": "Poro",
    "province": ""
  },
  {
    "name": "Ronda",
    "province": ""
  },
  {
    "name": "Samboan",
    "province": ""
  },
  {
    "name": "Santander",
    "province": ""
  },
  {
    "name": "Sibonga",
    "province": ""
  },
  {
    "name": "Sogod",
    "province": ""
  },
  {
    "name": "Tabogon",
    "province": ""
  },
  {
    "name": "Tabuelan",
    "province": ""
  },
  {
    "name": "Toledo",
    "province": ""
  },
  {
    "name": "Tuburan",
    "province": ""
  },
  {
    "name": "Tudela",
    "province": ""
  },
  {
    "name": "Amlan",
    "province": ""
  },
  {
    "name": "Ayungon",
    "province": ""
  },
  {
    "name": "Bacong",
    "province": ""
  },
  {
    "name": "Bais",
    "province": ""
  },
  {
    "name": "Basay",
    "province": ""
  },
  {
    "name": "Bayawan",
    "province": ""
  },
  {
    "name": "Bindoy",
    "province": ""
  },
  {
    "name": "Canlaon",
    "province": ""
  },
  {
    "name": "Dauin",
    "province": ""
  },
  {
    "name": "Dumaguete",
    "province": ""
  },
  {
    "name": "Guihulngan",
    "province": ""
  },
  {
    "name": "Jimalalud",
    "province": ""
  },
  {
    "name": "La Libertad",
    "province": ""
  },
  {
    "name": "Mabinay",
    "province": ""
  },
  {
    "name": "Manjuyod",
    "province": ""
  },
  {
    "name": "Siaton",
    "province": ""
  },
  {
    "name": "Sibulan",
    "province": ""
  },
  {
    "name": "Tanjay",
    "province": ""
  },
  {
    "name": "Tayasan",
    "province": ""
  },
  {
    "name": "Vallehermoso",
    "province": ""
  },
  {
    "name": "Zamboanguita",
    "province": ""
  },
  {
    "name": "Enrique Villanueva",
    "province": ""
  },
  {
    "name": "Larena",
    "province": ""
  },
  {
    "name": "Lazi",
    "province": ""
  },
  {
    "name": "Maria",
    "province": ""
  },
  {
    "name": "Siquijor",
    "province": ""
  },
  {
    "name": "Arteche",
    "province": ""
  },
  {
    "name": "Balangiga",
    "province": ""
  },
  {
    "name": "Balangkayan",
    "province": ""
  },
  {
    "name": "Borongan",
    "province": ""
  },
  {
    "name": "Can-Avid",
    "province": ""
  },
  {
    "name": "General Macarthur",
    "province": ""
  },
  {
    "name": "Giporlos",
    "province": ""
  },
  {
    "name": "Guiuan",
    "province": ""
  },
  {
    "name": "Hernani",
    "province": ""
  },
  {
    "name": "Jipapad",
    "province": ""
  },
  {
    "name": "Lawaan",
    "province": ""
  },
  {
    "name": "Llorente",
    "province": ""
  },
  {
    "name": "Maslog",
    "province": ""
  },
  {
    "name": "Maydolong",
    "province": ""
  },
  {
    "name": "Oras",
    "province": ""
  },
  {
    "name": "Quinapondan",
    "province": ""
  },
  {
    "name": "San Julian",
    "province": ""
  },
  {
    "name": "San Policarpo",
    "province": ""
  },
  {
    "name": "Sulat",
    "province": ""
  },
  {
    "name": "Taft",
    "province": ""
  },
  {
    "name": "Abuyog",
    "province": ""
  },
  {
    "name": "Alangalang",
    "province": ""
  },
  {
    "name": "Albuera",
    "province": ""
  },
  {
    "name": "Babatngon",
    "province": ""
  },
  {
    "name": "Barugo",
    "province": ""
  },
  {
    "name": "Baybay",
    "province": ""
  },
  {
    "name": "Burauen",
    "province": ""
  },
  {
    "name": "Calubian",
    "province": ""
  },
  {
    "name": "Capoocan",
    "province": ""
  },
  {
    "name": "Carigara",
    "province": ""
  },
  {
    "name": "Dagami",
    "province": ""
  },
  {
    "name": "Dulag",
    "province": ""
  },
  {
    "name": "Hilongos",
    "province": ""
  },
  {
    "name": "Hindang",
    "province": ""
  },
  {
    "name": "Inopacan",
    "province": ""
  },
  {
    "name": "Isabel",
    "province": ""
  },
  {
    "name": "Jaro",
    "province": ""
  },
  {
    "name": "Javier",
    "province": ""
  },
  {
    "name": "Julita",
    "province": ""
  },
  {
    "name": "Kananga",
    "province": ""
  },
  {
    "name": "Leyte",
    "province": ""
  },
  {
    "name": "Macarthur",
    "province": ""
  },
  {
    "name": "Mahaplag",
    "province": ""
  },
  {
    "name": "Matag-Ob",
    "province": ""
  },
  {
    "name": "Matalom",
    "province": ""
  },
  {
    "name": "Mayorga",
    "province": ""
  },
  {
    "name": "Merida",
    "province": ""
  },
  {
    "name": "Ormoc",
    "province": ""
  },
  {
    "name": "Palo",
    "province": ""
  },
  {
    "name": "Palompon",
    "province": ""
  },
  {
    "name": "Pastrana",
    "province": ""
  },
  {
    "name": "Tabango",
    "province": ""
  },
  {
    "name": "Tabontabon",
    "province": ""
  },
  {
    "name": "Tacloban",
    "province": ""
  },
  {
    "name": "Tolosa",
    "province": ""
  },
  {
    "name": "Tunga",
    "province": ""
  },
  {
    "name": "Villaba",
    "province": ""
  },
  {
    "name": "Allen",
    "province": ""
  },
  {
    "name": "Biri",
    "province": ""
  },
  {
    "name": "Bobon",
    "province": ""
  },
  {
    "name": "Capul",
    "province": ""
  },
  {
    "name": "Catarman",
    "province": ""
  },
  {
    "name": "Catubig",
    "province": ""
  },
  {
    "name": "Gamay",
    "province": ""
  },
  {
    "name": "Laoang",
    "province": ""
  },
  {
    "name": "Lapinig",
    "province": ""
  },
  {
    "name": "Las Navas",
    "province": ""
  },
  {
    "name": "Lavezares",
    "province": ""
  },
  {
    "name": "Mapanas",
    "province": ""
  },
  {
    "name": "Mondragon",
    "province": ""
  },
  {
    "name": "Palapag",
    "province": ""
  },
  {
    "name": "Pambujan",
    "province": ""
  },
  {
    "name": "San Roque",
    "province": ""
  },
  {
    "name": "Silvino Lobos",
    "province": ""
  },
  {
    "name": "Lope De Vega",
    "province": ""
  },
  {
    "name": "Almagro",
    "province": ""
  },
  {
    "name": "Basey",
    "province": ""
  },
  {
    "name": "Calbayog",
    "province": ""
  },
  {
    "name": "Calbiga",
    "province": ""
  },
  {
    "name": "Catbalogan",
    "province": ""
  },
  {
    "name": "Daram",
    "province": ""
  },
  {
    "name": "Gandara",
    "province": ""
  },
  {
    "name": "Hinabangan",
    "province": ""
  },
  {
    "name": "Jiabong",
    "province": ""
  },
  {
    "name": "Marabut",
    "province": ""
  },
  {
    "name": "Matuguinao",
    "province": ""
  },
  {
    "name": "Motiong",
    "province": ""
  },
  {
    "name": "Pinabacdao",
    "province": ""
  },
  {
    "name": "San Jose De Buan",
    "province": ""
  },
  {
    "name": "San Sebastian",
    "province": ""
  },
  {
    "name": "Santa Margarita",
    "province": ""
  },
  {
    "name": "Talalora",
    "province": ""
  },
  {
    "name": "Tarangnan",
    "province": ""
  },
  {
    "name": "Villareal",
    "province": ""
  },
  {
    "name": "Paranas",
    "province": ""
  },
  {
    "name": "Zumarraga",
    "province": ""
  },
  {
    "name": "Tagapul-An",
    "province": ""
  },
  {
    "name": "San Jorge",
    "province": ""
  },
  {
    "name": "Pagsanghan",
    "province": ""
  },
  {
    "name": "Anahawan",
    "province": ""
  },
  {
    "name": "Bontoc",
    "province": ""
  },
  {
    "name": "Hinunangan",
    "province": ""
  },
  {
    "name": "Hinundayan",
    "province": ""
  },
  {
    "name": "Libagon",
    "province": ""
  },
  {
    "name": "Macrohon",
    "province": ""
  },
  {
    "name": "Malitbog",
    "province": ""
  },
  {
    "name": "Pintuyan",
    "province": ""
  },
  {
    "name": "Saint Bernard",
    "province": ""
  },
  {
    "name": "San Ricardo",
    "province": ""
  },
  {
    "name": "Silago",
    "province": ""
  },
  {
    "name": "Tomas Oppus",
    "province": ""
  },
  {
    "name": "Limasawa",
    "province": ""
  },
  {
    "name": "Almeria",
    "province": ""
  },
  {
    "name": "Biliran",
    "province": ""
  },
  {
    "name": "Cabucgayan",
    "province": ""
  },
  {
    "name": "Caibiran",
    "province": ""
  },
  {
    "name": "Culaba",
    "province": ""
  },
  {
    "name": "Kawayan",
    "province": ""
  },
  {
    "name": "Maripipi",
    "province": ""
  },
  {
    "name": "Naval",
    "province": ""
  },
  {
    "name": "Dapitan",
    "province": ""
  },
  {
    "name": "Dipolog",
    "province": ""
  },
  {
    "name": "Katipunan",
    "province": ""
  },
  {
    "name": "Labason",
    "province": ""
  },
  {
    "name": "Liloy",
    "province": ""
  },
  {
    "name": "Manukan",
    "province": ""
  },
  {
    "name": "Mutia",
    "province": ""
  },
  {
    "name": "Piñan",
    "province": ""
  },
  {
    "name": "Polanco",
    "province": ""
  },
  {
    "name": "Pres. Manuel a. Roxas",
    "province": ""
  },
  {
    "name": "Salug",
    "province": ""
  },
  {
    "name": "Sergio osmeña Sr.",
    "province": ""
  },
  {
    "name": "Siayan",
    "province": ""
  },
  {
    "name": "Sibuco",
    "province": ""
  },
  {
    "name": "Sibutad",
    "province": ""
  },
  {
    "name": "Sindangan",
    "province": ""
  },
  {
    "name": "Siocon",
    "province": ""
  },
  {
    "name": "Sirawai",
    "province": ""
  },
  {
    "name": "Tampilisan",
    "province": ""
  },
  {
    "name": "Jose Dalman",
    "province": ""
  },
  {
    "name": "Gutalac",
    "province": ""
  },
  {
    "name": "Baliguian",
    "province": ""
  },
  {
    "name": "Godod",
    "province": ""
  },
  {
    "name": "Bacungan",
    "province": ""
  },
  {
    "name": "Kalawit",
    "province": ""
  },
  {
    "name": "Bayog",
    "province": ""
  },
  {
    "name": "Dimataling",
    "province": ""
  },
  {
    "name": "Dinas",
    "province": ""
  },
  {
    "name": "Dumalinao",
    "province": ""
  },
  {
    "name": "Dumingag",
    "province": ""
  },
  {
    "name": "Kumalarang",
    "province": ""
  },
  {
    "name": "Labangan",
    "province": ""
  },
  {
    "name": "Lapuyan",
    "province": ""
  },
  {
    "name": "Mahayag",
    "province": ""
  },
  {
    "name": "Margosatubig",
    "province": ""
  },
  {
    "name": "Midsalip",
    "province": ""
  },
  {
    "name": "Molave",
    "province": ""
  },
  {
    "name": "Pagadian",
    "province": ""
  },
  {
    "name": "Ramon Magsaysay",
    "province": ""
  },
  {
    "name": "Tabina",
    "province": ""
  },
  {
    "name": "Tambulig",
    "province": ""
  },
  {
    "name": "Tukuran",
    "province": ""
  },
  {
    "name": "Zamboanga",
    "province": ""
  },
  {
    "name": "Lakewood",
    "province": ""
  },
  {
    "name": "Josefina",
    "province": ""
  },
  {
    "name": "Sominot",
    "province": ""
  },
  {
    "name": "Vincenzo a. Sagun",
    "province": ""
  },
  {
    "name": "Guipos",
    "province": ""
  },
  {
    "name": "Tigbao",
    "province": ""
  },
  {
    "name": "Buug",
    "province": ""
  },
  {
    "name": "Diplahan",
    "province": ""
  },
  {
    "name": "Imelda",
    "province": ""
  },
  {
    "name": "Ipil",
    "province": ""
  },
  {
    "name": "Kabasalan",
    "province": ""
  },
  {
    "name": "Mabuhay",
    "province": ""
  },
  {
    "name": "Malangas",
    "province": ""
  },
  {
    "name": "Olutanga",
    "province": ""
  },
  {
    "name": "Payao",
    "province": ""
  },
  {
    "name": "Roseller Lim",
    "province": ""
  },
  {
    "name": "Siay",
    "province": ""
  },
  {
    "name": "Talusan",
    "province": ""
  },
  {
    "name": "Titay",
    "province": ""
  },
  {
    "name": "Tungawan",
    "province": ""
  },
  {
    "name": "Baungon",
    "province": ""
  },
  {
    "name": "Damulog",
    "province": ""
  },
  {
    "name": "Dangcagan",
    "province": ""
  },
  {
    "name": "Don Carlos",
    "province": ""
  },
  {
    "name": "Impasug-Ong",
    "province": ""
  },
  {
    "name": "Kadingilan",
    "province": ""
  },
  {
    "name": "Kalilangan",
    "province": ""
  },
  {
    "name": "Kibawe",
    "province": ""
  },
  {
    "name": "Kitaotao",
    "province": ""
  },
  {
    "name": "Lantapan",
    "province": ""
  },
  {
    "name": "Libona",
    "province": ""
  },
  {
    "name": "Malaybalay",
    "province": ""
  },
  {
    "name": "Manolo Fortich",
    "province": ""
  },
  {
    "name": "Maramag",
    "province": ""
  },
  {
    "name": "Pangantucan",
    "province": ""
  },
  {
    "name": "Sumilao",
    "province": ""
  },
  {
    "name": "Talakag",
    "province": ""
  },
  {
    "name": "Cabanglasan",
    "province": ""
  },
  {
    "name": "Guinsiliban",
    "province": ""
  },
  {
    "name": "Mahinog",
    "province": ""
  },
  {
    "name": "Mambajao",
    "province": ""
  },
  {
    "name": "Baloi",
    "province": ""
  },
  {
    "name": "Baroy",
    "province": ""
  },
  {
    "name": "Iligan",
    "province": ""
  },
  {
    "name": "Kapatagan",
    "province": ""
  },
  {
    "name": "Sultan Naga Dimaporo",
    "province": ""
  },
  {
    "name": "Kauswagan",
    "province": ""
  },
  {
    "name": "Kolambugan",
    "province": ""
  },
  {
    "name": "Lala",
    "province": ""
  },
  {
    "name": "Linamon",
    "province": ""
  },
  {
    "name": "Maigo",
    "province": ""
  },
  {
    "name": "Matungao",
    "province": ""
  },
  {
    "name": "Munai",
    "province": ""
  },
  {
    "name": "Nunungan",
    "province": ""
  },
  {
    "name": "Pantao Ragat",
    "province": ""
  },
  {
    "name": "Poona Piagapo",
    "province": ""
  },
  {
    "name": "Salvador",
    "province": ""
  },
  {
    "name": "Sapad",
    "province": ""
  },
  {
    "name": "Tagoloan",
    "province": ""
  },
  {
    "name": "Tangcal",
    "province": ""
  },
  {
    "name": "Tubod",
    "province": ""
  },
  {
    "name": "Pantar",
    "province": ""
  },
  {
    "name": "Aloran",
    "province": ""
  },
  {
    "name": "Baliangao",
    "province": ""
  },
  {
    "name": "Bonifacio",
    "province": ""
  },
  {
    "name": "Jimenez",
    "province": ""
  },
  {
    "name": "Lopez Jaena",
    "province": ""
  },
  {
    "name": "Oroquieta",
    "province": ""
  },
  {
    "name": "Ozamiz",
    "province": ""
  },
  {
    "name": "Panaon",
    "province": ""
  },
  {
    "name": "Sapang Dalaga",
    "province": ""
  },
  {
    "name": "Sinacaban",
    "province": ""
  },
  {
    "name": "Tangub",
    "province": ""
  },
  {
    "name": "Don Victoriano Chiongbian",
    "province": ""
  },
  {
    "name": "Alubijid",
    "province": ""
  },
  {
    "name": "Balingasag",
    "province": ""
  },
  {
    "name": "Balingoan",
    "province": ""
  },
  {
    "name": "Binuangan",
    "province": ""
  },
  {
    "name": "Cagayan De Oro",
    "province": ""
  },
  {
    "name": "El Salvador",
    "province": ""
  },
  {
    "name": "Gingoog",
    "province": ""
  },
  {
    "name": "Gitagum",
    "province": ""
  },
  {
    "name": "Initao",
    "province": ""
  },
  {
    "name": "Jasaan",
    "province": ""
  },
  {
    "name": "Kinoguitan",
    "province": ""
  },
  {
    "name": "Lagonglong",
    "province": ""
  },
  {
    "name": "Laguindingan",
    "province": ""
  },
  {
    "name": "Lugait",
    "province": ""
  },
  {
    "name": "Manticao",
    "province": ""
  },
  {
    "name": "Medina",
    "province": ""
  },
  {
    "name": "Naawan",
    "province": ""
  },
  {
    "name": "Opol",
    "province": ""
  },
  {
    "name": "Salay",
    "province": ""
  },
  {
    "name": "Sugbongcogon",
    "province": ""
  },
  {
    "name": "Talisayan",
    "province": ""
  },
  {
    "name": "Villanueva",
    "province": ""
  },
  {
    "name": "Asuncion",
    "province": ""
  },
  {
    "name": "Kapalong",
    "province": ""
  },
  {
    "name": "New Corella",
    "province": ""
  },
  {
    "name": "Panabo",
    "province": ""
  },
  {
    "name": "Island Garden City of Samal",
    "province": ""
  },
  {
    "name": "Tagum",
    "province": ""
  },
  {
    "name": "Talaingod",
    "province": ""
  },
  {
    "name": "Braulio E. Dujali",
    "province": ""
  },
  {
    "name": "Bansalan",
    "province": ""
  },
  {
    "name": "Davao",
    "province": ""
  },
  {
    "name": "Digos",
    "province": ""
  },
  {
    "name": "Kiblawan",
    "province": ""
  },
  {
    "name": "Malalag",
    "province": ""
  },
  {
    "name": "Matanao",
    "province": ""
  },
  {
    "name": "Padada",
    "province": ""
  },
  {
    "name": "Sulop",
    "province": ""
  },
  {
    "name": "Baganga",
    "province": ""
  },
  {
    "name": "Banaybanay",
    "province": ""
  },
  {
    "name": "Boston",
    "province": ""
  },
  {
    "name": "Caraga",
    "province": ""
  },
  {
    "name": "Cateel",
    "province": ""
  },
  {
    "name": "Governor Generoso",
    "province": ""
  },
  {
    "name": "Lupon",
    "province": ""
  },
  {
    "name": "Manay",
    "province": ""
  },
  {
    "name": "Mati",
    "province": ""
  },
  {
    "name": "Tarragona",
    "province": ""
  },
  {
    "name": "Laak",
    "province": ""
  },
  {
    "name": "Maco",
    "province": ""
  },
  {
    "name": "Maragusan",
    "province": ""
  },
  {
    "name": "Mawab",
    "province": ""
  },
  {
    "name": "Monkayo",
    "province": ""
  },
  {
    "name": "Montevista",
    "province": ""
  },
  {
    "name": "Nabunturan",
    "province": ""
  },
  {
    "name": "New Bataan",
    "province": ""
  },
  {
    "name": "Pantukan",
    "province": ""
  },
  {
    "name": "Don Marcelino",
    "province": ""
  },
  {
    "name": "Jose Abad Santos",
    "province": ""
  },
  {
    "name": "Malita",
    "province": ""
  },
  {
    "name": "Sarangani",
    "province": ""
  },
  {
    "name": "Alamada",
    "province": ""
  },
  {
    "name": "Kabacan",
    "province": ""
  },
  {
    "name": "Kidapawan",
    "province": ""
  },
  {
    "name": "Libungan",
    "province": ""
  },
  {
    "name": "Magpet",
    "province": ""
  },
  {
    "name": "Makilala",
    "province": ""
  },
  {
    "name": "Matalam",
    "province": ""
  },
  {
    "name": "Midsayap",
    "province": ""
  },
  {
    "name": "M'lang",
    "province": ""
  },
  {
    "name": "Pigkawayan",
    "province": ""
  },
  {
    "name": "Pikit",
    "province": ""
  },
  {
    "name": "Tulunan",
    "province": ""
  },
  {
    "name": "Antipas",
    "province": ""
  },
  {
    "name": "Banisilan",
    "province": ""
  },
  {
    "name": "Aleosan",
    "province": ""
  },
  {
    "name": "Arakan",
    "province": ""
  },
  {
    "name": "General Santos",
    "province": ""
  },
  {
    "name": "Koronadal",
    "province": ""
  },
  {
    "name": "Norala",
    "province": ""
  },
  {
    "name": "Polomolok",
    "province": ""
  },
  {
    "name": "Surallah",
    "province": ""
  },
  {
    "name": "Tampakan",
    "province": ""
  },
  {
    "name": "Tantangan",
    "province": ""
  },
  {
    "name": "T'boli",
    "province": ""
  },
  {
    "name": "Tupi",
    "province": ""
  },
  {
    "name": "Lake Sebu",
    "province": ""
  },
  {
    "name": "Bagumbayan",
    "province": ""
  },
  {
    "name": "Columbio",
    "province": ""
  },
  {
    "name": "Isulan",
    "province": ""
  },
  {
    "name": "Kalamansig",
    "province": ""
  },
  {
    "name": "Lebak",
    "province": ""
  },
  {
    "name": "Lutayan",
    "province": ""
  },
  {
    "name": "Lambayong",
    "province": ""
  },
  {
    "name": "Palimbang",
    "province": ""
  },
  {
    "name": "President Quirino",
    "province": ""
  },
  {
    "name": "Tacurong",
    "province": ""
  },
  {
    "name": "Sen. Ninoy Aquino",
    "province": ""
  },
  {
    "name": "Alabel",
    "province": ""
  },
  {
    "name": "Glan",
    "province": ""
  },
  {
    "name": "Kiamba",
    "province": ""
  },
  {
    "name": "Maasim",
    "province": ""
  },
  {
    "name": "Maitum",
    "province": ""
  },
  {
    "name": "Malapatan",
    "province": ""
  },
  {
    "name": "Malungon",
    "province": ""
  },
  {
    "name": "Mandaluyong",
    "province": ""
  },
  {
    "name": "Marikina",
    "province": ""
  },
  {
    "name": "Caloocan",
    "province": ""
  },
  {
    "name": "Malabon",
    "province": ""
  },
  {
    "name": "Navotas",
    "province": ""
  },
  {
    "name": "Valenzuela",
    "province": ""
  },
  {
    "name": "Las Piñas",
    "province": ""
  },
  {
    "name": "Muntinlupa",
    "province": ""
  },
  {
    "name": "Parañaque",
    "province": ""
  },
  {
    "name": "Pasay",
    "province": ""
  },
  {
    "name": "Pateros",
    "province": ""
  },
  {
    "name": "Bangued",
    "province": ""
  },
  {
    "name": "Boliney",
    "province": ""
  },
  {
    "name": "Bucay",
    "province": ""
  },
  {
    "name": "Bucloc",
    "province": ""
  },
  {
    "name": "Daguioman",
    "province": ""
  },
  {
    "name": "Danglas",
    "province": ""
  },
  {
    "name": "Lacub",
    "province": ""
  },
  {
    "name": "Lagangilang",
    "province": ""
  },
  {
    "name": "Lagayan",
    "province": ""
  },
  {
    "name": "Langiden",
    "province": ""
  },
  {
    "name": "Licuan-Baay",
    "province": ""
  },
  {
    "name": "Luba",
    "province": ""
  },
  {
    "name": "Malibcong",
    "province": ""
  },
  {
    "name": "Manabo",
    "province": ""
  },
  {
    "name": "Peñarrubia",
    "province": ""
  },
  {
    "name": "Pidigan",
    "province": ""
  },
  {
    "name": "Sallapadan",
    "province": ""
  },
  {
    "name": "Tayum",
    "province": ""
  },
  {
    "name": "Tineg",
    "province": ""
  },
  {
    "name": "Tubo",
    "province": ""
  },
  {
    "name": "Villaviciosa",
    "province": ""
  },
  {
    "name": "Atok",
    "province": ""
  },
  {
    "name": "Baguio",
    "province": ""
  },
  {
    "name": "Bakun",
    "province": ""
  },
  {
    "name": "Bokod",
    "province": ""
  },
  {
    "name": "Buguias",
    "province": ""
  },
  {
    "name": "Itogon",
    "province": ""
  },
  {
    "name": "Kabayan",
    "province": ""
  },
  {
    "name": "Kapangan",
    "province": ""
  },
  {
    "name": "Kibungan",
    "province": ""
  },
  {
    "name": "La Trinidad",
    "province": ""
  },
  {
    "name": "Mankayan",
    "province": ""
  },
  {
    "name": "Sablan",
    "province": ""
  },
  {
    "name": "Tuba",
    "province": ""
  },
  {
    "name": "Tublay",
    "province": ""
  },
  {
    "name": "Banaue",
    "province": ""
  },
  {
    "name": "Hungduan",
    "province": ""
  },
  {
    "name": "Kiangan",
    "province": ""
  },
  {
    "name": "Lagawe",
    "province": ""
  },
  {
    "name": "Lamut",
    "province": ""
  },
  {
    "name": "Mayoyao",
    "province": ""
  },
  {
    "name": "Alfonso Lista",
    "province": ""
  },
  {
    "name": "Aguinaldo",
    "province": ""
  },
  {
    "name": "Hingyon",
    "province": ""
  },
  {
    "name": "Tinoc",
    "province": ""
  },
  {
    "name": "Asipulo",
    "province": ""
  },
  {
    "name": "Balbalan",
    "province": ""
  },
  {
    "name": "Lubuagan",
    "province": ""
  },
  {
    "name": "Pasil",
    "province": ""
  },
  {
    "name": "Pinukpuk",
    "province": ""
  },
  {
    "name": "Tabuk",
    "province": ""
  },
  {
    "name": "Tanudan",
    "province": ""
  },
  {
    "name": "Tinglayan",
    "province": ""
  },
  {
    "name": "Barlig",
    "province": ""
  },
  {
    "name": "Bauko",
    "province": ""
  },
  {
    "name": "Besao",
    "province": ""
  },
  {
    "name": "Natonin",
    "province": ""
  },
  {
    "name": "Paracelis",
    "province": ""
  },
  {
    "name": "Sabangan",
    "province": ""
  },
  {
    "name": "Sadanga",
    "province": ""
  },
  {
    "name": "Sagada",
    "province": ""
  },
  {
    "name": "Tadian",
    "province": ""
  },
  {
    "name": "Calanasan",
    "province": ""
  },
  {
    "name": "Conner",
    "province": ""
  },
  {
    "name": "Flora",
    "province": ""
  },
  {
    "name": "Kabugao",
    "province": ""
  },
  {
    "name": "Pudtol",
    "province": ""
  },
  {
    "name": "Santa Marcela",
    "province": ""
  },
  {
    "name": "Butuan",
    "province": ""
  },
  {
    "name": "Cabadbaran",
    "province": ""
  },
  {
    "name": "Jabonga",
    "province": ""
  },
  {
    "name": "Kitcharao",
    "province": ""
  },
  {
    "name": "Las Nieves",
    "province": ""
  },
  {
    "name": "Nasipit",
    "province": ""
  },
  {
    "name": "Tubay",
    "province": ""
  },
  {
    "name": "Remedios T. Romualdez",
    "province": ""
  },
  {
    "name": "Bayugan",
    "province": ""
  },
  {
    "name": "Bunawan",
    "province": ""
  },
  {
    "name": "Loreto",
    "province": ""
  },
  {
    "name": "Prosperidad",
    "province": ""
  },
  {
    "name": "Santa Josefa",
    "province": ""
  },
  {
    "name": "Talacogon",
    "province": ""
  },
  {
    "name": "Trento",
    "province": ""
  },
  {
    "name": "Veruela",
    "province": ""
  },
  {
    "name": "Sibagat",
    "province": ""
  },
  {
    "name": "Bacuag",
    "province": ""
  },
  {
    "name": "Claver",
    "province": ""
  },
  {
    "name": "Dapa",
    "province": ""
  },
  {
    "name": "Del Carmen",
    "province": ""
  },
  {
    "name": "Gigaquit",
    "province": ""
  },
  {
    "name": "Mainit",
    "province": ""
  },
  {
    "name": "Malimono",
    "province": ""
  },
  {
    "name": "San Benito",
    "province": ""
  },
  {
    "name": "Santa Monica",
    "province": ""
  },
  {
    "name": "Surigao",
    "province": ""
  },
  {
    "name": "Tagana-An",
    "province": ""
  },
  {
    "name": "Barobo",
    "province": ""
  },
  {
    "name": "Bayabas",
    "province": ""
  },
  {
    "name": "Bislig",
    "province": ""
  },
  {
    "name": "Cagwait",
    "province": ""
  },
  {
    "name": "Cantilan",
    "province": ""
  },
  {
    "name": "Carrascal",
    "province": ""
  },
  {
    "name": "Hinatuan",
    "province": ""
  },
  {
    "name": "Lanuza",
    "province": ""
  },
  {
    "name": "Lianga",
    "province": ""
  },
  {
    "name": "Lingig",
    "province": ""
  },
  {
    "name": "Madrid",
    "province": ""
  },
  {
    "name": "Marihatag",
    "province": ""
  },
  {
    "name": "Tagbina",
    "province": ""
  },
  {
    "name": "Tago",
    "province": ""
  },
  {
    "name": "Tandag",
    "province": ""
  },
  {
    "name": "Basilisa",
    "province": ""
  },
  {
    "name": "Cagdianao",
    "province": ""
  },
  {
    "name": "Dinagat",
    "province": ""
  },
  {
    "name": "Libjo",
    "province": ""
  },
  {
    "name": "Tubajon",
    "province": ""
  },
  {
    "name": "Lamitan",
    "province": ""
  },
  {
    "name": "Lantawan",
    "province": ""
  },
  {
    "name": "Maluso",
    "province": ""
  },
  {
    "name": "Sumisip",
    "province": ""
  },
  {
    "name": "Tipo-Tipo",
    "province": ""
  },
  {
    "name": "Akbar",
    "province": ""
  },
  {
    "name": "Al-Barka",
    "province": ""
  },
  {
    "name": "Hadji Mohammad Ajul",
    "province": ""
  },
  {
    "name": "Ungkaya Pukan",
    "province": ""
  },
  {
    "name": "Hadji Muhtamad",
    "province": ""
  },
  {
    "name": "Tabuan-Lasa",
    "province": ""
  },
  {
    "name": "Bacolod-Kalawi",
    "province": ""
  },
  {
    "name": "Balabagan",
    "province": ""
  },
  {
    "name": "Balindong",
    "province": ""
  },
  {
    "name": "Bayang",
    "province": ""
  },
  {
    "name": "Binidayan",
    "province": ""
  },
  {
    "name": "Bubong",
    "province": ""
  },
  {
    "name": "Butig",
    "province": ""
  },
  {
    "name": "Ganassi",
    "province": ""
  },
  {
    "name": "Kapai",
    "province": ""
  },
  {
    "name": "Lumba-Bayabao",
    "province": ""
  },
  {
    "name": "Lumbatan",
    "province": ""
  },
  {
    "name": "Madalum",
    "province": ""
  },
  {
    "name": "Madamba",
    "province": ""
  },
  {
    "name": "Malabang",
    "province": ""
  },
  {
    "name": "Marantao",
    "province": ""
  },
  {
    "name": "Marawi",
    "province": ""
  },
  {
    "name": "Masiu",
    "province": ""
  },
  {
    "name": "Mulondo",
    "province": ""
  },
  {
    "name": "Pagayawan",
    "province": ""
  },
  {
    "name": "Piagapo",
    "province": ""
  },
  {
    "name": "Poona Bayabao",
    "province": ""
  },
  {
    "name": "Pualas",
    "province": ""
  },
  {
    "name": "Ditsaan-Ramain",
    "province": ""
  },
  {
    "name": "Saguiaran",
    "province": ""
  },
  {
    "name": "Tamparan",
    "province": ""
  },
  {
    "name": "Taraka",
    "province": ""
  },
  {
    "name": "Tubaran",
    "province": ""
  },
  {
    "name": "Tugaya",
    "province": ""
  },
  {
    "name": "Marogong",
    "province": ""
  },
  {
    "name": "Calanogas",
    "province": ""
  },
  {
    "name": "Buadiposo-Buntong",
    "province": ""
  },
  {
    "name": "Maguing",
    "province": ""
  },
  {
    "name": "Picong",
    "province": ""
  },
  {
    "name": "Lumbayanague",
    "province": ""
  },
  {
    "name": "Amai Manabilang",
    "province": ""
  },
  {
    "name": "Tagoloan Ii",
    "province": ""
  },
  {
    "name": "Sultan Dumalondong",
    "province": ""
  },
  {
    "name": "Lumbaca-Unayan",
    "province": ""
  },
  {
    "name": "Ampatuan",
    "province": ""
  },
  {
    "name": "Buldon",
    "province": ""
  },
  {
    "name": "Buluan",
    "province": ""
  },
  {
    "name": "Cotabato",
    "province": ""
  },
  {
    "name": "Datu Paglas",
    "province": ""
  },
  {
    "name": "Datu Piang",
    "province": ""
  },
  {
    "name": "Datu Odin Sinsuat",
    "province": ""
  },
  {
    "name": "Shariff Aguak",
    "province": ""
  },
  {
    "name": "Matanog",
    "province": ""
  },
  {
    "name": "Pagalungan",
    "province": ""
  },
  {
    "name": "Parang",
    "province": ""
  },
  {
    "name": "Sultan Kudarat",
    "province": ""
  },
  {
    "name": "Sultan Sa Barongis",
    "province": ""
  },
  {
    "name": "Kabuntalan",
    "province": ""
  },
  {
    "name": "Talayan",
    "province": ""
  },
  {
    "name": "South Upi",
    "province": ""
  },
  {
    "name": "Barira",
    "province": ""
  },
  {
    "name": "Gen. s.k. Pendatun",
    "province": ""
  },
  {
    "name": "Mamasapano",
    "province": ""
  },
  {
    "name": "Talitay",
    "province": ""
  },
  {
    "name": "Pagagawan",
    "province": ""
  },
  {
    "name": "Paglat",
    "province": ""
  },
  {
    "name": "Sultan Mastura",
    "province": ""
  },
  {
    "name": "Guindulungan",
    "province": ""
  },
  {
    "name": "Datu Saudi-Ampatuan",
    "province": ""
  },
  {
    "name": "Datu Unsay",
    "province": ""
  },
  {
    "name": "Datu Abdullah Sangki",
    "province": ""
  },
  {
    "name": "Rajah Buayan",
    "province": ""
  },
  {
    "name": "Datu Blah T. Sinsuat",
    "province": ""
  },
  {
    "name": "Datu Anggal Midtimbang",
    "province": ""
  },
  {
    "name": "Mangudadatu",
    "province": ""
  },
  {
    "name": "Pandag",
    "province": ""
  },
  {
    "name": "Northern Kabuntalan",
    "province": ""
  },
  {
    "name": "Datu Hoffer Ampatuan",
    "province": ""
  },
  {
    "name": "Datu Salibo",
    "province": ""
  },
  {
    "name": "Shariff Saydona Mustapha",
    "province": ""
  },
  {
    "name": "Indanan",
    "province": ""
  },
  {
    "name": "Jolo",
    "province": ""
  },
  {
    "name": "Kalingalan Caluang",
    "province": ""
  },
  {
    "name": "Luuk",
    "province": ""
  },
  {
    "name": "Maimbung",
    "province": ""
  },
  {
    "name": "Hadji Panglima Tahil",
    "province": ""
  },
  {
    "name": "Old Panamao",
    "province": ""
  },
  {
    "name": "Pangutaran",
    "province": ""
  },
  {
    "name": "Pata",
    "province": ""
  },
  {
    "name": "Patikul",
    "province": ""
  },
  {
    "name": "Siasi",
    "province": ""
  },
  {
    "name": "Talipao",
    "province": ""
  },
  {
    "name": "Tapul",
    "province": ""
  },
  {
    "name": "Tongkil",
    "province": ""
  },
  {
    "name": "Panglima Estino",
    "province": ""
  },
  {
    "name": "Lugus",
    "province": ""
  },
  {
    "name": "Pandami",
    "province": ""
  },
  {
    "name": "Omar",
    "province": ""
  },
  {
    "name": "Panglima Sugala",
    "province": ""
  },
  {
    "name": "Bongao",
    "province": ""
  },
  {
    "name": "Mapun",
    "province": ""
  },
  {
    "name": "Simunul",
    "province": ""
  },
  {
    "name": "Sitangkai",
    "province": ""
  },
  {
    "name": "South Ubian",
    "province": ""
  },
  {
    "name": "Tandubas",
    "province": ""
  },
  {
    "name": "Turtle Islands",
    "province": ""
  },
  {
    "name": "Languyan",
    "province": ""
  },
  {
    "name": "Sapa-Sapa",
    "province": ""
  },
  {
    "name": "Sibutu",
    "province": ""
  }
];

/** Philippine islands and regions that commonly appear in school names */
const PHILIPPINE_ISLANDS_REGIONS: Array<{ name: string; relatedProvinces: string[] }> = [
  { name: "Negros", relatedProvinces: ["Negros Occidental", "Negros Oriental"] },
  { name: "Panay", relatedProvinces: ["Aklan", "Antique", "Capiz", "Iloilo"] },
  { name: "Mindoro", relatedProvinces: ["Occidental Mindoro", "Oriental Mindoro"] },
  { name: "Samar", relatedProvinces: ["Samar", "Eastern Samar", "Northern Samar"] },
  { name: "Mindanao", relatedProvinces: ["Davao del Sur", "Davao del Norte", "Bukidnon", "Misamis Oriental", "Zamboanga del Sur", "Lanao del Norte", "Cotabato", "South Cotabato", "Sultan Kudarat", "Sarangani", "Agusan del Norte", "Agusan del Sur", "Surigao del Norte", "Surigao del Sur"] },
  { name: "Visayas", relatedProvinces: ["Cebu", "Bohol", "Negros Occidental", "Negros Oriental", "Iloilo", "Leyte", "Samar", "Aklan", "Antique", "Capiz", "Siquijor", "Guimaras"] },
  { name: "Luzon", relatedProvinces: ["Batangas", "Cavite", "Laguna", "Quezon", "Rizal", "Bulacan", "Pampanga", "Tarlac", "Pangasinan", "Ilocos Norte", "Ilocos Sur", "La Union", "Cagayan", "Isabela", "Nueva Ecija", "Aurora", "Bataan", "Zambales", "Albay", "Camarines Norte", "Camarines Sur", "Sorsogon", "Masbate", "Catanduanes", "Metro Manila"] },
  { name: "Bicol", relatedProvinces: ["Albay", "Camarines Norte", "Camarines Sur", "Catanduanes", "Masbate", "Sorsogon"] },
  { name: "Ilocos", relatedProvinces: ["Ilocos Norte", "Ilocos Sur", "La Union", "Pangasinan"] },
  { name: "Cordillera", relatedProvinces: ["Abra", "Apayao", "Benguet", "Ifugao", "Kalinga", "Mountain Province"] },
  { name: "Calabarzon", relatedProvinces: ["Batangas", "Cavite", "Laguna", "Quezon", "Rizal"] },
  { name: "CALABARZON", relatedProvinces: ["Batangas", "Cavite", "Laguna", "Quezon", "Rizal"] },
  { name: "Mimaropa", relatedProvinces: ["Marinduque", "Occidental Mindoro", "Oriental Mindoro", "Palawan", "Romblon"] },
  { name: "MIMAROPA", relatedProvinces: ["Marinduque", "Occidental Mindoro", "Oriental Mindoro", "Palawan", "Romblon"] },
  { name: "Caraga", relatedProvinces: ["Agusan del Norte", "Agusan del Sur", "Dinagat Islands", "Surigao del Norte", "Surigao del Sur"] },
  { name: "Zamboanga", relatedProvinces: ["Zamboanga del Norte", "Zamboanga del Sur", "Zamboanga Sibugay"] },
  { name: "Davao", relatedProvinces: ["Davao de Oro", "Davao del Norte", "Davao del Sur", "Davao Occidental", "Davao Oriental"] },
];

/** Well-known multi-campus school names/acronyms */
const MULTI_CAMPUS_SCHOOLS: string[] = [
  "AMA", "STI", "CIIT", "ACLC", "ABE", "MAPUA", "FEU", "CEU", "JRU",
  "EARIST", "TIP", "PATTS", "ICCT", "LCCM", "LCBA", "SPC", "SSC",
  "AIE", "APEC", "ASIA PACIFIC", "GLOBAL", "INTERNATIONAL",
  "NATIONAL UNIVERSITY", "POLYTECHNIC", "TECHNOLOGICAL",
  "INFORMATICS", "SYSTEMS PLUS", "SYSTEMS TECHNOLOGY",
  "DATA CENTER", "DATAMEX", "INTERFACE", "COMPUTER COLLEGE",
];

/** Words in school names that are NOT location indicators (to avoid false positives) */
const NON_LOCATION_WORDS = new Set([
  "national", "central", "southern", "northern", "eastern", "western",
  "new", "san", "santo", "santa", "st", "sto",
  "state", "city", "municipal", "provincial", "regional",
  "college", "university", "school", "academy", "institute", "polytechnic",
  "high", "elementary", "senior", "junior", "integrated",
  "science", "technology", "arts", "vocational", "technical",
  "memorial", "foundation", "incorporated", "inc",
  "de", "del", "la", "las", "los", "el",
]);

// ─── Helper Functions ───────────────────────────────────────────────────────

function normalizeForComparison(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")  // remove diacritics (ñ → n, etc.)
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Check if a word boundary match exists in text for a multi-word place name */
function containsPlace(normalizedText: string, placeName: string): boolean {
  const normalizedPlace = normalizeForComparison(placeName);
  if (!normalizedPlace) return false;

  // Create a word-boundary regex for the place name
  const escaped = normalizedPlace.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(?:^|\\s|-)${escaped}(?:\\s|-|$)`, "i");
  return regex.test(` ${normalizedText} `);
}

/**
 * Checks whether a geocoded province matches any of the expected provinces.
 * Handles partial matching (e.g., "Negros Occidental" matches against "Negros").
 */
function provinceMatches(geocodedProvince: string, expectedProvinces: string[]): boolean {
  const normGeocoded = normalizeForComparison(geocodedProvince);
  return expectedProvinces.some(expected => {
    const normExpected = normalizeForComparison(expected);
    if (!normExpected) return false;
    return normGeocoded === normExpected || 
           normGeocoded.includes(normExpected) || 
           normExpected.includes(normGeocoded);
  });
}

// ─── Main API ───────────────────────────────────────────────────────────────

/**
 * Extracts location hints from a school name by scanning for Philippine
 * province names, city names, island/region names embedded in the school name.
 * 
 * @example
 * extractLocationHintsFromName("Negros College Incorporated SHS") 
 * // → [{ place: "Negros", type: "island", parentProvinces: ["Negros Occidental", "Negros Oriental"] }]
 * 
 * extractLocationHintsFromName("Batangas State University")
 * // → [{ place: "Batangas", type: "province" }]
 * 
 * extractLocationHintsFromName("AMA Computer College")
 * // → [] (no location hint)
 */
export function extractLocationHintsFromName(schoolName: string): LocationHint[] {
  const hints: LocationHint[] = [];
  const normalized = normalizeForComparison(schoolName);

  // 1. Check islands/regions first (they have broader coverage: "Negros", "Visayas", etc.)
  for (const island of PHILIPPINE_ISLANDS_REGIONS) {
    if (containsPlace(normalized, island.name)) {
      hints.push({
        place: island.name,
        type: island.name.length <= 10 ? "island" : "region",
        parentProvinces: island.relatedProvinces,
      });
    }
  }

  // 2. Check multi-word province names (e.g., "Camarines Norte", "Negros Occidental")
  for (const province of PHILIPPINE_PROVINCES) {
    if (province.includes(" ") && containsPlace(normalized, province)) {
      // Don't duplicate if already captured via island/region
      if (!hints.some(h => h.parentProvinces?.includes(province) || h.place === province)) {
        hints.push({ place: province, type: "province" });
      }
    }
  }

  // 3. Check single-word province names (stricter — must be a standalone word and not common)
  for (const province of SINGLE_WORD_PROVINCES) {
    const normProv = normalizeForComparison(province);
    if (NON_LOCATION_WORDS.has(normProv)) continue;
    if (containsPlace(normalized, province)) {
      // Don't duplicate
      if (!hints.some(h => h.place === province || h.parentProvinces?.includes(province))) {
        hints.push({ place: province, type: "province" });
      }
    }
  }

  // 4. Check cities (multi-word ones like "San Pablo", "Cebu City")
  for (const city of PHILIPPINE_CITIES) {
    // Only check city names that are distinctive enough (>= 4 chars, not a common word)
    const normCity = normalizeForComparison(city.name);
    if (normCity.length < 4) continue;
    if (NON_LOCATION_WORDS.has(normCity)) continue;
    // Skip single-word city names that are too common to be a reliable indicator
    if (!city.name.includes(" ") && city.name.length < 5) continue;

    if (containsPlace(normalized, city.name)) {
      if (!hints.some(h => h.place === city.name)) {
        hints.push({
          place: city.name,
          type: "city",
          parentProvinces: [city.province],
        });
      }
    }
  }

  return hints;
}

/**
 * Detects whether a school's name suggests a different location than its
 * geocoded province/municipality.
 */
export function detectLocationMismatch(
  schoolName: string,
  geocodedProvince: string,
  geocodedMunicipality: string,
  studentOriginHint?: string,
): MismatchResult {
  const hints = extractLocationHintsFromName(schoolName);

  // No location hints in the name — check if it's an ambiguous multi-campus school
  if (hints.length === 0) {
    const ambiguous = isAmbiguousSchoolName(schoolName);
    if (ambiguous) {
      return {
        hasMismatch: false,
        isAmbiguous: true,
        severity: "medium",
        message: `"${schoolName}" is a multi-campus institution. ` +
                 (studentOriginHint
                   ? `Using student demographics (${studentOriginHint}) to locate the nearest campus.`
                   : `No student demographics available — verify the campus manually.`),
        suggestedQuery: studentOriginHint
          ? `${schoolName}, ${studentOriginHint}, Philippines`
          : undefined,
      };
    }
    // No hints and not a known multi-campus — nothing to check
    return { hasMismatch: false };
  }

  // We have location hints — compare against geocoded location
  const geocodedLocationStr = [geocodedMunicipality, geocodedProvince].filter(Boolean).join(", ");
  const normGeocoded = normalizeForComparison(geocodedLocationStr);

  for (const hint of hints) {
    const expectedProvinces = (hint.parentProvinces || [hint.place]).filter(Boolean);

    // Check if geocoded province matches expected location
    const matchesProvince = expectedProvinces.some(p => {
      const normP = normalizeForComparison(p);
      if (!normP) return false;
      return normGeocoded.includes(normP) || provinceMatches(geocodedProvince, [p]);
    });

    // Also check if the place name itself appears in the geocoded location
    const normPlace = normalizeForComparison(hint.place);
    const placeInGeocoded = normGeocoded.includes(normPlace);

    if (!matchesProvince && !placeInGeocoded) {
      return {
        hasMismatch: true,
        severity: "high",
        expectedLocation: hint.place,
        actualLocation: geocodedLocationStr || "Unknown",
        message: `School name contains "${hint.place}" but geocoded location is "${geocodedLocationStr}". The pin may be pointing to the wrong location.`,
        suggestedQuery: studentOriginHint
          ? `${schoolName}, ${studentOriginHint}, Philippines`
          : `${schoolName}, ${hint.place}, Philippines`,
      };
    }
  }

  // All hints match the geocoded location
  return { hasMismatch: false };
}

/**
 * Detects if a school name is ambiguous (no geographic indicator) and
 * could be a multi-campus institution.
 */
export function isAmbiguousSchoolName(schoolName: string): boolean {
  const normalized = normalizeForComparison(schoolName);

  // Check against known multi-campus school names/acronyms
  for (const campus of MULTI_CAMPUS_SCHOOLS) {
    const normCampus = normalizeForComparison(campus);
    if (containsPlace(normalized, campus) || normalized.includes(normCampus)) {
      return true;
    }
  }

  // Check if the name is very short (likely an acronym with no location)
  const words = schoolName.trim().split(/\s+/);
  const noSpaceName = schoolName.replace(/\s+/g, "");
  if (noSpaceName.length <= 8 && noSpaceName === noSpaceName.toUpperCase()) {
    // Short all-caps acronym with no location hints
    const hints = extractLocationHintsFromName(schoolName);
    if (hints.length === 0) return true;
  }

  return false;
}

/**
 * Builds the optimal geocode search query for a school.
 * 
 * Priority:
 * 1. If school name has location hints → use the name directly
 * 2. If municipality is provided → append municipality 
 * 3. If school is ambiguous and student origin is available → append student area
 * 4. Fallback → just school name + Philippines
 */
export function buildSmartGeocodeQuery(
  schoolName: string,
  options?: {
    municipality?: string;
    studentOriginHint?: string;
    province?: string;
  }
): { query: string; strategy: "name-hint" | "municipality" | "student-origin" | "default" } {
  const hints = extractLocationHintsFromName(schoolName);
  const ambiguous = isAmbiguousSchoolName(schoolName);

  // If the school name already contains a strong location hint, append it to the query explicitly.
  // This helps Google Maps focus on that specific area instead of getting confused by the full name.
  if (hints.length > 0 && !ambiguous) {
    const hintPlaces = Array.from(new Set(hints.map(h => h.place))).join(", ");
    return {
      query: `${schoolName}, ${hintPlaces}, Philippines`,
      strategy: "name-hint",
    };
  }

  // For ambiguous schools, prefer student origin data to find the right campus
  if (ambiguous && options?.studentOriginHint) {
    return {
      query: `${schoolName}, ${options.studentOriginHint}, Philippines`,
      strategy: "student-origin",
    };
  }

  // Use municipality if available
  if (options?.municipality) {
    return {
      query: `${schoolName}, ${options.municipality}, Philippines`,
      strategy: "municipality",
    };
  }

  // Use student origin even for non-ambiguous schools without municipality
  if (options?.studentOriginHint) {
    return {
      query: `${schoolName}, ${options.studentOriginHint}, Philippines`,
      strategy: "student-origin",
    };
  }

  // Fallback
  return {
    query: `${schoolName}, Philippines`,
    strategy: "default",
  };
}
