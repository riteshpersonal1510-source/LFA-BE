interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  hits: number;
}

export class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private defaultTTLMs = 5000) {
    this.cleanupTimer = setInterval(() => this.evictExpired(), 30000);
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    entry.hits++;
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTTLMs),
      hits: 0,
    });
  }

  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  deleteByPrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }

  getStats(): { size: number; entries: Array<{ key: string; hits: number; ttlRemainingMs: number }> } {
    const now = Date.now();
    const entries: Array<{ key: string; hits: number; ttlRemainingMs: number }> = [];
    for (const [key, entry] of this.store) {
      const remaining = entry.expiresAt - now;
      if (remaining > 0) {
        entries.push({ key, hits: entry.hits, ttlRemainingMs: remaining });
      }
    }
    return { size: entries.length, entries };
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.store.clear();
  }
}

export const queryCache = new MemoryCache(3000);
export const locationCache = new MemoryCache(60000);
