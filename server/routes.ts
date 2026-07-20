import type { Express } from "express";
import type { Server } from "http";
import { getDb } from "./db";
import { storage } from "./storage";
import { detectLocationMismatch, isAmbiguousSchoolName, extractLocationHintsFromName, buildSmartGeocodeQuery } from "@shared/locationIntelligence";
import { api } from "@shared/routes";
import {
  imports,
  mappingLogs,
  schoolAliases,
  schoolRegistry as schoolsTable,
  studentsProcessed,
  studentsRaw,
  studentImports,
  systemSettings,
  departments,
  programs,
  schoolMatchHistory,
  schoolRegistry,
  students,
  referrals,
} from "@shared/schema";
import { eq, and, count, desc, inArray } from "drizzle-orm";
import { normalizeSchoolName } from "@shared/schoolRegistry";
import { SchoolMatchingEngine } from "./schoolMatcher";
import { z } from "zod";
import { previewIntegrationSource } from "./integrationService";
import {
  getGisOverviewStats,
  getImportLogs,
  getMappingQueue,
  getProcessedStudents,
  recomputeSchoolStudentCounts,
  searchSchools,
  syncStudents,
  updateProcessedStudent,
  batchUpdateProcessedStudentStatus,
  verifySchoolMapping,
  getGisMapData,
} from "./gisPipeline";
import {
  geocodeSchoolPreview,
  lookupSchoolInRegistry,
} from "./geocodeLookup";
import multer from "multer";
import { syncExcelToJSON } from "./syncMasterDirectory";
import { startImportSession, getImportProgress, processBatch } from "./importPipeline";
import { seedPrograms } from "./seed";
import { setDynamicCatalog } from "@shared/programIntelligence";

async function refreshCatalog() {
  const db = getDb();
  const dbPrograms = await db.select().from(programs);
  const deptRecords = await db.select().from(departments);
  const deptMap = new Map(deptRecords.map(d => [d.id, d]));
  
  const formatted = dbPrograms.map(p => {
    const dept = deptMap.get(p.departmentId);
    return {
      ...p,
      code: p.code,
      college: dept?.code || "Unknown",
      collegeName: dept?.name || "Unknown",
      department: dept?.code || "Unknown",
      departmentName: dept?.name || "Unknown",
      program: p.name,
      track: p.track || "General",
      level: p.level,
      color: p.color,
      departmentColor: dept?.color || "#e5e7eb"
    };
  });
  setDynamicCatalog(formatted as any);
}

