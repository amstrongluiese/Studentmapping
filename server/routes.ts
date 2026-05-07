import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

// ── School name normalization for fuzzy matching ──────────────────────────────
function normalizeSchoolName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\bnhs\b/g, "national high school")
    .replace(/\bnatl\.?\b/g, "national")
    .replace(/\bnat'l\b/g, "national")
    .replace(/\bhs\b/g, "high school")
    .replace(/\bshs\b/g, "senior high school")
    .replace(/\belem\b/g, "elementary")
    .replace(/\bcnhs\b/g, "central national high school")
    .replace(/\bmem\b/g, "memorial")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function jaccardSimilarity(a: string, b: string): number {
  const wa = new Set(a.split(" ").filter(Boolean));
  const wb = new Set(b.split(" ").filter(Boolean));
  let inter = 0;
  wa.forEach(w => { if (wb.has(w)) inter++; });
  const union = wa.size + wb.size - inter;
  return union === 0 ? 0 : inter / union;
}

function matchSchool(feederName: string, schoolList: { id: number; name: string; municipality: string | null }[]) {
  const normalized = normalizeSchoolName(feederName);
  let best: { id: number; name: string; confidence: number } | null = null;

  for (const school of schoolList) {
    const sn = normalizeSchoolName(school.name);
    const sm = school.municipality ? normalizeSchoolName(school.municipality) : "";

    // Exact match
    if (sn === normalized) return { id: school.id, name: school.name, confidence: 1.0 };

    // Substring match
    if (sn.includes(normalized) || normalized.includes(sn)) {
      const conf = Math.min(normalized.length, sn.length) / Math.max(normalized.length, sn.length);
      if (!best || conf > best.confidence) best = { id: school.id, name: school.name, confidence: conf * 0.92 };
      continue;
    }

    // Jaccard word overlap
    const conf = jaccardSimilarity(normalized, sn);
    if (conf > 0.45 && (!best || conf > best.confidence)) {
      best = { id: school.id, name: school.name, confidence: conf };
    }
  }

  return best;
}

// ── Admissions sync validation ────────────────────────────────────────────────
const admissionRecordSchema = z.object({
  student_name: z.string().optional(),
  studentName: z.string().optional(),
  student_no: z.string().optional(),
  studentNumber: z.string().optional(),
  last_school_attended: z.string().optional(),
  lastSchoolAttended: z.string().optional(),
  senior_high_school: z.string().optional(),
  seniorHighSchool: z.string().optional(),
  college_last_attended: z.string().optional(),
  collegeLastAttended: z.string().optional(),
  student_type: z.string().optional(),
  studentType: z.string().optional(),
}).passthrough();

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {

  // ── School routes ────────────────────────────────────────────────────────────
  app.get(api.schools.list.path, async (req, res) => {
    res.json(await storage.getSchools());
  });

  app.get(api.schools.get.path, async (req, res) => {
    const school = await storage.getSchool(Number(req.params.id));
    if (!school) return res.status(404).json({ message: "School not found" });
    res.json(school);
  });

  app.post(api.schools.create.path, async (req, res) => {
    try {
      const input = api.schools.create.input.parse(req.body);
      res.status(201).json(await storage.createSchool(input));
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.post("/api/schools/bulk", async (req, res) => {
    try {
      const { schools: schoolsList } = req.body;
      if (!Array.isArray(schoolsList)) return res.status(400).json({ message: "schools must be an array" });
      const parsed = z.array(api.schools.create.input).parse(schoolsList);
      res.status(201).json(await storage.bulkCreateSchools(parsed));
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.put(api.schools.update.path, async (req, res) => {
    try {
      const input = api.schools.update.input.parse(req.body);
      const school = await storage.updateSchool(Number(req.params.id), input);
      if (!school) return res.status(404).json({ message: "School not found" });
      res.json(school);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.delete(api.schools.delete.path, async (req, res) => {
    await storage.deleteSchool(Number(req.params.id));
    res.status(204).send();
  });

  // ── Student routes ───────────────────────────────────────────────────────────
  app.get("/api/students", async (req, res) => {
    res.json(await storage.getStudents());
  });

  app.get(api.students.getByNumber.path, async (req, res) => {
    const student = await storage.getStudentByNumber(req.params.studentNumber);
    if (!student) return res.status(404).json({ message: "Student not found" });
    res.json(student);
  });

  app.get(api.students.getByCode.path, async (req, res) => {
    const student = await storage.getStudentByCode(req.params.referralCode);
    if (!student) return res.status(404).json({ message: "Referral code not found" });
    res.json(student);
  });

  app.post(api.students.register.path, async (req, res) => {
    try {
      const input = api.students.register.input.parse(req.body);
      if (!input.referralCode) {
        input.referralCode = `TRX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      }
      res.status(201).json(await storage.createStudent(input));
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  // ── Referral routes ──────────────────────────────────────────────────────────
  app.get(api.referrals.list.path, async (req, res) => {
    res.json(await storage.getReferrals());
  });

  app.post(api.referrals.create.path, async (req, res) => {
    try {
      const input = api.referrals.create.input.parse(req.body);
      res.status(201).json(await storage.createReferral(input));
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.patch(api.referrals.update.path, async (req, res) => {
    try {
      const input = api.referrals.update.input.parse(req.body);
      const referral = await storage.updateReferral(Number(req.params.id), input);
      if (!referral) return res.status(404).json({ message: "Referral not found" });
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

  // ── Admissions Sync ──────────────────────────────────────────────────────────
  app.get("/api/admissions", async (req, res) => {
    res.json(await storage.getAdmissions());
  });

  app.delete("/api/admissions", async (req, res) => {
    await storage.clearAdmissions();
    res.status(204).send();
  });

  app.post("/api/admissions/sync", async (req, res) => {
    try {
      const { records } = req.body;
      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ message: "records must be a non-empty array" });
      }

      const parsed = z.array(admissionRecordSchema).parse(records);
      const allSchools = await storage.getSchools();

      const toInsert: any[] = [];
      const schoolCountDeltas: Record<number, number> = {};

      for (const r of parsed) {
        // Normalize field names (accept both snake_case and camelCase)
        const studentName = (r.studentName || r.student_name || "").trim();
        if (!studentName) continue;

        const studentNumber = r.studentNumber || r.student_no || null;
        const lastSchool = r.lastSchoolAttended || r.last_school_attended || null;
        const seniorHS = r.seniorHighSchool || r.senior_high_school || null;
        const college = r.collegeLastAttended || r.college_last_attended || null;
        const studentType = r.studentType || r.student_type || null;

        // Determine feeder school to match: priority lastSchoolAttended > seniorHS
        const feederField = lastSchool || seniorHS;

        let matchedSchoolId: number | null = null;
        let matchedSchoolName: string | null = null;
        let matchConfidence: number | null = null;

        if (feederField) {
          const match = matchSchool(feederField, allSchools);
          if (match && match.confidence >= 0.5) {
            matchedSchoolId = match.id;
            matchedSchoolName = match.name;
            matchConfidence = Math.round(match.confidence * 100) / 100;
            schoolCountDeltas[match.id] = (schoolCountDeltas[match.id] || 0) + 1;
          }
        }

        toInsert.push({
          studentName,
          studentNumber: studentNumber || null,
          lastSchoolAttended: lastSchool || null,
          seniorHighSchool: seniorHS || null,
          collegeLastAttended: college || null,
          studentType: studentType || null,
          matchedSchoolId,
          matchedSchoolName,
          matchConfidence,
        });
      }

      const saved = await storage.bulkCreateAdmissions(toInsert);

      // Update school student counts for matched records
      for (const [schoolIdStr, delta] of Object.entries(schoolCountDeltas)) {
        const schoolId = Number(schoolIdStr);
        const school = allSchools.find(s => s.id === schoolId);
        if (school) {
          await storage.updateSchool(schoolId, { studentCount: school.studentCount + delta });
        }
      }

      const matched = saved.filter(r => r.matchedSchoolId !== null);
      const unmatched = saved.filter(r => r.matchedSchoolId === null);

      res.json({
        synced: saved.length,
        matched: matched.length,
        unmatched: unmatched.length,
        schoolsUpdated: Object.keys(schoolCountDeltas).length,
        records: saved,
      });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      console.error("Admissions sync error:", err);
      res.status(500).json({ message: "Internal server error during sync" });
    }
  });

  await seedDatabase();
  return httpServer;
}

async function seedDatabase() {
  const existingSchools = await storage.getSchools();
  if (existingSchools.length === 0) {
    await storage.createSchool({ name: "Laguna Science National High School", municipality: "Bay", institutionType: "Public High School", lat: 14.1610, lng: 121.2335, studentCount: 150, geoStatus: "verified" });
    await storage.createSchool({ name: "Los Baños National High School", municipality: "Los Baños", institutionType: "Public High School", lat: 14.1706, lng: 121.2216, studentCount: 300, geoStatus: "verified" });
    await storage.createSchool({ name: "Pedro Guevara Memorial National High School", municipality: "Santa Cruz", institutionType: "Public High School", lat: 14.2758, lng: 121.4168, studentCount: 420, geoStatus: "verified" });
    await storage.createSchool({ name: "Calamba Bayside National High School", municipality: "Calamba", institutionType: "Public High School", lat: 14.2255, lng: 121.1711, studentCount: 85, geoStatus: "verified" });
  }
}
