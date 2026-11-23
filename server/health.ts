import type { Express, Request, Response } from "express";
import { getPool } from "./db";
import { enterpriseCache } from "./cache";
import { enterpriseQueue } from "./queue";

export interface ReadinessChecker {
  checkDb: () => Promise<{ ok: boolean; latencyMs: number; error?: string }>;
}

async function defaultCheckDb(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    const conn = await getPool().getConnection();
    try {
      await conn.query("SELECT 1");
    } finally {
      conn.release();
    }
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err: any) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "Database unreachable",
    };
  }
}

export function registerHealthRoutes(app: Express, checker?: ReadinessChecker) {
  const checkDb = checker?.checkDb || defaultCheckDb;

  const livenessHandler = (_req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      status: "ok",
      service: "studentmapping-gis",
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      cache: {
        backend: enterpriseCache.getStats().backend,
        size: enterpriseCache.getStats().size,
      },
      queue: enterpriseQueue.getStats(),
    });
  };

  const readinessHandler = async (_req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store");
    const dbStatus = await checkDb();

    if (!dbStatus.ok) {
      return res.status(503).json({
        status: "not_ready",
        timestamp: new Date().toISOString(),
        checks: {
          database: { status: "down", latencyMs: dbStatus.latencyMs },
        },
      });
    }

    return res.status(200).json({
      status: "ready",
      timestamp: new Date().toISOString(),
      checks: {
        database: { status: "up", latencyMs: dbStatus.latencyMs },
      },
    });
  };

  app.get("/health", livenessHandler);
  app.get("/api/health", livenessHandler);
  app.get("/ready", readinessHandler);
  app.get("/api/ready", readinessHandler);
}