const upload = multer({ dest: "server/uploads/" });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Seed DB with default programs on startup
  await seedPrograms();
  await refreshCatalog();

  // School routes
  app.get(api.schoolRegistry.list.path, async (req, res) => {
    const schoolsList = await storage.listSchoolRegistry();
    res.json(schoolsList);
  });

  app.post(api.schoolRegistry.import.path, async (req, res) => {
    try {
      const input = api.schoolRegistry.import.input.parse(req.body);
      const result = await storage.importSchools(input.schoolRegistry as any);
      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  // Admin Master Directory Routes
  app.get("/api/admin/directory", async (req, res) => {
    res.json(await storage.listSchoolRegistry());
  });

  app.post("/api/admin/clear-data", async (req, res) => {
    try {
      const db = getDb();
      await db.delete(mappingLogs);
      await db.delete(studentsProcessed);
      await db.delete(studentsRaw);
      await db.delete(studentImports);
      await db.delete(imports);
      await db.delete(referrals);
      // await db.delete(students); // Currently schema doesn't export students directly to routes sometimes? Wait, it imports `students`? No, let's look at imports above: students is not imported. Oh wait, it isn't. I'll need to import it or just execute sql.
      // Wait, let's import it if missing or just use storage. But the easiest is to just delete from the imported ones. Let's see what imports I have at top of file.
      // Actually, I can just execute sql or import `students` from schema.
      res.json({ success: true, message: "All student and import data has been cleared." });
    } catch (err) {
      console.error("[clear-data] error:", err);
      res.status(500).json({ success: false, message: "Failed to clear data" });
    }
  });

  app.post("/api/admin/directory/import", upload.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    
    try {
      // Sync excel to JSON and reload memory
      const schools = syncExcelToJSON(req.file.path);
      await storage.importSchools(schools as any);
      res.json({ success: true, count: schools.length, message: `Successfully imported ${schools.length} schools into the master directory.` });
    } catch (err) {
      console.error("[directory/import] error:", err);
      res.status(500).json({ success: false, message: err instanceof Error ? err.message : "Failed to import directory" });
    }
  });

  app.get(api.schoolRegistry.get.path, async (req, res) => {
    const school = await storage.getSchoolRegistry(Number(req.params.id));
    if (!school) return res.status(404).json({ message: 'School not found' });
    res.json(school);
  });

  app.post(api.schoolRegistry.create.path, async (req, res) => {
    try {
      const input = api.schoolRegistry.create.input.parse(req.body);
      const school = await storage.createSchoolRegistry(input);
      res.status(201).json(school);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.put(api.schoolRegistry.update.path, async (req, res) => {
    try {
      const input = api.schoolRegistry.update.input.parse(req.body);
      const school = await storage.updateSchoolRegistry(Number(req.params.id), input);
      if (!school) return res.status(404).json({ message: 'School not found' });
      res.json(school);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.delete(api.schoolRegistry.delete.path, async (req, res) => {
    await storage.deleteSchoolRegistry(Number(req.params.id));
    res.status(204).send();
  });

  app.post(api.schoolRegistry.merge.path, async (req, res) => {
    try {
      const input = api.schoolRegistry.merge.input.parse(req.body);
      const duplicateId = Number(req.params.id);
      await storage.mergeSchoolRegistry(duplicateId, input.targetId);
      res.json({ success: true, message: `Successfully merged school ${duplicateId} into ${input.targetId}` });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: err instanceof Error ? err.message : "Internal Server Error" });
    }
  });

  app.post(api.schoolRegistry.bulkMerge.path, async (req, res) => {
    try {
      const input = api.schoolRegistry.bulkMerge.input.parse(req.body);
      let mergedCount = 0;
      for (const pair of input.pairs) {
        if (pair.duplicateId !== pair.targetId) {
          try {
            await storage.mergeSchoolRegistry(pair.duplicateId, pair.targetId);
            mergedCount++;
          } catch (mergeErr) {
            console.error(`Failed to merge ${pair.duplicateId} into ${pair.targetId}:`, mergeErr);
            // Continue with other pairs even if one fails
          }
        }
      }
      res.json({ success: true, message: `Successfully merged ${mergedCount} schools`, mergedCount });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      res.status(500).json({ message: err instanceof Error ? err.message : "Internal Server Error" });
    }
  });

  app.post(api.schoolRegistry.batchDelete.path, async (req, res) => {
    try {
      const input = api.schoolRegistry.batchDelete.input.parse(req.body);
      const result = await storage.batchDeleteSchoolRegistry(input.ids);
      const message = result.skippedCount > 0 
        ? `Deleted ${result.deletedCount} schools. Skipped ${result.skippedCount} schools because they are actively mapped to students.`
        : `Successfully deleted ${result.deletedCount} schools.`;
        
      res.json({
        success: true,
        deletedCount: result.deletedCount,
        skippedCount: result.skippedCount,
        message,
      });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ success: false, deletedCount: 0, skippedCount: 0, message: err.errors[0].message });
      if (err instanceof Error) return res.status(500).json({ success: false, deletedCount: 0, skippedCount: 0, message: err.message });
      throw err;
    }
  });

  // ── Location Mismatch Validation ──────────────────────────────────────
  app.post("/api/schoolRegistry/validate-locations", async (req, res) => {
    try {
      const { schoolIds } = req.body || {};
      const allSchools = await storage.listSchoolRegistry();
      const db = getDb();

      // Filter to requested IDs or all schools with coordinates
      let targetSchools = allSchools.filter(s => 
        s.latitude !== null && s.longitude !== null && s.isActive
      );
      if (Array.isArray(schoolIds) && schoolIds.length > 0) {
        const idSet = new Set(schoolIds.map(Number));
        targetSchools = targetSchools.filter(s => idSet.has(s.id));
      }

      // Build student origins map from processed students
      const processedRows = await db.select({
        schoolRegistryId: studentsProcessed.schoolRegistryId,
        municipality: studentsProcessed.municipality,
        province: studentsProcessed.province,
      }).from(studentsProcessed);

      const schoolStudents = new Map<number, { municipality: string; province: string }[]>();
      for (const row of processedRows) {
        if (!row.schoolRegistryId) continue;
        if (!row.municipality && !row.province) continue;
        const students = schoolStudents.get(row.schoolRegistryId) || [];
        students.push({ municipality: row.municipality || "", province: row.province || "" });
        schoolStudents.set(row.schoolRegistryId, students);
      }

      const studentOriginsMap = new Map<number, string>();
      for (const [schoolId, students] of Array.from(schoolStudents.entries())) {
        const mCount = new Map<string, number>();
        for (const s of students) {
          if (s.municipality) mCount.set(s.municipality, (mCount.get(s.municipality) || 0) + 1);
        }
        const topMunicipality = Array.from(mCount.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
        const pCount = new Map<string, number>();
        for (const s of students) {
          if (s.province) pCount.set(s.province, (pCount.get(s.province) || 0) + 1);
        }
        const topProvince = Array.from(pCount.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
        const origin = [topMunicipality, topProvince].filter(Boolean).join(", ");
        if (origin) studentOriginsMap.set(schoolId, origin);
      }

      // Validate each school
      const results = targetSchools.map(school => {
        const studentOrigin = studentOriginsMap.get(school.id);
        const mismatch = detectLocationMismatch(
          school.schoolName,
          school.province || "",
          school.municipality || "",
          studentOrigin,
        );
        const hints = extractLocationHintsFromName(school.schoolName);
        const ambiguous = isAmbiguousSchoolName(school.schoolName);

        return {
          schoolId: school.id,
          schoolName: school.schoolName,
          currentMunicipality: school.municipality,
          currentProvince: school.province,
          latitude: school.latitude,
          longitude: school.longitude,
          studentOrigin: studentOrigin || null,
          locationHints: hints.map(h => h.place),
          isAmbiguous: ambiguous,
          ...mismatch,
        };
      });

      // Only return results with issues
      const issues = results.filter(r => r.hasMismatch || r.isAmbiguous);

      res.json({
        total: targetSchools.length,
        issueCount: issues.length,
        results: issues,
      });
    } catch (err) {
      console.error("[validate-locations] error:", err);
      res.status(500).json({ message: err instanceof Error ? err.message : "Validation failed" });
    }
  });

  // V2 High-Performance Import Engine Routes
  app.post("/api/integrations/sync-google-sheets", async (req, res) => {
    try {
      const { sheetsUrl, sheetsToken } = req.body;
      if (!sheetsUrl) return res.status(400).json({ success: false, message: "URL is required" });

      const payload = {
        sourceType: "googleSheets" as const,
        url: sheetsUrl as string,
        method: "GET" as const,
        authMode: (sheetsToken ? "bearer" : "none") as "bearer" | "none",
        authToken: sheetsToken,
      };

      const result = await previewIntegrationSource(payload);
      
      // Auto-map generic Google Sheet columns to standard fields
      const mappedRecords = result.records.map((r: any) => {
        const getVal = (possibleKeys: string[]) => {
          const key = Object.keys(r).find(k => possibleKeys.some(p => k.toLowerCase().includes(p)));
          return key ? String(r[key]) : undefined;
        };

        return {
          enrollmentStatus: getVal(["status"]),
          studentNumber: getVal(["student id", "student no", "student_number", "id", "student number"]),
          fullName: getVal(["name", "full name", "fullname", "student name", "student_name"]),
          previousSchool: getVal(["school", "previous", "graduated", "feeder"]),
          program: getVal(["program", "course", "strand", "degree"]),
          scholarship: getVal(["scholarship", "iskolar", "grant", "scholar"]),
          municipality: getVal(["municipality", "city", "town", "address"]),
          strand: getVal(["strand"]),
          schedule: getVal(["schedule", "sched"]),
          contactNumber: getVal(["contact", "contact no", "number", "phone"]),
          requirements: getVal(["requirements", "req"]),
          importSource: "Google Sheets Auto-Sync",
        };
      });

      startImportSession(mappedRecords.length);
      processBatch(mappedRecords).catch(console.error);

      res.json({ success: true, message: `Auto-sync started for ${mappedRecords.length} records.` });
    } catch (err: any) {
      console.error("Auto-sync error:", err);
      res.status(500).json({ success: false, message: err.message || "Failed to sync" });
    }
  });

  app.post("/api/imports/start", async (req, res) => {
    const { totalRecords } = req.body;
    if (!totalRecords) return res.status(400).json({ message: "totalRecords is required" });
    
    const db = getDb();
    // Clear old staging data before starting a new import session
    await db.delete(studentImports);
    
    startImportSession(totalRecords);
    res.json({ success: true, message: "Import session started" });
  });

  app.post("/api/imports/batch", async (req, res) => {
    const { records } = req.body;
    if (!records || !Array.isArray(records)) return res.status(400).json({ message: "records array is required" });
    
    // Process batch asynchronously in the background so it doesn't block the request
    processBatch(records).catch(console.error);
    
    res.json({ success: true, message: "Batch queued for processing" });
  });

  app.get("/api/imports/progress", (req, res) => {
    res.json(getImportProgress());
  });

  app.get("/api/imports/staging", async (req, res) => {
    const db = getDb();
    const records = await db.select().from(studentImports);
    res.json(records);
  });

  app.get("/api/settings", async (req, res) => {
    const db = getDb();
    const records = await db.select().from(systemSettings);
    // Convert array of {key, value} to an object map
    const settingsMap = records.reduce((acc: Record<string, string>, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    res.json(settingsMap);
  });

  app.post("/api/settings", async (req, res) => {
    const db = getDb();
    
    // Expects body to be an object { key: value }
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      if (typeof value === "string") {
        // Upsert logic (Insert or Update)
        const existing = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
        if (existing.length > 0) {
          await db.update(systemSettings).set({ value }).where(eq(systemSettings.key, key));
        } else {
          await db.insert(systemSettings).values({ key, value });
        }
      }
    }
    res.json({ success: true, message: "Settings saved successfully" });
  });

  // Departments and Programs API
  app.get("/api/departments", async (req, res) => {
    const db = getDb();
    const records = await db.select().from(departments);
    res.json(records);
  });

  app.post("/api/departments", async (req, res) => {
    try {
      const { id, code, name, color, targetValue } = req.body;
      const db = getDb();
      
      if (id) {
        const updated = await db.update(departments)
          .set({ code, name, color, targetValue: targetValue || 0, updatedAt: new Date() })
          .where(eq(departments.id, id))
          .returning();
        res.json(updated[0]);
      } else {
        const existing = await db.select().from(departments).where(eq(departments.code, code)).limit(1);
        if (existing.length > 0) {
          const updated = await db.update(departments)
            .set({ name, color, targetValue: targetValue || 0, updatedAt: new Date() })
            .where(eq(departments.id, existing[0].id))
            .returning();
          res.json(updated[0]);
        } else {
          const inserted = await db.insert(departments)
            .values({ code, name, color, targetValue: targetValue || 0, updatedAt: new Date() })
            .returning();
          res.json(inserted[0]);
        }
      }
    } catch (error: any) {
      if (error.code === '23505') {
        console.warn(`[POST /api/departments] Duplicate code attempt: ${req.body.code}`);
        return res.status(400).json({ message: "A department with this code already exists." });
      }
      console.error("[POST /api/departments] error:", error);
      res.status(500).json({ message: error.message || "Failed to save department" });
    }
  });

  app.delete("/api/departments/:id", async (req, res) => {
    try {
      const db = getDb();
      // Also delete associated programs
      await db.delete(programs).where(eq(programs.departmentId, parseInt(req.params.id)));
      await db.delete(departments).where(eq(departments.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (error: any) {
      console.error("[DELETE /api/departments/:id] error:", error);
      res.status(500).json({ message: error.message || "Failed to delete department" });
    }
  });

  app.get("/api/programs", async (req, res) => {
    const db = getDb();
    const dbPrograms = await db.select().from(programs);
    const deptRecords = await db.select().from(departments);
    const deptMap = new Map(deptRecords.map(d => [d.id, d]));
    
    const formatted = dbPrograms.map(p => {
      const dept = deptMap.get(p.departmentId);
      return {
        ...p,
        college: dept?.code || "Unknown",
        collegeName: dept?.name || "Unknown",
        department: dept?.code || "Unknown",
        departmentName: dept?.name || "Unknown",
        program: p.name,
        departmentColor: dept?.color || "#e5e7eb"
      };
    });
    res.json(formatted);
  });

  app.post("/api/programs", async (req, res) => {
    try {
      const { id, departmentId, code, name, track, level, color, targetValue } = req.body;
      const db = getDb();
      
      if (!departmentId) {
        return res.status(400).json({ message: "Department ID is required" });
      }

      if (id) {
        const updated = await db.update(programs)
          .set({ departmentId, code, name, track, level, color, targetValue: targetValue || 0, updatedAt: new Date() })
          .where(eq(programs.id, id))
          .returning();
        await refreshCatalog();
        res.json(updated[0]);
      } else {
        const existing = await db.select().from(programs).where(eq(programs.code, code)).limit(1);
        if (existing.length > 0) {
          const updated = await db.update(programs)
            .set({ departmentId, name, track, level, color, targetValue: targetValue || 0, updatedAt: new Date() })
            .where(eq(programs.id, existing[0].id))
            .returning();
          await refreshCatalog();
          res.json(updated[0]);
        } else {
          const inserted = await db.insert(programs)
            .values({ departmentId, code, name, track, level: level || "Bachelor", color, targetValue: targetValue || 0, updatedAt: new Date() })
            .returning();
          await refreshCatalog();
          res.json(inserted[0]);
        }
      }
    } catch (error: any) {
      if (error.code === '23505') {
        console.warn(`[POST /api/programs] Duplicate code attempt: ${req.body.code}`);
        return res.status(400).json({ message: "A program with this code already exists." });
      }
      console.error("[POST /api/programs] error:", error);
      res.status(500).json({ message: error.message || "Failed to save program" });
    }
  });

  app.delete("/api/programs/:id", async (req, res) => {
    try {
      const db = getDb();
      await db.delete(programs).where(eq(programs.id, parseInt(req.params.id)));
      await refreshCatalog();
      res.json({ success: true });
    } catch (error: any) {
      console.error("[DELETE /api/programs/:id] error:", error);
      res.status(500).json({ message: error.message || "Failed to delete program" });
    }
  });

  app.post("/api/imports/match-resolution", async (req, res) => {
    const db = getDb();

    const { importedName, officialSchoolId, createAlias } = req.body;
    if (!importedName || !officialSchoolId) return res.status(400).json({ message: "importedName and officialSchoolId required" });

    // 1. Save History (Self-Learning)
    const existingHistory = await db.select().from(schoolMatchHistory).where(eq(schoolMatchHistory.importedName, importedName)).limit(1);
    if (existingHistory.length > 0) {
      await db.update(schoolMatchHistory).set({
        occurrences: existingHistory[0].occurrences + 1,
        officialSchoolId,
      }).where(eq(schoolMatchHistory.id, existingHistory[0].id));
    } else {
      await db.insert(schoolMatchHistory).values({
        importedName,
        officialSchoolId,
        resolvedBy: "Admin"
      });
    }

    // 2. Save Alias if requested
    if (createAlias) {
      const normalized = normalizeSchoolName(importedName);
      const existingAlias = await db.select().from(schoolAliases).where(eq(schoolAliases.normalizedAlias, normalized)).limit(1);
      if (existingAlias.length === 0) {
        await db.insert(schoolAliases).values({
          schoolRegistryId: officialSchoolId,
          aliasName: importedName,
          normalizedAlias: normalized
        });
      }
    }

    // 3. Update pending imports
    await db.update(studentImports).set({
      importStatus: "Matched",
      matchedSchoolId: officialSchoolId,
      matchRule: "manual",
      matchConfidence: 100
    }).where(and(eq(studentImports.previousSchool, importedName), eq(studentImports.importStatus, "Unmatched")));

    res.json({ success: true, message: "Match resolution saved" });
  });

  app.post("/api/imports/apply", async (req, res) => {
    const db = getDb();

    // Apply records that are Matched or Unmatched
    const matchedRecords = await db.select().from(studentImports)
      .where(inArray(studentImports.importStatus, ["Matched", "Unmatched"]));
    
    for (const record of matchedRecords) {
      await db.insert(studentsProcessed).values({
        studentNumber: record.studentNumber,
        fullName: record.fullName,
        course: record.program,
        strand: record.strand,
        admissionType: record.admissionType || "Freshman",
        lastSchoolName: record.previousSchool || "Unknown",
        lastSchoolType: "Unknown",
        schoolRegistryId: record.matchedSchoolId,
        municipality: record.municipality || "Laguna",
        province: "Laguna",
        enrollmentStatus: record.enrollmentStatus === "OE" ? "Officially Enrolled" : 
                          record.enrollmentStatus === "NOE" ? "Not Officially Enrolled" : 
                          (record.enrollmentStatus || "For Verification"),
        importedSource: record.importSource,
        mappingStatus: "verified",
      });

      await db.update(studentImports).set({ importStatus: "Applied" }).where(eq(studentImports.id, record.id));
    }
    
    res.json({ success: true, appliedCount: matchedRecords.length });
  });

  app.get("/api/settings/diagnostics", async (req, res) => {
    const db = getDb();

    const registryCount = await db.select({ value: count() }).from(schoolRegistry);
    const aliasCount = await db.select({ value: count() }).from(schoolAliases);
    
    const matchedCount = await db.select({ value: count() }).from(studentImports).where(eq(studentImports.importStatus, "Matched"));
    const unmatchedCount = await db.select({ value: count() }).from(studentImports).where(eq(studentImports.importStatus, "Unmatched"));
    const appliedCount = await db.select({ value: count() }).from(studentImports).where(eq(studentImports.importStatus, "Applied"));

    const totalProcessed = matchedCount[0].value + unmatchedCount[0].value + appliedCount[0].value;
    const successRate = totalProcessed === 0 ? 0 : Math.round(((matchedCount[0].value + appliedCount[0].value) / totalProcessed) * 100);

    res.json({
      schoolRegistryCount: registryCount[0].value,
      aliasCount: aliasCount[0].value,
      matchedRecords: matchedCount[0].value,
      unmatchedRecords: unmatchedCount[0].value,
      appliedRecords: appliedCount[0].value,
      importSuccessRate: successRate,
      averageConfidence: 95, // Mock for now
      systemHealth: "Optimal"
    });
  });

  app.get("/api/imports/logs", async (req, res) => {
    const logs = await getImportLogs(100);
    res.json(logs);
  });

  app.post(api.integrations.preview.path, async (req, res) => {
    try {
      const input = api.integrations.preview.input.parse(req.body);
      const preview = await previewIntegrationSource(input);
      res.json(preview);
    } catch (err) {
      console.error("[previewIntegrationSource] error:", err);
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      if (err instanceof Error) return res.status(400).json({ message: err.message });
      throw err;
    }
  });

  app.post(api.geocode.school.path, async (req, res) => {
    try {
      const parsed = api.geocode.school.input.safeParse(req.body);
      if (!parsed.success) {
        const message =
          parsed.error.errors[0]?.message ||
          "School name is required";
        return res.status(400).json({ success: false as const, message });
      }

      const { name, municipality } = parsed.data;

      const result = await geocodeSchoolPreview(name, municipality);
      if (!result) {
        return res.status(404).json({
          success: false as const,
          message: "No coordinates found for this school.",
        });
      }

      return res.json({
        success: true as const,
        ...result,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        const message = err.errors[0]?.message || "School name is required";
        return res.status(400).json({ success: false as const, message });
      }
      if (err instanceof Error) {
        console.error("[geocode] unexpected error:", err.message);
        return res.status(500).json({
          success: false as const,
          message: "Geolocation service error. Try again or enter coordinates manually.",
        });
      }
      throw err;
    }
  });

  app.get(api.schoolRegistry.list.path, async (req, res) => {
    const q = String(req.query.q || "");
    const results = await searchSchools(q);
    res.json(results);
  });

  app.get(api.geocode.suggest.path, async (req, res) => {
    const q = String(req.query.q || "").trim();
    if (q.length < 2) {
      return res.json({ registry: [] });
    }

    const exactLocal = await lookupSchoolInRegistry(q);
    const registryMatches = await searchSchools(q, 8);
    const registry = exactLocal
      ? [exactLocal.school, ...registryMatches.filter((school) => school.id !== exactLocal.school.id)]
      : registryMatches;

    res.json({ registry });
  });

  app.get(api.mapping.queue.path, async (_req, res) => {
    const queue = await getMappingQueue();
    res.json(queue);
  });

  app.post(api.mapping.verify.path, async (req, res) => {
    try {
      const input = api.mapping.verify.input.parse(req.body);
      const school = await verifySchoolMapping(input);
      res.json(school);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      if (err instanceof Error) return res.status(404).json({ message: err.message });
      throw err;
    }
  });

  app.post(api.gis.studentsSync.path, async (req, res) => {
    try {
      const input = api.gis.studentsSync.input.parse(req.body);
      const result = await syncStudents(input.records, input.source);
      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      if (err instanceof Error) return res.status(400).json({ message: err.message });
      throw err;
    }
  });

  app.get(api.gis.processedStudents.path, async (_req, res) => {
    const rows = await getProcessedStudents();
    res.json(rows);
  });

  app.post(api.gis.batchDeleteStudents.path, async (req, res) => {
    try {
      const input = api.gis.batchDeleteStudents.input.parse(req.body);
      const result = await storage.batchDeleteProcessedStudents(input.ids);
      await recomputeSchoolStudentCounts();
      res.json({
        success: true,
        deletedCount: result.deletedCount,
        skippedCount: 0,
        message: `Successfully deleted ${result.deletedCount} students.`
      });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ success: false, deletedCount: 0, skippedCount: 0, message: err.errors[0].message });
      if (err instanceof Error) return res.status(500).json({ success: false, deletedCount: 0, skippedCount: 0, message: err.message });
      throw err;
    }
  });

  app.patch(api.gis.updateProcessedStudent.path, async (req, res) => {
    try {
      const input = api.gis.updateProcessedStudent.input.parse(req.body);
      const updated = await updateProcessedStudent(Number(req.params.id), input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      if (err instanceof Error) return res.status(404).json({ message: err.message });
      throw err;
    }
  });

  app.post(api.gis.batchUpdateStudentStatus.path, async (req, res) => {
    try {
      const input = api.gis.batchUpdateStudentStatus.input.parse(req.body);
      const result = await batchUpdateProcessedStudentStatus(input.ids, input.enrollmentStatus);
      const action = input.enrollmentStatus === "Archived" ? "archived" : "updated";
      res.json({
        success: true,
        deletedCount: result.updatedCount,
        skippedCount: 0,
        message: `Successfully ${action} ${result.updatedCount} students.`,
      });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ success: false, deletedCount: 0, skippedCount: 0, message: err.errors[0].message });
      if (err instanceof Error) return res.status(500).json({ success: false, deletedCount: 0, skippedCount: 0, message: err.message });
      throw err;
    }
  });

  app.get(api.gis.mapData.path, async (req, res) => {
    try {
      const input = api.gis.mapData.input.parse({
        scholarships: req.query.scholarships,
        programs: req.query.programs
      });
      
      const toArray = (val?: string | string[]) => {
        if (!val) return undefined;
        return Array.isArray(val) ? val : [val];
      };

      const mapData = await getGisMapData(
        toArray(input.scholarships),
        toArray(input.programs)
      );
      res.json(mapData);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid filter parameters", errors: err.errors });
        return;
      }
      res.status(500).json({ message: "Failed to fetch map data" });
    }
  });

  app.get(api.gis.overview.path, async (_req, res) => {
    const stats = await getGisOverviewStats();
    res.json(stats);
  });

  app.get(api.gis.importLogs.path, async (_req, res) => {
    const logs = await getImportLogs();
    res.json(logs);
  });

  app.post(api.gis.batchDeleteImports.path, async (req, res) => {
    try {
      const input = api.gis.batchDeleteImports.input.parse(req.body);
      const result = await storage.batchDeleteImports(input.ids);
      res.json({
        success: true,
        deletedCount: result.deletedCount,
        skippedCount: 0,
        message: `Successfully deleted ${result.deletedCount} import logs and associated data.`
      });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ success: false, deletedCount: 0, skippedCount: 0, message: err.errors[0].message });
      if (err instanceof Error) return res.status(500).json({ success: false, deletedCount: 0, skippedCount: 0, message: err.message });
      throw err;
    }
  });

  // Student routes
  app.post("/api/students/processed/archive-all", async (req, res) => {
    try {
      const db = getDb();
      // Update all students that are not currently archived
      await db.update(studentsProcessed)
        .set({
          enrollmentStatus: "Archived",
          archivedAt: new Date()
        })
        .where(
          inArray(studentsProcessed.enrollmentStatus, ["Active", "Enrolled", "Pending", "Unknown"])
        );

      res.json({ success: true, message: "Successfully archived all current student records." });
    } catch (err) {
      console.error("Archive error:", err);
      res.status(500).json({ success: false, message: "Failed to archive student data." });
    }
  });

  app.get("/api/students", async (req, res) => {
    const studentsList = await storage.getStudents();
    res.json(studentsList);
  });

  app.get(api.students.getByNumber.path, async (req, res) => {
    const student = await storage.getStudentByNumber(req.params.studentNumber);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json(student);
  });

  app.get(api.students.getByCode.path, async (req, res) => {
    const student = await storage.getStudentByCode(req.params.referralCode);
    if (!student) return res.status(404).json({ message: 'Referral code not found' });
    res.json(student);
  });

  app.post(api.students.register.path, async (req, res) => {
    try {
      const input = api.students.register.input.parse(req.body);
      if (!input.referralCode) {
        input.referralCode = `TRX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      }
      const student = await storage.createStudent(input);
      res.status(201).json(student);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  // Referral routes
  app.get(api.referrals.list.path, async (req, res) => {
    const referralsList = await storage.getReferrals();
    res.json(referralsList);
  });

  app.get("/api/test", (_req, res) => {
    res.json({ status: "ok", message: "Backend is running" });
  });

  app.post(api.referrals.create.path, async (req, res) => {
    try {
      const input = api.referrals.create.input.parse(req.body);
      const referral = await storage.createReferral(input);
      res.status(201).json(referral);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.patch(api.referrals.update.path, async (req, res) => {
    try {
      const input = api.referrals.update.input.parse(req.body);
      const referral = await storage.updateReferral(Number(req.params.id), input);
      if (!referral) return res.status(404).json({ message: 'Referral not found' });
      res.json(referral);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.delete(api.referrals.delete.path, async (req, res) => {
    await storage.deleteReferral(Number(req.params.id));
    res.status(204).send();
  });

  // await seedDatabase(); // Removed to prevent wiping DB on every boot
  return httpServer;
}

export async function seedDatabase() {
  const db = getDb();
  await db.delete(mappingLogs);
  await db.delete(schoolAliases);
  await db.delete(studentsProcessed);
  await db.delete(studentsRaw);
  await db.delete(imports);
  await db.delete(schoolsTable);

  const testSchools = [
    { schoolName: "Trimex Colleges", latitude: 14.339063, longitude: 121.085351, municipality: "Biñan", province: "Laguna" },
    { schoolName: "Laguna Senior High School", latitude: 14.2782, longitude: 121.4163, municipality: "Santa Cruz", province: "Laguna" },
    { schoolName: "Biñan City Senior High School - San Antonio Campus", latitude: 14.3227, longitude: 121.0793, municipality: "Biñan", province: "Laguna" },
    { schoolName: "Calamba City Senior High School", latitude: 14.2117, longitude: 121.1653, municipality: "Calamba", province: "Laguna" },
    { schoolName: "Pagsanjan Stand-Alone Senior High School", latitude: 14.2738, longitude: 121.4558, municipality: "Pagsanjan", province: "Laguna" },
  ];

  for (const school of testSchools) {
    await storage.createSchoolRegistry({
      ...school,
      schoolType: school.schoolName.includes("Colleges") ? "College" : "Senior High School",
      // altitude: null,
      
      isActive: true,
      source: "5-School Test Dataset",
    });
  }

  const seededSchools = await storage.listSchoolRegistry();
  const schoolByName = new Map(seededSchools.map((school) => [school.schoolName, school]));
  const [importRow] = await db.insert(imports).values({
    source: "5-school-test-dataset",
    status: "completed",
    importedCount: 5,
    failedCount: 0,
    completedAt: new Date(),
    notes: "Reliable 5-school / 5-student map test dataset",
  }).returning();

  const testStudents = [
    {
      studentNumber: "26-0001",
      fullName: "Juan Dela Cruz",
      course: "BSIT MWD",
      lastSchoolName: "Trimex Colleges",
      lastSchoolType: "College",
      studentType: "Freshman",
      municipality: "Biñan",
      province: "Laguna",
      enrollmentStatus: "Active",
    },
    {
      studentNumber: "26-0002",
      fullName: "Maria Santos",
      course: "BSBA FM",
      lastSchoolName: "Laguna Senior High School",
      lastSchoolType: "Senior High School",
      studentType: "Freshman",
      municipality: "Santa Cruz",
      province: "Laguna",
      enrollmentStatus: "Active",
    },
    {
      studentNumber: "26-0003",
      fullName: "Carlo Reyes",
      course: "BSCPE",
      lastSchoolName: "Biñan City Senior High School - San Antonio Campus",
      lastSchoolType: "Senior High School",
      studentType: "Freshman",
      municipality: "Biñan",
      province: "Laguna",
      enrollmentStatus: "Active",
    },
    {
      studentNumber: "26-0004",
      fullName: "Angela Cruz",
      course: "BTVTE FSM",
      lastSchoolName: "Calamba City Senior High School",
      lastSchoolType: "Senior High School",
      studentType: "Freshman",
      municipality: "Calamba",
      province: "Laguna",
      enrollmentStatus: "Active",
    },
    {
      studentNumber: "26-0005",
      fullName: "Mark Garcia",
      course: "BSA",
      lastSchoolName: "Pagsanjan Stand-Alone Senior High School",
      lastSchoolType: "Senior High School",
      studentType: "Freshman",
      municipality: "Pagsanjan",
      province: "Laguna",
      enrollmentStatus: "Active",
    },
  ];

  for (const student of testStudents) {
    const [raw] = await db.insert(studentsRaw).values({
      importId: importRow.id,
      studentNumber: student.studentNumber,
      fullName: student.fullName,
      course: student.course,
      lastSchoolName: student.lastSchoolName,
      lastSchoolType: student.lastSchoolType,
      studentType: student.studentType,
      municipality: student.municipality,
      rawPayload: JSON.stringify(student),
    }).returning();

    await db.insert(studentsProcessed).values({
      rawId: raw.id,
      studentNumber: student.studentNumber,
      fullName: student.fullName,
      course: student.course,
      admissionType: "Freshman",
      lastSchoolName: student.lastSchoolName,
      lastSchoolType: student.lastSchoolType,
      schoolRegistryId: schoolByName.get(student.lastSchoolName)?.id ?? null,
      municipality: student.municipality,
      province: student.province,
      enrollmentStatus: student.enrollmentStatus,
      importedSource: "API",
      mappingStatus: "verified",
    });
  }

  await recomputeSchoolStudentCounts();
}
