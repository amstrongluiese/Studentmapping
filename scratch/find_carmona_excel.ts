import xlsx from 'xlsx';

const file = xlsx.readFile('attached_assets/BEIS 2024-2025 MASTERLIST.xlsx');
const sheet = file.Sheets[file.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet);

const carmonaSchools = data.filter((row: any) => {
  return Object.values(row).some(v => String(v).toLowerCase().includes('carmona'));
});

console.log(`Found ${carmonaSchools.length} rows with 'carmona':`);
carmonaSchools.forEach((row: any) => console.log(row));
