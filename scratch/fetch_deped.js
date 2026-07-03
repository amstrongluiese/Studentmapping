import * as fs from 'fs';

async function testFetch() {
  const url = 'https://ebeis.deped.gov.ph/beis/reports_info/viewMasterList';
  const data = new URLSearchParams();
  data.append('school[id]', '');
  data.append('school[school_name]', '');
  data.append('school[co_gen_class]', '');
  data.append('school[general_classification_id]', '');
  data.append('school[curricular_class_id]', '921'); // Grade 11-12
  data.append('school[region_id]', '4'); // Region IV-A
  data.append('school[user_id]', '');
  data.append('school[school_head]', '');
  
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
    fs.writeFileSync('scratch/deped_test.html', html);
    console.log('Saved to scratch/deped_test.html. Length:', html.length);
  } catch (err) {
    console.error('Error:', err);
  }
}

testFetch();
