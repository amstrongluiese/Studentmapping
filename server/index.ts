import dotenv from "dotenv";
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { validateEnv } from "./env";
import { applySecurityMiddleware } from "./security";
import { logger, requestIdMiddleware, captureException } from "./logger";
import { registerHealthRoutes } from "./health";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { testDatabaseConnection, initializeDatabase, getDb } from "./db";
import { closeMysqlPool } from "./dbMysql";
import { enterpriseCache } from "./cache";
import { ensureGisSchema } from "./ensureGisSchema";
import { dataAccessLogs } from "@shared/schema";
import { setupAuth } from "./auth";

const env = validateEnv();
const app = express();
const httpServer = createServer(app);

// Reverse proxy / load balancer readiness (preserves real req.ip and HTTPS cookies behind Nginx/Caddy/Cloudflare)
if (env.TRUST_PROXY > 0) {
  app.set("trust proxy", env.TRUST_PROXY);
}

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(requestIdMiddleware);
applySecurityMiddleware(app);

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
  logger.info(message, { source });
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const durationMs = Date.now() - start;

    if (path.startsWith("/api")) {
      // Structured JSON request log without PII response bodies
      logger.info("http_request", {
        requestId: req.requestId,
        method: req.method,
        path,
        status: res.statusCode,
        durationMs,
        bytes: res.getHeader("content-length") || undefined,
      });

      // Async log to DB for audit trailing (Data Privacy Act compliance)
      if (req.isAuthenticated && req.isAuthenticated() && req.user && req.method !== "OPTIONS") {
        const user = req.user as any;
        getDb()
          .insert(dataAccessLogs)
          .values({
            userId: user.id,
            action: req.method,
            targetTable: path,
            ipAddress: req.ip || req.socket.remoteAddress || "unknown",
          })
          .execute()
          .catch((err) => logger.error("audit_log_write_failed", { requestId: req.requestId, error: err }));
      }
    }
  });

  next();
});

/**
 * Explicit method + path allowlist for unauthenticated /api requests.
 */
function isPublicApiRequest(req: Request): boolean {
  const { method, path } = req;

  if (method === "GET") {
    if (
      path === "/user" ||
      path === "/programs" ||
      path === "/departments" ||
      path === "/settings" ||
      path === "/test" ||
      path === "/health" ||
      path === "/ready" ||
      path === "/referrals"
    ) {
      return true;
    }
    if (path.startsWith("/students/number/") || path.startsWith("/students/code/")) {
      return true;
    }
    return false;
  }

  if (method === "POST") {
    return (
      path === "/login" ||
      path === "/logout" ||
      path === "/students/register" ||
      path === "/referrals" ||
      path === "/public-referrals"
    );
  }

  return false;
}

// Register unauthenticated liveness & readiness probes before API auth gate
registerHealthRoutes(app);

let isShuttingDown = false;
async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.warn("shutdown_initiated", { signal });

  const forceTimer = setTimeout(() => {
    logger.error("shutdown_forced_timeout", { signal });
    process.exit(1);
  }, 10000);
  forceTimer.unref();

  httpServer.close(async () => {
    await enterpriseCache.close().catch(() => {});
    await closeMysqlPool().catch(() => {});
    logger.info("shutdown_complete", { signal });
    process.exit(0);
  });
}

process.on("SIGTERM", () => void gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => void gracefulShutdown("SIGINT"));
process.on("unhandledRejection", (reason) => captureException(reason, { source: "unhandledRejection" }));
process.on("uncaughtException", (err) => {
  captureException(err, { source: "uncaughtException" });
  void gracefulShutdown("uncaughtException");
});

(async () => {
  initializeDatabase();

  await testDatabaseConnection();
  await ensureGisSchema();
  setupAuth(app);

  // Default API cache policy: prevent shared CDNs/proxies from caching authenticated/PII responses.
  app.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    next();
  });

  // Protect all API routes except explicitly allowlisted public method+path pairs
  app.use("/api", (req, res, next) => {
    if (isPublicApiRequest(req)) {
      return next();
    }
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      return next();
    }
    // Opt-in only for local development debugging (never active by default or in production)
    if (env.ALLOW_DEV_AUTO_ADMIN) {
      req.user = { id: 1, username: "admin", role: "admin" } as any;
      return next();
    }
    return res.status(401).json({ message: "Unauthorized", requestId: req.requestId });
  });

  await registerRoutes(httpServer, app);

  // Hardened global error handler — never leaks stack traces or raw 500 internals in production
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const isClientError = status >= 400 && status < 500;
    const message = isClientError
      ? err.message || "Bad Request"
      : env.IS_PRODUCTION
        ? "Internal Server Error"
        : err.message || "Internal Server Error";

    captureException(err, {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      status,
    });

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message, requestId: req.requestId });
  });

  // Setup Vite in development only
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // Serve both API and frontend
  const preferredPort = env.PORT;

  function tryListen(startPort: number, maxAttempts = 6) {
    let attempts = 0;
    let currentPort = startPort;

    const attempt = () => {
      attempts += 1;

      const onError = (err: any) => {
        if (err && err.code === "EADDRINUSE") {
          logger.warn("port_in_use", { port: currentPort, attempt: attempts, maxAttempts });
          httpServer.removeListener("error", onError);
          if (attempts >= maxAttempts) {
            logger.error("no_available_ports", { attempts });
            process.exit(1);
            return;
          }
          currentPort += 1;
          setTimeout(attempt, 120);
          return;
        }

        throw err;
      };

      httpServer.once("error", onError);

      httpServer.listen({ port: currentPort, host: "0.0.0.0" }, () => {
        httpServer.removeListener("error", onError);
        logger.info("server_listening", {
          port: currentPort,
          env: env.NODE_ENV,
          url: `http://localhost:${currentPort}`,
        });
      });
    };

    attempt();
  }

  tryListen(preferredPort);
})().catch((err) => {
  captureException(err, { source: "startup" });
  process.exit(1);
});
