"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.locationCache = exports.queryCache = exports.MemoryCache = void 0;
class MemoryCache {
    constructor(defaultTTLMs = 5000) {
        this.defaultTTLMs = defaultTTLMs;
        this.store = new Map();
        this.cleanupTimer = null;
        this.cleanupTimer = setInterval(() => this.evictExpired(), 30000);
    }
    get(key) {
        const entry = this.store.get(key);
        if (!entry)
            return undefined;
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return undefined;
        }
        entry.hits++;
        return entry.value;
    }
    set(key, value, ttlMs) {
        this.store.set(key, {
            value,
            expiresAt: Date.now() + (ttlMs ?? this.defaultTTLMs),
            hits: 0,
        });
    }
    has(key) {
        const entry = this.store.get(key);
        if (!entry)
            return false;
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return false;
        }
        return true;
    }
    delete(key) {
        this.store.delete(key);
    }
    deleteByPrefix(prefix) {
        for (const key of this.store.keys()) {
            if (key.startsWith(prefix)) {
                this.store.delete(key);
            }
        }
    }
    clear() {
        this.store.clear();
    }
    get size() {
        return this.store.size;
    }
    getStats() {
        const now = Date.now();
        const entries = [];
        for (const [key, entry] of this.store) {
            const remaining = entry.expiresAt - now;
            if (remaining > 0) {
                entries.push({ key, hits: entry.hits, ttlRemainingMs: remaining });
            }
        }
        return { size: entries.length, entries };
    }
    evictExpired() {
        const now = Date.now();
        for (const [key, entry] of this.store) {
            if (now > entry.expiresAt) {
                this.store.delete(key);
            }
        }
    }
    shutdown() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        this.store.clear();
    }
}
exports.MemoryCache = MemoryCache;
exports.queryCache = new MemoryCache(3000);
exports.locationCache = new MemoryCache(60000);
//# sourceMappingURL=memory-cache.js.map