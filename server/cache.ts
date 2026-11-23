import Redis from "ioredis";

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const KEY_PREFIX = "sm:cache:";
const DEFAULT_MAX_ENTRIES = 500;

export class EnterpriseCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxEntries: number;
  private redis: Redis | null = null;
  private redisReady = false;

  constructor(maxEntries: number = DEFAULT_MAX_ENTRIES) {
    this.maxEntries = maxEntries;
    this.initRedisIfConfigured();
  }

  private initRedisIfConfigured() {
    const redisUrl = process.env.REDIS_URL?.trim();
    if (!redisUrl || process.env.NODE_ENV === "test") return;

    try {
      const client = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        connectTimeout: 2000,
      });

      client.on("ready", () => {
        this.redisReady = true;
        console.log("[Cache] Redis connected and active.");
      });

      client.on("error", (err) => {
        if (this.redisReady) {
          console.warn("[Cache] Redis error, falling back to in-memory LRU:", err.message);
        }
        this.redisReady = false;
      });

      client.on("close", () => {
        this.redisReady = false;
      });

      this.redis = client;
      client.connect().catch(() => {
        this.redisReady = false;
      });
    } catch {
      this.redis = null;
      this.redisReady = false;
    }
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    // Refresh LRU recency
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxEntries) {
      // Evict least-recently-used entry
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { data, expiresAt });
  }

  async getAsync<T>(key: string): Promise<T | null> {
    const local = this.get<T>(key);
    if (local !== null) return local;

    if (this.redis && this.redisReady) {
      try {
        const raw = await this.redis.get(`${KEY_PREFIX}${key}`);
        if (raw) {
          const parsed = JSON.parse(raw) as T;
          this.set(key, parsed, 30); // Short L1 memory warm-up
          return parsed;
        }
      } catch {
        // Fallback silently to L1/DB
      }
    }
    return null;
  }

  async setAsync<T>(key: string, data: T, ttlSeconds: number = 300): Promise<void> {
    this.set(key, data, ttlSeconds);
    if (this.redis && this.redisReady) {
      try {
        await this.redis.set(`${KEY_PREFIX}${key}`, JSON.stringify(data), "EX", ttlSeconds);
      } catch {
        // Fallback silently
      }
    }
  }

  async getOrSet<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
    const cached = await this.getAsync<T>(key);
    if (cached !== null) return cached;
    const fresh = await fetcher();
    await this.setAsync(key, fresh, ttlSeconds);
    return fresh;
  }

  invalidate(prefix?: string): void {
    if (!prefix) {
      this.cache.clear();
    } else {
      Array.from(this.cache.keys()).forEach((key) => {
        if (key.startsWith(prefix)) {
          this.cache.delete(key);
        }
      });
    }

    if (this.redis && this.redisReady) {
      this.invalidateRedisPrefix(prefix || "").catch(() => {});
    }
  }

  private async invalidateRedisPrefix(prefix: string): Promise<void> {
    if (!this.redis || !this.redisReady) return;
    const pattern = `${KEY_PREFIX}${prefix}*`;
    let cursor = "0";
    do {
      const [nextCursor, keys] = await this.redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } while (cursor !== "0");
  }

  getStats() {
    return {
      backend: this.redisReady ? "redis+memory" : "memory-lru",
      size: this.cache.size,
      maxEntries: this.maxEntries,
      keys: Array.from(this.cache.keys()),
    };
  }

  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit().catch(() => {});
      this.redis = null;
      this.redisReady = false;
    }
  }
}

export const enterpriseCache = new EnterpriseCache();
