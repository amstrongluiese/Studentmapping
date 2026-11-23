import crypto from "crypto";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  MYSQL_URL: z.string().min(1).optional(),
  DATABASE_URL: z.string().min(1).optional(),
  SESSION_SECRET: z.string().optional(),
  ENCRYPTION_KEY: z.string().optional(),
  CORS_ORIGIN: z.string().optional(),
  ALLOW_DEV_AUTO_ADMIN: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  ADMIN_SEED_USERNAME: z.string().min(3).max(64).default("admin"),
  ADMIN_SEED_PASSWORD: z.string().min(8).optional(),
  TRUST_PROXY: z.coerce.number().int().min(0).max(10).optional(),
  MYSQL_POOL_LIMIT: z.coerce.number().int().min(2).max(200).default(20),
  MYSQL_QUEUE_LIMIT: z.coerce.number().int().min(0).max(5000).default(0),
  MYSQL_CONNECT_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(10000),
  QUEUE_CONCURRENCY: z.coerce.number().int().min(1).max(16).default(2),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  SENTRY_DSN: z.string().url().optional().or(z.literal("")),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  VITE_GOOGLE_MAPS_API_KEY: z.string().optional(),
});

export interface ValidatedEnv {
  NODE_ENV: "development" | "test" | "staging" | "production";
  IS_PRODUCTION: boolean;
  PORT: number;
  MYSQL_URL: string;
  SESSION_SECRET: string;
  ENCRYPTION_KEY_BUFFER: Buffer;
  CORS_ORIGINS: string[];
  ALLOW_DEV_AUTO_ADMIN: boolean;
  ADMIN_SEED_USERNAME: string;
  ADMIN_SEED_PASSWORD?: string;
  TRUST_PROXY: number;
  MYSQL_POOL_LIMIT: number;
  MYSQL_QUEUE_LIMIT: number;
  MYSQL_CONNECT_TIMEOUT_MS: number;
  QUEUE_CONCURRENCY: number;
  LOG_LEVEL: "debug" | "info" | "warn" | "error";
  SENTRY_DSN?: string;
}

let cachedEnv: ValidatedEnv | null = null;

function deriveDevSecret(label: string, seed: string): string {
  return crypto.createHash("sha256").update(`studentmapping-dev:${label}:${seed}`).digest("hex");
}

function parseEncryptionKey(rawKey: string | undefined, isProd: boolean, dbUrl: string): Buffer {
  if (rawKey && rawKey.trim().length > 0) {
    const trimmed = rawKey.trim();
    if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
      return Buffer.from(trimmed, "hex");
    }
    if (isProd) {
      throw new Error(
        "ENCRYPTION_KEY must be a 64-character hex string (32 bytes) in production. Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
      );
    }
    console.warn("[env] ENCRYPTION_KEY is not 64 hex chars; deriving a 32-byte key via SHA-256 for development.");
    return crypto.createHash("sha256").update(trimmed).digest();
  }

  if (isProd) {
    throw new Error(
      "ENCRYPTION_KEY is required in production (64-char hex string). Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }

  console.warn("[env] ENCRYPTION_KEY not set — using deterministic development-only key. Set ENCRYPTION_KEY in .env before production.");
  return crypto.createHash("sha256").update(`dev-encryption-key:${dbUrl}`).digest();
}

export function validateEnv(): ValidatedEnv {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }

  const data = parsed.data;
  const isProd = data.NODE_ENV === "production" || data.NODE_ENV === "staging";
  const mysqlUrl = data.MYSQL_URL || data.DATABASE_URL;

  if (!mysqlUrl) {
    throw new Error("MYSQL_URL (or DATABASE_URL) must be set in your environment / .env file.");
  }

  let sessionSecret = data.SESSION_SECRET?.trim();
  if (!sessionSecret || sessionSecret.length < 32) {
    if (isProd) {
      throw new Error(
        "SESSION_SECRET is required in production/staging and must be at least 32 characters long.",
      );
    }
    console.warn(
      "[env] SESSION_SECRET missing or < 32 chars — using deterministic development-only secret. Set SESSION_SECRET in .env before production.",
    );
    sessionSecret = deriveDevSecret("session", mysqlUrl);
  }

  const encryptionKeyBuffer = parseEncryptionKey(data.ENCRYPTION_KEY, isProd, mysqlUrl);

  const corsOrigins = (data.CORS_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  cachedEnv = {
    NODE_ENV: data.NODE_ENV,
    IS_PRODUCTION: isProd,
    PORT: data.PORT,
    MYSQL_URL: mysqlUrl,
    SESSION_SECRET: sessionSecret,
    ENCRYPTION_KEY_BUFFER: encryptionKeyBuffer,
    CORS_ORIGINS: corsOrigins,
    ALLOW_DEV_AUTO_ADMIN: !isProd && data.ALLOW_DEV_AUTO_ADMIN,
    ADMIN_SEED_USERNAME: data.ADMIN_SEED_USERNAME,
    ADMIN_SEED_PASSWORD: data.ADMIN_SEED_PASSWORD,
    TRUST_PROXY: data.TRUST_PROXY ?? (isProd ? 1 : 0),
    MYSQL_POOL_LIMIT: data.MYSQL_POOL_LIMIT,
    MYSQL_QUEUE_LIMIT: data.MYSQL_QUEUE_LIMIT,
    MYSQL_CONNECT_TIMEOUT_MS: data.MYSQL_CONNECT_TIMEOUT_MS,
    QUEUE_CONCURRENCY: data.QUEUE_CONCURRENCY,
    LOG_LEVEL: data.LOG_LEVEL,
    SENTRY_DSN: data.SENTRY_DSN || undefined,
  };

  return cachedEnv;
}

export function getEnv(): ValidatedEnv {
  return validateEnv();
}
