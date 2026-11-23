import assert from "node:assert/strict";
import express from "express";

process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "error";

import { requestIdMiddleware } from "../server/logger";
import { registerHealthRoutes } from "../server/health";

async function runSurvivalTests() {
  // 1. Liveness (/health) + Readiness (/ready) when DB is UP + X-Request-Id header
  const appUp = express();
  appUp.use(requestIdMiddleware);
  registerHealthRoutes(appUp, {
    checkDb: async () => ({ ok: true, latencyMs: 3 }),
  });

  const serverUp = appUp.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => serverUp.once("listening", resolve));
  const portUp = (serverUp.address() as any).port;

  try {
    const healthRes = await fetch(`http://127.0.0.1:${portUp}/health`);
    assert.equal(healthRes.status, 200);
    assert.ok(healthRes.headers.get("x-request-id"), "Response must include X-Request-Id");
    const healthJson = (await healthRes.json()) as any;
    assert.equal(healthJson.status, "ok");
    console.log("PASS [1/3]: /health liveness + X-Request-Id header verified");

    const readyRes = await fetch(`http://127.0.0.1:${portUp}/ready`, {
      headers: { "X-Request-Id": "req-custom-123456" },
    });
    assert.equal(readyRes.status, 200);
    assert.equal(readyRes.headers.get("x-request-id"), "req-custom-123456");
    const readyJson = (await readyRes.json()) as any;
    assert.equal(readyJson.status, "ready");
    assert.equal(readyJson.checks.database.status, "up");
    console.log("PASS [2/3]: /ready (DB up -> 200) + incoming X-Request-Id propagation verified");
  } finally {
    serverUp.close();
  }

  // 2. Readiness (/ready) when DB is DOWN -> must return 503
  const appDown = express();
  appDown.use(requestIdMiddleware);
  registerHealthRoutes(appDown, {
    checkDb: async () => ({ ok: false, latencyMs: 5, error: "ECONNREFUSED" }),
  });

  const serverDown = appDown.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => serverDown.once("listening", resolve));
  const portDown = (serverDown.address() as any).port;

  try {
    const res = await fetch(`http://127.0.0.1:${portDown}/ready`);
    assert.equal(res.status, 503, "Expected 503 when database is down");
    const body = (await res.json()) as any;
    assert.equal(body.status, "not_ready");
    assert.equal(body.checks.database.status, "down");
    console.log("PASS [3/3]: /ready (DB down -> 503) verified");
  } finally {
    serverDown.close();
  }
}

runSurvivalTests().catch((err) => {
  console.error("SURVIVAL TEST FAILED:", err);
  process.exit(1);
});
