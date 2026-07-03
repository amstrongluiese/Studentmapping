import * as fs from 'fs';

const url = 'https://ebeis.deped.gov.ph/beis/reports_info/viewMasterList';
const classIds = ['921', '968', '967', '923', '958', '959', '963', '964', '969'];
const allSchools = [];

async function scrape() {
  for (const classId of classIds) {
    let page = 1;
    let keepGoing = true;

    while (keepGoing) {
      console.log(`Fetching class ${classId}, page ${page}...`);
      const data = new URLSearchParams();
      data.append('school[id]', '');
      data.append('school[school_name]', '');
      data.append('school[co_gen_class]', '');
      data.append('school[general_classification_id]', '');
      data.append('school[curricular_class_id]', classId);
      data.append('school[region_id]', '4'); // Region IV-A
      data.append('school[user_id]', '');
      data.append('school[school_head]', '');
      data.append('page', page.toString());

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: data.toString()
        });
        
        const html = await res.text();
        
        // Match table rows starting with numbers (to avoid headers)
        const rowRegex = /<tr>\s*<td>(\d{6,})<\/td>\s*<td>(.*?)<\/td>\s*<td>(.*?)<\/td>\s*<td>(.*?)<\/td>\s*<td>(.*?)<\/td>[\s\S]*?<\/tr>/g;
        let match;
        let foundAny = false;

        while ((match = rowRegex.exec(html)) !== null) {
          foundAny = true;
          const schoolId = match[1].trim();
          // Remove any embedded HTML like links in the name if they exist
          const schoolName = match[2].replace(/<[^>]*>?/gm, '').trim();
          const head = match[3].replace(/<[^>]*>?/gm, '').trim();
          const address = match[4].replace(/<[^>]*>?/gm, '').trim();
          const schoolType = match[5].replace(/<[^>]*>?/gm, '').trim();

          allSchools.push({ schoolId, schoolName, head, address, schoolType });
        }

        if (!foundAny || !html.includes(`page=${page + 1}`)) {
          keepGoing = false;
        } else {
          page++;
        }
      } catch (err) {
        console.error('Error fetching:', err);
        keepGoing = false;
      }
    }
  }

  // Remove duplicates just in case
  const uniqueSchools = Array.from(new Map(allSchools.map(item => [item.schoolId, item])).values());

  fs.writeFileSync('scratch/region4a_shs_masterlist.json', JSON.stringify(uniqueSchools, null, 2));
  console.log(`Successfully extracted ${uniqueSchools.length} unique schools to scratch/region4a_shs_masterlist.json`);
}

scrape();
