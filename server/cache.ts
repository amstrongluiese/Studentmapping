interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class EnterpriseCache {
  private cache = new Map<string, CacheEntry<any>>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { data, expiresAt });
  }

  invalidate(prefix?: string): void {
    if (!prefix) {
      this.cache.clear();
      return;
    }
    this.cache.forEach((_, key) => {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    });
  }

  getStats() {
    const keys: string[] = [];
    this.cache.forEach((_, k) => keys.push(k));
    return {
      size: this.cache.size,
      keys,
    };
  }
}

export const enterpriseCache = new EnterpriseCache();
