import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const SENSITIVE_FIELD_PATTERN = /(password|secret|token|authorization|cookie|apikey|api_key)/i;

function getMinLevel(): LogLevel {
  const configured = (process.env.LOG_LEVEL || "info").toLowerCase();
  if (configured === "debug" || configured === "info" || configured === "warn" || configured === "error") {
    return configured;
  }
  return "info";
}

function sanitizeMeta(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (SENSITIVE_FIELD_PATTERN.test(k)) {
      clean[k] = "[REDACTED]";
    } else if (v instanceof Error) {
      clean[k] = { name: v.name, message: v.message };
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

function writeLog(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[getMinLevel()]) return;

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: "studentmapping-gis",
    message,
    ...sanitizeMeta(meta),
  };

  const serialized = JSON.stringify(entry);
  if (level === "error") {
    process.stderr.write(`${serialized}\n`);
  } else {
    process.stdout.write(`${serialized}\n`);
  }
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => writeLog("debug", message, meta),
  info: (message: string, meta?: Record<string, unknown>) => writeLog("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => writeLog("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => writeLog("error", message, meta),
};

/** Attaches a unique X-Request-Id header & req.requestId to every request */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incoming = req.get("x-request-id");
  const safeIncoming = incoming && /^[a-zA-Z0-9._-]{8,64}$/.test(incoming) ? incoming : null;
  const requestId = safeIncoming || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
}

/**
 * Sentry-ready error reporter.
 * Always emits a structured JSON error log. When SENTRY_DSN is configured,
 * forwards a lightweight Sentry Store event asynchronously without blocking responses.
 */
export function captureException(err: unknown, context?: Record<string, unknown>) {
  const errorObj = err instanceof Error ? err : new Error(String(err));

  logger.error(errorObj.message || "Unhandled exception", {
    errorName: errorObj.name,
    ...(process.env.NODE_ENV !== "production" ? { stack: errorObj.stack } : {}),
    ...context,
  });

  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn || process.env.NODE_ENV === "test") return;

  try {
    const parsed = new URL(dsn);
    const publicKey = parsed.username;
    const projectId = parsed.pathname.replace(/^\/+/, "");
    if (!publicKey || !projectId) return;

    const storeUrl = `${parsed.protocol}//${parsed.host}/api/${projectId}/store/`;
    const payload = {
      event_id: crypto.randomUUID().replace(/-/g, ""),
      timestamp: Math.floor(Date.now() / 1000),
      platform: "node",
      level: "error",
      environment: process.env.NODE_ENV || "production",
      message: errorObj.message,
      extra: sanitizeMeta(context),
      exception: {
        values: [
          {
            type: errorObj.name,
            value: errorObj.message,
          },
        ],
      },
    };

    fetch(storeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${publicKey}, sentry_client=studentmapping/1.0`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3000),
    }).catch(() => {});
  } catch {
    // Never allow telemetry failure to impact application stability
  }
}
