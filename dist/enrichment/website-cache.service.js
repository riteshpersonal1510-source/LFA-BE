"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.websiteCache = exports.WebsiteCache = void 0;
class WebsiteCache {
    constructor() {
        this.cache = new Map();
        this.maxEntries = 5000;
        this.defaultTtl = 24 * 60 * 60 * 1000;
    }
    get(domain) {
        const normalized = this.normalizeDomain(domain);
        const entry = this.cache.get(normalized);
        if (!entry)
            return null;
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(normalized);
            return null;
        }
        return entry.data;
    }
    set(domain, data, ttl) {
        const normalized = this.normalizeDomain(domain);
        if (this.cache.size >= this.maxEntries) {
            const oldest = this.cache.entries().next().value;
            if (oldest)
                this.cache.delete(oldest[0]);
        }
        this.cache.set(normalized, {
            domain: normalized,
            data,
            timestamp: Date.now(),
            ttl: ttl || this.defaultTtl,
        });
    }
    has(domain) {
        return this.get(domain) !== null;
    }
    invalidate(domain) {
        const normalized = this.normalizeDomain(domain);
        this.cache.delete(normalized);
    }
    clear() {
        this.cache.clear();
    }
    get size() {
        return this.cache.size;
    }
    get stats() {
        return {
            size: this.cache.size,
            maxEntries: this.maxEntries,
            defaultTtl: this.defaultTtl,
        };
    }
    normalizeDomain(url) {
        let domain = url.toLowerCase().trim();
        domain = domain.replace(/^https?:\/\//, '');
        domain = domain.replace(/\/.*$/, '');
        domain = domain.replace(/^www\./, '');
        return domain;
    }
}
exports.WebsiteCache = WebsiteCache;
exports.websiteCache = new WebsiteCache();
//# sourceMappingURL=website-cache.service.js.map