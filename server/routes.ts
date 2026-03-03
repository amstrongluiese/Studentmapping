import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get(api.schools.list.path, async (req, res) => {
    const schoolsList = await storage.getSchools();
    res.json(schoolsList);
  });

  app.get(api.schools.get.path, async (req, res) => {
    const school = await storage.getSchool(Number(req.params.id));
    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }
    res.json(school);
  });

  app.post(api.schools.create.path, async (req, res) => {
    try {
      const input = api.schools.create.input.parse(req.body);
      const school = await storage.createSchool(input);
      res.status(201).json(school);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.schools.update.path, async (req, res) => {
    try {
      const input = api.schools.update.input.parse(req.body);
      const school = await storage.updateSchool(Number(req.params.id), input);
      if (!school) {
        return res.status(404).json({ message: 'School not found' });
      }
      res.json(school);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.schools.delete.path, async (req, res) => {
    await storage.deleteSchool(Number(req.params.id));
    res.status(204).send();
  });

  app.get(api.referrals.list.path, async (req, res) => {
    const referralsList = await storage.getReferrals();
    res.json(referralsList);
  });

  app.post(api.referrals.create.path, async (req, res) => {
    try {
      const input = api.referrals.create.input.parse(req.body);
      const referral = await storage.createReferral(input);
      res.status(201).json(referral);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Seed database
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existingSchools = await storage.getSchools();
  if (existingSchools.length === 0) {
    // Seed some Laguna high schools
    await storage.createSchool({
      name: "Laguna Science National High School",
      lat: 14.1610,
      lng: 121.2335,
      studentCount: 150
    });
    await storage.createSchool({
      name: "Los Baños National High School",
      lat: 14.1706,
      lng: 121.2216,
      studentCount: 300
    });
    await storage.createSchool({
      name: "Pedro Guevara Memorial National High School",
      lat: 14.2758,
      lng: 121.4168,
      studentCount: 420
    });
    await storage.createSchool({
      name: "Calamba Bayside National High School",
      lat: 14.2255,
      lng: 121.1711,
      studentCount: 85
    });
  }

  const existingReferrals = await storage.getReferrals();
  if (existingReferrals.length === 0) {
    await storage.createReferral({
      referrerName: "Juan Dela Cruz",
      referredName: "Maria Clara",
      relationship: "Friend",
      contactNumber: "09123456789",
      status: "pending"
    });
  }
}
