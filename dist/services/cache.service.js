"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = exports.CacheService = void 0;
const logger_1 = require("../utils/logger");
class CacheService {
    constructor(maxSize = 1000) {
        this.store = new Map();
        this.hitCount = 0;
        this.missCount = 0;
        this.maxSize = maxSize;
        setInterval(() => this.evictExpired(), 60000);
    }
    get(key) {
        const entry = this.store.get(key);
        if (!entry) {
            this.missCount++;
            return null;
        }
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            this.missCount++;
            return null;
        }
        this.hitCount++;
        return entry.data;
    }
    set(key, data, ttlMs) {
        if (this.store.size >= this.maxSize) {
            const oldestKey = this.store.keys().next().value;
            if (oldestKey)
                this.store.delete(oldestKey);
        }
        this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
    }
    delete(key) {
        this.store.delete(key);
    }
    clear() {
        this.store.clear();
    }
    get stats() {
        const total = this.hitCount + this.missCount;
        const hitRate = total > 0 ? `${((this.hitCount / total) * 100).toFixed(1)}%` : '0%';
        return { size: this.store.size, hits: this.hitCount, misses: this.missCount, hitRate };
    }
    evictExpired() {
        const now = Date.now();
        let evicted = 0;
        for (const [key, entry] of this.store) {
            if (now > entry.expiresAt) {
                this.store.delete(key);
                evicted++;
            }
        }
        if (evicted > 0) {
            logger_1.logger.debug({ evicted, remaining: this.store.size }, 'Cache: Evicted expired entries');
        }
    }
}
exports.CacheService = CacheService;
exports.cacheService = new CacheService();
//# sourceMappingURL=cache.service.js.map