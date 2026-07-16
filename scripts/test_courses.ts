import dotenv from "dotenv";

dotenv.config();

async function main() {
  const payload = {
    studentNumber: "26-16596",
    fullName: "Anglon, Neilljon Louie S",
    course: "BS CRIM",
    lastSchoolName: "St. Ignatius Technical Institute of Business Arts",
    lastSchoolType: null,
    municipality: "City of Santa Rosa",
    province: "Laguna",
    yearLevel: null,
    enrollmentStatus: "Active",
    enrollmentDate: "2026-07-12"
  };

  try {
    const res = await fetch("http://localhost:5000/api/students/processed/11092", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    const text = await res.text();
    console.log(`STATUS: ${res.status}`);
    console.log(`RESPONSE: ${text}`);
  } catch (err) {
    console.error(err);
  }
  
  process.exit(0);
}

main().catch(console.error);

main().catch(console.error);
