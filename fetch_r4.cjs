const fs = require('fs');

async function run() {
  const toTitleCase = str => str.toLowerCase().replace(/\b\w/g, s => s.toUpperCase());
  const tree = {};
  
  console.log("Fetching provinces...");
  const provs = await fetch('https://psgc.gitlab.io/api/regions/040000000/provinces').then(r => r.json());
  
  for (const p of provs) {
    const pName = toTitleCase(p.name);
    tree[pName] = {};
    console.log(`Fetching municipalities and cities for ${pName}...`);
    
    const muns = await fetch(`https://psgc.gitlab.io/api/provinces/${p.code}/municipalities`).then(r => r.json());
    const cities = await fetch(`https://psgc.gitlab.io/api/provinces/${p.code}/cities`).then(r => r.json());
    const all = [...muns, ...cities];
    
    for (const m of all) {
      const mName = toTitleCase(m.name);
      const brgys = await fetch(`https://psgc.gitlab.io/api/cities-municipalities/${m.code}/barangays`).then(r => r.json());
      tree[pName][mName] = brgys.map(b => toTitleCase(b.name)).sort();
    }
  }
  
  fs.writeFileSync('shared/region4a.ts', 'export const REGION_4A_DATA: Record<string, Record<string, string[]>> = ' + JSON.stringify(tree, null, 2) + ';');
  console.log('Done!');
}
run();
