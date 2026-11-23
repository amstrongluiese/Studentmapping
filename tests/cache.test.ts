import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
import { EnterpriseCache } from "../server/cache";

async function runCacheTests() {
  // 1. Bounded LRU eviction
  const lru = new EnterpriseCache(3);
  lru.set("k1", { v: 1 }, 60);
  lru.set("k2", { v: 2 }, 60);
  lru.set("k3", { v: 3 }, 60);
  // Access k1 so k2 becomes least-recently-used
  assert.deepEqual(lru.get("k1"), { v: 1 });
  lru.set("k4", { v: 4 }, 60);
  assert.equal(lru.get("k2"), null, "LRU entry k2 should be evicted when maxEntries exceeded");
  assert.deepEqual(lru.get("k1"), { v: 1 });
  assert.deepEqual(lru.get("k4"), { v: 4 });
  console.log("PASS [1/3]: Bounded LRU eviction verified");

  // 2. Prefix invalidation
  lru.set("gis:map:all", [1, 2, 3], 60);
  lru.set("gis:overview", { total: 3 }, 60);
  lru.set("schools:all", [{ id: 1 }], 60);
  lru.invalidate("gis:");
  assert.equal(lru.get("gis:map:all"), null, "gis:map:all should be invalidated");
  assert.equal(lru.get("gis:overview"), null, "gis:overview should be invalidated");
  assert.deepEqual(lru.get("schools:all"), [{ id: 1 }], "Non-matching prefix should remain cached");
  console.log("PASS [2/3]: Prefix cache invalidation verified");

  // 3. getOrSet cache hit behavior
  let fetchCount = 0;
  const fetcher = async () => {
    fetchCount += 1;
    return { count: 42 };
  };
  const first = await lru.getOrSet("programs:all", 60, fetcher);
  const second = await lru.getOrSet("programs:all", 60, fetcher);
  assert.deepEqual(first, { count: 42 });
  assert.deepEqual(second, { count: 42 });
  assert.equal(fetchCount, 1, "Fetcher should only run once on cache hit");
  console.log("PASS [3/3]: Async getOrSet cache hit verified");
}

runCacheTests().catch((err) => {
  console.error("CACHE TEST FAILED:", err);
  process.exit(1);
});
