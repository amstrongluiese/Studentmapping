import { config } from 'dotenv';
config();
import { getDb, getPool } from '../server/db.js';
import { schoolRegistry, schoolAliases } from '../shared/schema.js';
import { normalizeSchoolName } from '../shared/schoolRegistry.js';
import { eq } from 'drizzle-orm';

function fixMojibake(text: string | null): string | null {
  if (!text) return text;
  return text
    .replace(/Ã±/g, 'ñ')
    .replace(/Ã‘/g, 'Ñ')
    .replace(/â€“/g, '-')
    .replace(/Ã©/g, 'é')
    .replace(/Ã /g, 'á')
    .replace(/Ã /g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ãº/g, 'ú');
}

async function run() {
  console.log("Starting DB re-normalization...");
  const db = getDb();

  // 1. Fix School Registry
  const schools = await db.select().from(schoolRegistry);
  let updatedSchools = 0;
  for (const school of schools) {
    const fixedName = fixMojibake(school.schoolName) || school.schoolName;
    const fixedMuni = fixMojibake(school.municipality) || school.municipality;
    const newNormalized = normalizeSchoolName(fixedName);

    if (fixedName !== school.schoolName || fixedMuni !== school.municipality || newNormalized !== school.normalizedSchoolName) {
      await db.update(schoolRegistry)
        .set({
          schoolName: fixedName,
          municipality: fixedMuni,
          normalizedSchoolName: newNormalized
        })
        .where(eq(schoolRegistry.id, school.id));
      updatedSchools++;
      console.log(`Updated School: ${school.schoolName} -> ${fixedName} (Normalized: ${newNormalized})`);
    }
  }

  // 2. Fix Aliases
  const aliases = await db.select().from(schoolAliases);
  let updatedAliases = 0;
  for (const alias of aliases) {
    const fixedAliasName = fixMojibake(alias.aliasName) || alias.aliasName;
    const newNormalizedAlias = normalizeSchoolName(fixedAliasName);

    if (fixedAliasName !== alias.aliasName || newNormalizedAlias !== alias.normalizedAlias) {
      await db.update(schoolAliases)
        .set({
          aliasName: fixedAliasName,
          normalizedAlias: newNormalizedAlias
        })
        .where(eq(schoolAliases.id, alias.id));
      updatedAliases++;
      console.log(`Updated Alias: ${alias.aliasName} -> ${fixedAliasName} (Normalized: ${newNormalizedAlias})`);
    }
  }

  console.log(`Re-normalization complete! Updated ${updatedSchools} schools and ${updatedAliases} aliases.`);
  getPool().end();
}

run().catch(console.error);
