import xlsx from 'xlsx';

try {
  const filePath = 'C:/Users/PC/Documents/GitHub/Studentmapping/School Masterlist.xlsx';
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet, { defval: "" });
  
  if (data.length > 0) {
    console.log('Total Rows:', data.length);
    console.log('Columns:', Object.keys(data[0]));
    console.log('First row:', JSON.stringify(data[0], null, 2));
  }
} catch (err) {
  console.error("Error:", err);
}
