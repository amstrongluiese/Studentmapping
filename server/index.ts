import dotenv from "dotenv";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { testDatabaseConnection, initializeDatabase } from "./db";

dotenv.config();


import { syncExcelToJSON } from "./syncMasterDirectory";
import * as fs from "fs";
import * as path from "path";

// Auto-sync JSON from Excel on boot if JSON doesn't exist
const excelPath = path.join(process.cwd(), "Geocoded_Schools_2026.xlsx");
const jsonPath = path.join(process.cwd(), "server", "data", "schools_directory.json");

// Removed old sync

// reloadMasterDirectory();

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: "50mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: "50mb" }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;

  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;

    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;

      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  initializeDatabase();

  await testDatabaseConnection();

  // const { ensureGisSchema } = await import("./ensureGisSchema");
  // await ensureGisSchema();

  if (fs.existsSync(excelPath)) {
    console.log("[startup] Generating initial schools_directory.json from Excel and importing to DB...");
    const schoolsData = syncExcelToJSON(excelPath);
    const { storage } = await import("./storage");
    const count = await storage.listSchoolRegistry();
    if (count.length === 0) {
       console.log("[startup] School registry is empty. Importing...");
       await storage.importSchools(schoolsData as any);
       console.log("[startup] Imported", schoolsData.length, "schools.");
    }
  }

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // Setup Vite in development only
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // Serve both API and frontend
  const preferredPort = parseInt(process.env.PORT || "5000", 10);

  function tryListen(startPort: number, maxAttempts = 6) {
    let attempts = 0;
    let currentPort = startPort;

    const attempt = () => {
      attempts += 1;

      const onError = (err: any) => {
        if (err && err.code === "EADDRINUSE") {
          log(`port ${currentPort} in use, attempting ${attempts < maxAttempts ? 'next' : 'no more'} port(s)...`);
          httpServer.removeListener("error", onError);
          if (attempts >= maxAttempts) {
            console.error(`No available ports after ${attempts} attempts; giving up.`);
            process.exit(1);
            return;
          }
          currentPort += 1;
          // slight delay before retrying to avoid races
          setTimeout(attempt, 120);
          return;
        }

        // rethrow other errors
        throw err;
      };

      httpServer.once("error", onError);

      httpServer.listen({ port: currentPort, host: "0.0.0.0" }, () => {
        httpServer.removeListener("error", onError);
        log(`serving on port ${currentPort}`);
        log(`local: http://localhost:${currentPort}`);
        log(`network: http://192.168.100.134:${currentPort}`);
      });
    };

    attempt();
  }

  tryListen(preferredPort);
})().catch((err) => {
  console.error(
    "Startup failed:",
    err instanceof Error ? err.message : err,
  );

  process.exit(1);
});