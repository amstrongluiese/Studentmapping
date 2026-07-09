import * as fs from 'fs';

let content = fs.readFileSync('server/schoolMatcher.ts', 'utf8');

// Fix 1: Remove allSchoolInInput
content = content.replace(
  `        let allSchoolInInput = Array.from(schoolTokens).every((t: unknown) => inputTokens.includes(t as string));\n        if (allInputInSchool || allSchoolInInput) {`,
  `        if (allInputInSchool) {`
);

// Fix 2: Better Geospatial & Metadata matching
content = content.replace(
  `    // Fallback: Geospatial & Metadata matching
    if (metadata && metadata.municipality) {
      // 5. Municipality Match Filter (Boost 20%)
      const muniSchools = this.registry.filter(s => 
        s.municipality?.toLowerCase() === metadata.municipality?.toLowerCase()
      );
      if (muniSchools.length > 0 && bestSchool && muniSchools.some(s => s.id === bestSchool.id) && bestSim > 0.6) {
         return { status: "matched", school: bestSchool, matchType: "municipality", confidence: Math.round((bestSim + 0.2) * 100) };
      }
    }

    // AI Suggestions (Top 3 fuzzy if below threshold)
    if (fuzzyResults.length > 0) {
      const suggestions = fuzzyResults.slice(0, 3).map(r => r.item);
      return { status: "suggested", school: null, suggestions, confidence: Math.round(fuseTopSim * 100) };
    }`,
  `    // Fallback: Geospatial & Metadata matching
    const addressStr = [metadata?.address, metadata?.municipality].filter(Boolean).join(" ").toLowerCase();

    if (addressStr) {
      // 5. Municipality Match Filter (Boost 20%)
      const muniSchools = this.registry.filter(s => 
        s.municipality && addressStr.includes(s.municipality.toLowerCase())
      );
      if (muniSchools.length > 0 && bestSchool && muniSchools.some(s => s.id === bestSchool.id) && bestSim > 0.6) {
         return { status: "matched", school: bestSchool, matchType: "municipality", confidence: Math.round((bestSim + 0.2) * 100) };
      }
    }

    // AI Suggestions (Top 3 fuzzy if below threshold)
    if (fuzzyResults.length > 0) {
      const suggestions = fuzzyResults.slice(0, 3).map(r => r.item);
      
      // Address Resolution
      if (addressStr && suggestions.length > 1) {
        const resolved = suggestions.filter(s => {
          const muni = s.municipality?.toLowerCase();
          if (muni && addressStr.includes(muni)) return true;
          const nameLower = s.schoolName.toLowerCase();
          if (nameLower.split(/[-,\\s]+/).some(word => word.length > 3 && addressStr.includes(word) && !rawName.toLowerCase().includes(word))) return true;
          return false;
        });

        if (resolved.length === 1) {
          return { status: "matched", school: resolved[0], matchType: "address", confidence: 95 };
        }
      }

      return { status: "suggested", school: null, suggestions, confidence: Math.round(fuseTopSim * 100) };
    }`
);

fs.writeFileSync('server/schoolMatcher.ts', content, 'utf8');
console.log("Patched schoolMatcher.ts");
