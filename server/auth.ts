import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import MySQLStoreFactory from "express-mysql-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, type User as SelectUser } from "@shared/schema";
import { getDb } from "./db";
import { getMysqlPool } from "./dbMysql";
import { getEnv } from "./env";
import { authLimiter } from "./security";
import { eq } from "drizzle-orm";
import { z } from "zod";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);
export const SESSION_COOKIE_NAME = "studentmapping.sid";

const loginBodySchema = z.object({
  username: z.string().trim().min(1, "Username is required").max(100),
  password: z.string().min(1, "Password is required").max(256),
});

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  if (!supplied || !stored) return false;
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) return false;
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  if (hashedBuf.length !== suppliedBuf.length) return false;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const env = getEnv();
  const isHttpsDeployment =
    process.env.FORCE_HTTPS === "true" ||
    env.CORS_ORIGINS.some((origin) => origin.startsWith("https://"));
  const MySQLStore = MySQLStoreFactory(session as any);
  const store = new MySQLStore({ createDatabaseTable: true }, getMysqlPool() as any);

  app.use(
    session({
      name: SESSION_COOKIE_NAME,
      secret: env.SESSION_SECRET,
      proxy: env.TRUST_PROXY > 0,
      resave: false,
      saveUninitialized: false,
      store,
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        httpOnly: true,
        sameSite: "lax",
        secure: env.IS_PRODUCTION && isHttpsDeployment,
      },
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const trimmedUsername = username.trim();
        const [user] = await getDb()
          .select()
          .from(users)
          .where(eq(users.username, trimmedUsername))
          .limit(1);

        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Invalid username or password." });
        }
        if (!user.isActive) {
          return done(null, false, { message: "Account is inactive. Contact an administrator." });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await getDb().select().from(users).where(eq(users.id, id)).limit(1);
      if (!user || !user.isActive) {
        return done(null, false);
      }
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/login", authLimiter, (req, res, next) => {
    const parsed = loginBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid login input" });
    }
    req.body = parsed.data;

    passport.authenticate("local", (err: any, user: SelectUser, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Invalid username or password." });

      // Regenerate session ID to prevent session fixation attacks
      req.session.regenerate((regenErr) => {
        if (regenErr) return next(regenErr);
        req.logIn(user, (loginErr) => {
          if (loginErr) return next(loginErr);
          return res.json({
            message: "Logged in successfully",
            user: { id: user.id, username: user.username, role: user.role },
          });
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((destroyErr) => {
        if (destroyErr) return next(destroyErr);
        res.clearCookie(SESSION_COOKIE_NAME, {
          httpOnly: true,
          sameSite: "lax",
          secure: env.IS_PRODUCTION && isHttpsDeployment,
        });
        return res.json({ message: "Logged out successfully" });
      });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = req.user as SelectUser;
    res.json({ id: user.id, username: user.username, role: user.role });
  });
}

// Middlewares
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user) return next();
  res.status(401).json({ message: "Unauthorized" });
}

export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user && (req.user as SelectUser).role === "admin") {
    return next();
  }
  res.status(403).json({ message: "Forbidden: administrator access required." });
}
