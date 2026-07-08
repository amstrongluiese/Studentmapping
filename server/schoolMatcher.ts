import Fuse from "fuse.js";
import { normalizeSchoolName } from "@shared/schoolRegistry";
import { type SchoolRegistry, type SchoolAlias, schoolAliases, schoolMatchHistory } from "@shared/schema";
import { getDb } from "./db";
import { sql, eq } from "drizzle-orm";
import * as turf from "@turf/turf";

export type MatchResult = {
  status: "matched" | "unmatched" | "suggested";
  school: SchoolRegistry | null;
  suggestions?: SchoolRegistry[];
  matchType?: "exact" | "alias" | "normalized" | "historical" | "address" | "municipality" | "province" | "program" | "fuzzy" | "acronym";
  confidence?: number;
};

export class SchoolMatchingEngine {
  private registry: SchoolRegistry[];
  private exactMap: Map<string, SchoolRegistry>;
  private normalizedMap: Map<string, SchoolRegistry>;
  private aliasMap: Map<string, SchoolRegistry>;
  private acronymMap: Map<string, SchoolRegistry[]>;
  private fuse: Fuse<SchoolRegistry>;
  private aliases: SchoolAlias[];

  constructor(schools: SchoolRegistry[], aliases: SchoolAlias[]) {
    this.registry = schools;
    this.aliases = aliases;
    this.exactMap = new Map();
    this.normalizedMap = new Map();
    this.aliasMap = new Map();
    this.acronymMap = new Map();

    for (const school of schools) {
      this.exactMap.set(school.schoolName.toLowerCase(), school);
      this.normalizedMap.set(normalizeSchoolName(school.normalizedSchoolName || school.schoolName), school);
      
      const acronyms = this.getAcronyms(school.schoolName, school.municipality);
      for (const acronym of acronyms) {
        if (!this.acronymMap.has(acronym)) {
          this.acronymMap.set(acronym, []);
        }
        // Avoid duplicate school entries for the same acronym
        if (!this.acronymMap.get(acronym)!.some(s => s.id === school.id)) {
          this.acronymMap.get(acronym)!.push(school);
        }
      }
    }

    for (const alias of aliases) {
      const school = this.exactMap.get(alias.schoolRegistryId.toString()) || schools.find(s => s.id === alias.schoolRegistryId);
      if (school) {
        this.aliasMap.set(alias.normalizedAlias, school);
      }
    }

    this.fuse = new Fuse(schools, {
      keys: [
        { name: "schoolName", weight: 0.75 },
        { name: "normalizedSchoolName", weight: 0.2 },
      ],
      threshold: 0.4,
      includeScore: true,
      minMatchCharLength: 3,
    });
  }

  private getAcronyms(name: string, municipality?: string | null): string[] {
    const cleanName = name.replace(/\([^)]*\)/g, '').trim();
    const words = cleanName.split(/[\s-]+/);
    const getAcr = (wordList: string[]) => wordList.map(w => w.match(/^[A-Za-z]/) ? w.match(/^[A-Za-z]/)![0].toUpperCase() : '').join('');

    const fullAcronym = getAcr(words);
    
    const noBranchWords = words.filter(w => {
      const lower = w.toLowerCase();
      if (municipality && lower === municipality.toLowerCase()) return false;
      if (['campus', 'branch'].includes(lower)) return false;
      return true;
    });
    const noBranchAcronym = getAcr(noBranchWords);

