import type { Express, Request, Response, NextFunction, RequestHandler } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import dns from "dns/promises";
import net from "net";
import { getEnv } from "./env";
import type { User as SelectUser } from "@shared/schema";

/**
 * Security headers via Helmet with a CSP tuned for Leaflet, OpenStreetMap,
 * Google Maps, and Vite dev HMR so existing map visualizations continue working.
 */
export function buildHelmetMiddleware(): RequestHandler {
  const { IS_PRODUCTION, CORS_ORIGINS } = getEnv();
  const isHttpsDeployment =
    process.env.FORCE_HTTPS === "true" ||
    CORS_ORIGINS.some((origin) => origin.startsWith("https://"));

  return helmet({
    contentSecurityPolicy: IS_PRODUCTION
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
              "'self'",
              "'unsafe-inline'",
              "https://maps.googleapis.com",
              "https://maps.gstatic.com",
            ],
            styleSrc: [
              "'self'",
              "'unsafe-inline'",
              "https://fonts.googleapis.com",
              "https://unpkg.com",
            ],
            imgSrc: [
              "'self'",
              "data:",
              "blob:",
              "https://*.tile.openstreetmap.org",
              "https://*.basemaps.cartocdn.com",
              "https://server.arcgisonline.com",
              "https://maps.googleapis.com",
              "https://maps.gstatic.com",
              "https://*.ggpht.com",
              "https://unpkg.com",
            ],
            fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
            connectSrc: [
              "'self'",
              "https://maps.googleapis.com",
              "https://nominatim.openstreetmap.org",
              "https://*.tile.openstreetmap.org",
              "https://*.basemaps.cartocdn.com",
            ],
            frameAncestors: ["'none'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            // Prevent breaking dynamic ES module chunk imports on plain http://localhost
            upgradeInsecureRequests: isHttpsDeployment ? [] : null,
          },
        }
      : false,
    crossOriginEmbedderPolicy: false,
    frameguard: { action: "deny" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    hsts: IS_PRODUCTION && isHttpsDeployment ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  });
}

/**
 * Strict CORS allowlist. Same-origin requests (no Origin header) are allowed.
 */
export function buildCorsMiddleware(): RequestHandler {
  const { CORS_ORIGINS, IS_PRODUCTION } = getEnv();
  const allowedOrigins = new Set(CORS_ORIGINS);

  return cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      if (!IS_PRODUCTION && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  });
}

/**
 * CSRF protection for cookie-authenticated state-changing requests.
 * Verifies that the Origin (or Referer) matches the Host or configured CORS allowlist.
 */
export function csrfOriginGuard(req: Request, res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  const originHeader = req.get("origin");
  const refererHeader = req.get("referer");
  const sourceHeader = originHeader || refererHeader;

  // Non-browser / curl / same-origin requests without Origin/Referer are allowed
  // only when not carrying cross-site browser indicators.
  if (!sourceHeader) {
    return next();
  }

  try {
    const sourceOrigin = new URL(sourceHeader).origin;
    const host = req.get("host");
    const { CORS_ORIGINS, IS_PRODUCTION } = getEnv();

    if (host && (sourceOrigin === `http://${host}` || sourceOrigin === `https://${host}`)) {
      return next();
    }

    if (CORS_ORIGINS.includes(sourceOrigin)) {
      return next();
    }

    if (!IS_PRODUCTION && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(sourceOrigin)) {
      return next();
    }

    return res.status(403).json({ message: "CSRF validation failed: untrusted request origin." });
  } catch {
    return res.status(403).json({ message: "CSRF validation failed: malformed origin header." });
  }
}

function userOrIpKeyGenerator(req: Request): string {
  const userId = (req.user as SelectUser | undefined)?.id;
  if (userId) return `user:${userId}`;
  return `ip:${ipKeyGenerator(req.ip || req.socket.remoteAddress || "127.0.0.1")}`;
}

function ipOnlyKeyGenerator(req: Request): string {
  return `ip:${ipKeyGenerator(req.ip || req.socket.remoteAddress || "127.0.0.1")}`;
}

/** Strict rate limiter for authentication & password verification endpoints */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: ipOnlyKeyGenerator,
  message: {
    message: "Too many authentication attempts. Please wait 15 minutes and try again.",
  },
});

/** Tiered rate limiter for file uploads, directory imports, and external syncs */
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: userOrIpKeyGenerator,
  message: {
    message: "Upload/import rate limit exceeded. Please wait before submitting more batches.",
  },
});

/** Tiered rate limiter for mutating API endpoints (POST/PUT/PATCH/DELETE) */
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: userOrIpKeyGenerator,
  message: {
    message: "Too many write requests. Please slow down and try again shortly.",
  },
});

/** Rate limiter for public portal endpoints (student registration, referrals, lookup) */
export const publicApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: ipOnlyKeyGenerator,
  message: {
    message: "Too many requests from this IP. Please try again in a minute.",
  },
});

/** Apply global security middleware stack */
export function applySecurityMiddleware(app: Express) {
  app.disable("x-powered-by");
  app.use(buildHelmetMiddleware());
  app.use(buildCorsMiddleware());
  app.use("/api", csrfOriginGuard);
}

/** Role-based access control middleware */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
}

export function requireRole(...allowedRoles: string[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const role = (req.user as SelectUser).role;
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions." });
    }
    return next();
  };
}

/**
 * SSRF Protection: validates that a user-supplied URL resolves only to public
 * internet IP addresses and uses http/https. Blocks loopback, link-local
 * (cloud metadata 169.254.169.254), and RFC1918 private networks.
 */
function isPrivateOrReservedIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // multicast/reserved
    return false;
  }

  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (
      lower === "::1" ||
      lower === "::" ||
      lower.startsWith("fc") ||
      lower.startsWith("fd") ||
      lower.startsWith("fe80:") ||
      lower.startsWith("::ffff:127.") ||
      lower.startsWith("::ffff:10.") ||
      lower.startsWith("::ffff:192.168.") ||
      lower.startsWith("::ffff:169.254.")
    ) {
      return true;
    }
    return false;
  }

  return true;
}

export async function assertSafeExternalUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL format.");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Only http:// and https:// URLs are allowed.");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new Error("Requests to local or internal hostnames are not permitted.");
  }

  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      throw new Error("Requests to private or loopback IP addresses are not permitted.");
    }
    return parsed;
  }

  let addresses: { address: string }[];
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch {
    throw new Error(`Could not resolve hostname: ${hostname}`);
  }

  if (!addresses.length || addresses.some((a) => isPrivateOrReservedIp(a.address))) {
    throw new Error("Target URL resolves to a restricted private/internal IP address.");
  }

  return parsed;
}
