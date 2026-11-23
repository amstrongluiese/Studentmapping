import assert from "node:assert/strict";
import express from "express";

// Ensure deterministic test env vars exist when running in CI without .env
process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.MYSQL_URL = process.env.MYSQL_URL || "mysql://ci:ci@127.0.0.1:3306/student_mapping_test";
process.env.SESSION_SECRET =
  process.env.SESSION_SECRET || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";

import { applySecurityMiddleware, assertSafeExternalUrl, authLimiter, requireRole } from "../server/security";
import { encrypt, decrypt } from "../server/crypto";
import { hashPassword, comparePasswords } from "../server/auth";

async function runSecurityTests() {
  // 1. Password hashing & safe timing-safe comparison
  const hash = await hashPassword("Str0ngP@ssword!");
  assert.equal(await comparePasswords("Str0ngP@ssword!", hash), true, "Valid password must match");
  assert.equal(await comparePasswords("wrong-password", hash), false, "Wrong password must fail");
  assert.equal(await comparePasswords("anything", "corrupt.short"), false, "Corrupt hash must safely return false");
  console.log("PASS [1/5]: Password hashing & safe timingSafeEqual");

  // 2. AES-256-GCM encryption/decryption
  const sample = "26-17259-PII";
  const enc = encrypt(sample);
  assert.ok(enc && enc.startsWith("enc:"), "Encrypted payload must carry enc: prefix");
  assert.equal(decrypt(enc), sample, "Decrypted payload must match original");
  console.log("PASS [2/5]: AES-256-GCM encryption/decryption");

  // 3. SSRF guard
  const blockedUrls = [
    "http://localhost:5000/api/users",
    "http://127.0.0.1:3306/",
    "http://169.254.169.254/latest/meta-data/",
    "http://10.0.0.1/admin",
    "http://192.168.1.1/",
    "http://172.16.0.1/",
    "file:///etc/passwd",
    "ftp://example.com/file.csv",
  ];
  for (const url of blockedUrls) {
    let blocked = false;
    try {
      await assertSafeExternalUrl(url);
    } catch {
      blocked = true;
    }
    assert.equal(blocked, true, `SSRF guard must block ${url}`);
  }
  console.log(`PASS [3/5]: SSRF guard blocked all ${blockedUrls.length} unsafe URLs`);

  // 4. Live HTTP middleware verification (Helmet headers, RBAC 401, CSRF 403, Rate limit 429)
  const app = express();
  app.use(express.json());
  applySecurityMiddleware(app);

  app.post("/api/test-login", authLimiter, (_req, res) => {
    res.status(401).json({ message: "Invalid username or password." });
  });

  app.post("/api/test-admin", requireRole("admin"), (_req, res) => {
    res.json({ ok: true });
  });

  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const adminRes = await fetch(`${baseUrl}/api/test-admin`, { method: "POST" });
    assert.equal(adminRes.status, 401, "Expected 401 on unauthenticated admin endpoint");
    assert.equal(adminRes.headers.get("x-content-type-options"), "nosniff");
    assert.equal(adminRes.headers.get("x-frame-options"), "DENY");
    assert.equal(adminRes.headers.get("x-powered-by"), null);
    console.log("PASS [4/5]: RBAC 401 + Helmet security headers verified");

    const csrfRes = await fetch(`${baseUrl}/api/test-admin`, {
      method: "POST",
      headers: { Origin: "https://evil-attacker.example.com" },
    });
    assert.equal(csrfRes.status, 403, "Expected 403 on untrusted cross-site Origin");

    let got429 = false;
    for (let i = 0; i < 12; i++) {
      const r = await fetch(`${baseUrl}/api/test-login`, { method: "POST" });
      if (r.status === 429) {
        got429 = true;
        break;
      }
    }
    assert.equal(got429, true, "Expected 429 Too Many Requests after auth rate limit exceeded");
    console.log("PASS [5/5]: CSRF origin guard (403) + Auth rate limiting (429) verified");
  } finally {
    server.close();
  }
}

runSecurityTests().catch((err) => {
  console.error("SECURITY TEST FAILED:", err);
  process.exit(1);
});
