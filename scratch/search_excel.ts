import xlsx from 'xlsx';

const files = ['Geocoded_Schools_2026.xlsx', 'School_Masterlist.xlsx'];

for (const fileName of files) {
  try {
    const file = xlsx.readFile(fileName);
    console.log(`\nSearching in ${fileName}:`);
    for (const sheetName of file.SheetNames) {
      const sheet = file.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet);
      
      const carmonaSchools = data.filter((row: any) => {
        return Object.values(row).some(v => String(v).toLowerCase().includes('carmona'));
      });
      
      if (carmonaSchools.length > 0) {
        console.log(`  Found in sheet ${sheetName}:`);
        carmonaSchools.forEach((row: any) => console.log(row));
      }
    }
  } catch(e) {
    console.error(`Could not read ${fileName}`, e.message);
  }
}
