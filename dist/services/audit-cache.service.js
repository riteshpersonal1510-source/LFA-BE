"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditCache = exports.AuditCacheService = void 0;
const logger_1 = require("../utils/logger");
const crypto_1 = __importDefault(require("crypto"));
class AuditCacheService {
    constructor() {
        this.cache = new Map();
        this.DEFAULT_TTL_MS = 5 * 60 * 1000;
        this.cleanupTimer = null;
        this.startCleanup();
    }
    static getInstance() {
        if (!AuditCacheService.instance) {
            AuditCacheService.instance = new AuditCacheService();
        }
        return AuditCacheService.instance;
    }
    hashWebsite(website) {
        return crypto_1.default.createHash('sha256').update(website.toLowerCase().trim()).digest('hex').substring(0, 16);
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        if (Date.now() - entry.timestamp > this.DEFAULT_TTL_MS) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }
    set(key, data, website) {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            websiteHash: website ? this.hashWebsite(website) : '',
        });
    }
    getByWebsiteHash(key, website) {
        const entry = this.cache.get(key);
        if (!entry)
            return { data: null, isCached: false };
        if (Date.now() - entry.timestamp > this.DEFAULT_TTL_MS) {
            this.cache.delete(key);
            return { data: null, isCached: false };
        }
        const currentHash = this.hashWebsite(website);
        if (entry.websiteHash !== currentHash) {
            this.cache.delete(key);
            return { data: null, isCached: false };
        }
        return { data: entry.data, isCached: true };
    }
    invalidate(key) {
        this.cache.delete(key);
    }
    clear() {
        this.cache.clear();
    }
    startCleanup() {
        this.cleanupTimer = setInterval(() => {
            const now = Date.now();
            let removed = 0;
            for (const [key, entry] of this.cache.entries()) {
                if (now - entry.timestamp > this.DEFAULT_TTL_MS) {
                    this.cache.delete(key);
                    removed++;
                }
            }
            if (removed > 0) {
                logger_1.logger.debug({ removed }, 'AuditCache: Cleaned up expired entries');
            }
        }, 60000);
    }
    stopCleanup() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }
    size() {
        return this.cache.size;
    }
}
exports.AuditCacheService = AuditCacheService;
exports.auditCache = AuditCacheService.getInstance();
//# sourceMappingURL=audit-cache.service.js.map