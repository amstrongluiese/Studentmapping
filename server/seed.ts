import { getDb } from "./db";
import { departments, programs } from "@shared/schema";
import { PROGRAM_MAP } from "@shared/programRecognition";

export async function seedPrograms() {
  const db = getDb();
  // Check if departments exist
  const existingDepts = await db.select().from(departments).limit(1);
  if (existingDepts.length === 0) {
    console.log("Seeding departments and programs...");
    const depts = new Map<string, { name: string, color: string }>();
    Object.values(PROGRAM_MAP).forEach(prog => {
      if (!depts.has(prog.department)) {
        depts.set(prog.department, { name: prog.departmentName, color: prog.color });
      }
    });

    const deptIdMap = new Map<string, number>();
    for (const [code, info] of Array.from(depts.entries())) {
      const inserted = await db.insert(departments).values({
        code,
        name: info.name,
        color: info.color,
        targetValue: 0
      }).returning();
      deptIdMap.set(code, inserted[0].id);
    }

    const progsToInsert = Object.values(PROGRAM_MAP).map(prog => ({
      departmentId: deptIdMap.get(prog.department)!,
      code: prog.code,
      name: prog.program,
      track: prog.track || "General",
      level: prog.level || "Bachelor",
      color: prog.color,
      targetValue: 0
    }));
    
    for (const p of progsToInsert) {
      await db.insert(programs).values(p);
    }
    console.log("Seeding complete.");
  }
}
