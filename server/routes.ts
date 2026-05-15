import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { hasCoordinates } from "@shared/schoolRegistry";
import { previewIntegrationSource } from "./integrationService";
import { geocodeSchoolWithNominatim } from "./geocodeService";
import {
  getGisOverviewStats,
  getImportLogs,
  getMappingQueue,
  getProcessedStudents,
  resolveSchoolCoordinates,
  searchSchools,
  syncStudents,
  verifySchoolMapping,
} from "./gisPipeline";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // School routes
  app.get(api.schools.list.path, async (req, res) => {
    const schoolsList = await storage.getSchools();
    res.json(schoolsList);
  });

  app.post(api.schools.import.path, async (req, res) => {
    try {
      const input = api.schools.import.input.parse(req.body);
      const result = await storage.importSchools(input.schools);
      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.get(api.schools.get.path, async (req, res) => {
    const school = await storage.getSchool(Number(req.params.id));
    if (!school) return res.status(404).json({ message: 'School not found' });
    res.json(school);
  });

  app.post(api.schools.create.path, async (req, res) => {
    try {
      const input = api.schools.create.input.parse(req.body);
      const school = await storage.createSchool(input);
      res.status(201).json(school);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.put(api.schools.update.path, async (req, res) => {
    try {
      const input = api.schools.update.input.parse(req.body);
      const school = await storage.updateSchool(Number(req.params.id), input);
      if (!school) return res.status(404).json({ message: 'School not found' });
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

  app.post(api.integrations.preview.path, async (req, res) => {
    try {
      const input = api.integrations.preview.input.parse(req.body);
      const preview = await previewIntegrationSource(input);
      res.json(preview);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      if (err instanceof Error) return res.status(400).json({ message: err.message });
      throw err;
    }
  });

  app.post(api.geocode.school.path, async (req, res) => {
    try {
      const input = api.geocode.school.input.parse(req.body);
      const municipality = input.municipality || "Laguna";

      const resolved = await resolveSchoolCoordinates(input.name, municipality, {
        allowNominatim: false,
      });

      if (
        (resolved.source === "registry" || resolved.source === "alias") &&
        hasCoordinates(resolved.school)
      ) {
        return res.json({
          lat: resolved.school.lat!,
          lng: resolved.school.lng!,
          displayName: resolved.school.name,
          source: resolved.source,
          schoolId: resolved.school.id,
          reused: true,
        });
      }

      const geocoded = await geocodeSchoolWithNominatim(input.name, municipality);
      if (!geocoded) {
        return res.status(404).json({ message: "No coordinates found for this school." });
      }

      return res.json({
        lat: geocoded.lat,
        lng: geocoded.lng,
        displayName: geocoded.displayName,
        source: geocoded.source === "cache" ? "cache" : "Nominatim",
        reused: false,
      });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      if (err instanceof Error) return res.status(400).json({ message: err.message });
      throw err;
    }
  });

  app.get(api.schoolsSearch.search.path, async (req, res) => {
    const q = String(req.query.q || "");
    const results = await searchSchools(q);
    res.json(results);
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

  app.get(api.gis.overview.path, async (_req, res) => {
    const stats = await getGisOverviewStats();
    res.json(stats);
  });

  app.get(api.gis.importLogs.path, async (_req, res) => {
    const logs = await getImportLogs();
    res.json(logs);
  });

  // Student routes
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

  await seedDatabase();
  return httpServer;
}

async function seedDatabase() {
  const existingSchools = await storage.getSchools();
  if (existingSchools.length === 0) {
    await storage.createSchool({ name: "Laguna Science National High School", municipality: "Santa Cruz", institutionType: "Public High School", lat: 14.1610, lng: 121.2335, altitude: 18, studentCount: 150, verified: true, status: "Verified", source: "Seed Registry" });
    await storage.createSchool({ name: "Los Banos National High School", municipality: "Los Banos", institutionType: "Public High School", lat: 14.1706, lng: 121.2216, altitude: 22, studentCount: 300, verified: true, status: "Verified", source: "Seed Registry" });
    await storage.createSchool({ name: "Pedro Guevara Memorial National High School", municipality: "Santa Cruz", institutionType: "Public High School", lat: 14.2758, lng: 121.4168, altitude: 12, studentCount: 420, verified: true, status: "Verified", source: "Seed Registry" });
    await storage.createSchool({ name: "Calamba Bayside National High School", municipality: "Calamba", institutionType: "Public High School", lat: 14.2255, lng: 121.1711, altitude: 15, studentCount: 85, verified: true, status: "Verified", source: "Seed Registry" });
  }
}