    return Array.from(new Set([fullAcronym, noBranchAcronym])).filter(a => a.length > 1);
  }

  public async matchAsync(rawName: string, metadata?: { address?: string; municipality?: string; province?: string; program?: string }): Promise<MatchResult> {
    if (!rawName) return { status: "unmatched", school: null };

    // 1. Exact Match (100%)
    const exact = this.exactMap.get(rawName.toLowerCase());
    if (exact) return { status: "matched", school: exact, matchType: "exact", confidence: 100 };

    const normalized = normalizeSchoolName(rawName);

    // 2. Alias Match (95%)
    const alias = this.aliasMap.get(normalized);
    if (alias) return { status: "matched", school: alias, matchType: "alias", confidence: 95 };

    // 3. Normalized Match (95%)
    const normMatch = this.normalizedMap.get(normalized);
    if (normMatch) return { status: "matched", school: normMatch, matchType: "normalized", confidence: 95 };

    // 4. Acronym Match (70-90%)
    // Allow inputs like "CGC Binan" or "CGC - Binan"
    const parts = rawName.split(/[\s-]+/);
    const potentialAcronym = parts[0].toUpperCase().replace(/[^A-Z]/g, '');
    const potentialBranch = parts.slice(1).join(' ').trim().toLowerCase();

    // Also consider the entire string as a potential acronym
    const fullAcronym = rawName.toUpperCase().replace(/[^A-Z]/g, '');
    
    // We only try acronym matching if the potential acronym or full acronym looks like one (2-10 chars)
    const validPotentialAcronym = potentialAcronym.length >= 2 && potentialAcronym.length <= 10;
    const validFullAcronym = fullAcronym.length >= 2 && fullAcronym.length <= 10 && rawName.length <= 15;

    if (validPotentialAcronym || validFullAcronym) {
      let matchedSchools: SchoolRegistry[] = [];
      let usedBranch = false;
      
      if (validPotentialAcronym) {
        const matches = this.acronymMap.get(potentialAcronym) || [];
        // If there's a branch part, prioritize schools that match the branch
        if (potentialBranch && matches.length > 0) {
           const branchMatches = matches.filter(s => {
             const muni = s.municipality?.toLowerCase() || "";
             const name = s.schoolName.toLowerCase();
             return (muni && (muni.includes(potentialBranch) || potentialBranch.includes(muni))) || name.includes(potentialBranch);
           });
           if (branchMatches.length > 0) {
             matchedSchools = branchMatches;
             usedBranch = true;
           } else {
             // We had a branch but it didn't match. We can still consider the acronym matches.
             matchedSchools = matches;
           }
        } else if (matches.length > 0) {
           matchedSchools = matches;
        }
      }
      
      if (matchedSchools.length === 0 && validFullAcronym) {
        matchedSchools = this.acronymMap.get(fullAcronym) || [];
        usedBranch = false;
      }
      
      // If we didn't match the branch but the user provided a long branch name, this is likely a false positive acronym match
      if (matchedSchools.length > 0 && !usedBranch && potentialBranch && potentialBranch.length > 5 && !validFullAcronym) {
        matchedSchools = [];
      }

      if (matchedSchools.length > 0) {
        let confidence = usedBranch ? 90 : 85;
        let matchedSchool = matchedSchools[0];
        
        if (matchedSchools.length > 1) {
           confidence = 70; // lower confidence for collision
           
           if (metadata?.municipality) {
             const byMuni = matchedSchools.filter(s => s.municipality?.toLowerCase() === metadata.municipality?.toLowerCase());
             if (byMuni.length === 1) {
               matchedSchool = byMuni[0];
               confidence = usedBranch ? 90 : 85; // restored confidence
             } else if (byMuni.length > 1) {
                return { status: "suggested", school: null, suggestions: byMuni, confidence };
             } else {
               return { status: "suggested", school: null, suggestions: matchedSchools, confidence };
             }
           } else {
             return { status: "suggested", school: null, suggestions: matchedSchools, confidence };
           }
        }
        
        return { status: "matched", school: matchedSchool, matchType: "acronym", confidence };
      }
    }

    // 7. Historical Match (40% - boosted if multiple occurrences)
    const db = getDb();
    const historyResult = await db.select().from(schoolMatchHistory).where(eq(schoolMatchHistory.importedName, rawName)).limit(1);
    if (historyResult.length > 0 && historyResult[0].officialSchoolId) {
      const histSchool = this.registry.find(s => s.id === historyResult[0].officialSchoolId);
      if (histSchool) {
        const confidence = Math.min(40 + (historyResult[0].occurrences * 5), 85);
        return { status: "matched", school: histSchool, matchType: "historical", confidence };
      }
    }

    // 9. Fuzzy Match & Database pg_trgm (30%)
    // Try both raw name and normalized name for similarity
    const trgmRes = await db.execute(sql`
      SELECT id, 
             GREATEST(similarity(school_name, ${rawName}), similarity(normalized_school_name, ${normalized})) as sim 
      FROM school_registry 
      WHERE is_active = true 
        AND (similarity(school_name, ${rawName}) > 0.3 OR similarity(normalized_school_name, ${normalized}) > 0.3)
      ORDER BY sim DESC LIMIT 1
    `);
    
    let dbTopSim = 0;
    let dbTopSchool: SchoolRegistry | null = null;
    
    // Drizzle raw execute in Postgres returns { rows: any[] }
    const trgmRows = (trgmRes as any).rows || trgmRes;
    if (Array.isArray(trgmRows) && trgmRows.length > 0) {
      dbTopSim = Number((trgmRows[0] as any).sim);
      dbTopSchool = this.registry.find(s => s.id === (trgmRows[0] as any).id) || null;
    }

    // Compare with fuse.js memory search
    const fuzzyResults = this.fuse.search(rawName);
    let fuseTopSim = 0;
    let fuseTopSchool: SchoolRegistry | null = null;

    if (fuzzyResults.length > 0) {
      fuseTopSim = 1 - (fuzzyResults[0].score ?? 1);
      fuseTopSchool = fuzzyResults[0].item;
    }

    const bestSim = Math.max(dbTopSim, fuseTopSim);
    const bestSchool = (bestSim === dbTopSim && dbTopSchool) ? dbTopSchool : fuseTopSchool;
    
    // We lower the threshold slightly to 0.75 because real-world messy data rarely hits 0.8 perfectly without exact substring match
    if (bestSchool && bestSim >= 0.75) {
      // Highly confident fuzzy match
      const confidence = Math.round(bestSim * 100);
      return { status: "matched", school: bestSchool, matchType: "fuzzy", confidence };
    }

    // Fallback: Geospatial & Metadata matching
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
      // Combine suggestions from both pg_trgm and fuse
      const pgSuggestions = trgmRows.map((r: any) => this.registry.find(s => s.id === r.id)).filter(Boolean) as SchoolRegistry[];
      const fuseSuggestions = fuzzyResults.slice(0, 3).map(r => r.item);
      const suggestions = Array.from(new Set([...pgSuggestions, ...fuseSuggestions])).slice(0, 3);
      
      // Address Resolution
      if (addressStr && suggestions.length > 1) {
        const resolved = suggestions.filter(s => {
          const muni = s.municipality?.toLowerCase();
          if (muni && addressStr.includes(muni)) return true;
          const nameLower = s.schoolName.toLowerCase();
          if (nameLower.split(/[-,\s]+/).some(word => word.length > 3 && addressStr.includes(word) && !rawName.toLowerCase().includes(word))) return true;
          return false;
        });

        if (resolved.length === 1) {
          return { status: "matched", school: resolved[0], matchType: "address", confidence: 95 };
        }
      }

      return { status: "suggested", school: null, suggestions, confidence: Math.round(fuseTopSim * 100) };
    }

    // 11. Unmatched
    return { status: "unmatched", school: null };
  }

  // Legacy synchronous wrapper for existing code, degrades pg_trgm to just fuse.js
  public match(rawName: string): MatchResult {
    // 1. Exact Match
    const exact = this.exactMap.get(rawName.toLowerCase());
    if (exact) return { status: "matched", school: exact, matchType: "exact", confidence: 100 };

    const normalized = normalizeSchoolName(rawName);

    // 2. Alias Match
    const alias = this.aliasMap.get(normalized);
    if (alias) return { status: "matched", school: alias, matchType: "alias", confidence: 95 };

    // 3. Normalized Match
    const normMatch = this.normalizedMap.get(normalized);
    if (normMatch) return { status: "matched", school: normMatch, matchType: "normalized", confidence: 95 };

    // 4. Acronym Match (70-90%)
    const parts = rawName.split(/[\s-]+/);
    const potentialAcronym = parts[0].toUpperCase().replace(/[^A-Z]/g, '');
    const potentialBranch = parts.slice(1).join(' ').trim().toLowerCase();
    const fullAcronym = rawName.toUpperCase().replace(/[^A-Z]/g, '');

    const validPotentialAcronym = potentialAcronym.length >= 2 && potentialAcronym.length <= 10;
    const validFullAcronym = fullAcronym.length >= 2 && fullAcronym.length <= 10 && rawName.length <= 15;

    if (validPotentialAcronym || validFullAcronym) {
      let matchedSchools: SchoolRegistry[] = [];
      let usedBranch = false;
      
      if (validPotentialAcronym) {
        const matches = this.acronymMap.get(potentialAcronym) || [];
        if (potentialBranch && matches.length > 0) {
           const branchMatches = matches.filter(s => {
             const muni = s.municipality?.toLowerCase() || "";
             const name = s.schoolName.toLowerCase();
             return (muni && (muni.includes(potentialBranch) || potentialBranch.includes(muni))) || name.includes(potentialBranch);
           });
           if (branchMatches.length > 0) {
             matchedSchools = branchMatches;
             usedBranch = true;
           } else {
             matchedSchools = matches;
           }
        } else if (matches.length > 0) {
           matchedSchools = matches;
        }
      }
      
      if (matchedSchools.length === 0 && validFullAcronym) {
        matchedSchools = this.acronymMap.get(fullAcronym) || [];
      }

      if (matchedSchools.length > 0) {
        if (matchedSchools.length === 1) {
          return { status: "matched", school: matchedSchools[0], matchType: "acronym", confidence: usedBranch ? 90 : 85 };
        } else {
          return { status: "suggested", school: null, suggestions: matchedSchools, confidence: 70 };
        }
      }
    }

    // 4. Fuzzy Match (> 90%)
    const fuzzyResults = this.fuse.search(rawName);
    if (fuzzyResults.length > 0) {
      const top = fuzzyResults[0];
      const confidence = Math.round((1 - (top.score ?? 1)) * 100);
      
      if (confidence >= 80) {
        return { status: "matched", school: top.item, matchType: "fuzzy", confidence };
      }
    }
    
    if (fuzzyResults.length > 0) {
      const suggestions = fuzzyResults.slice(0, 3).map(r => r.item);
      return { status: "suggested", school: null, suggestions };
    }

    return { status: "unmatched", school: null };
  }
}

