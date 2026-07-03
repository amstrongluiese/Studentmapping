import * as fs from 'fs';

async function fetchDivisions() {
  const url = 'https://ebeis.deped.gov.ph/beis/reports_info/ajxdivision';
  const data = new URLSearchParams();
  data.append('id', '4');

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: data.toString()
    });
    
    const html = await res.text();
    console.log(html);
  } catch (err) {
    console.error('Error:', err);
  }
}

fetchDivisions();
