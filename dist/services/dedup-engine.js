"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dedupEngine = exports.DedupEngine = void 0;
const logger_1 = require("../utils/logger");
class DedupEngine {
    constructor() {
        this.SIMILARITY_THRESHOLD = 0.75;
    }
    normalizeCompanyName(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\b(pvt|ltd|private|limited|inc|corp|corporation|llc|llp|co|company|enterprises|enterprise|services|service|solutions|solution|technologies|technology|industries|industry|group|and|&|the)\b/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    levenshteinDistance(a, b) {
        const matrix = [];
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                }
                else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
                }
            }
        }
        return matrix[b.length][a.length];
    }
    similarity(a, b) {
        if (!a || !b)
            return 0;
        const normA = this.normalizeCompanyName(a);
        const normB = this.normalizeCompanyName(b);
        if (normA === normB)
            return 1;
        if (normA.includes(normB) || normB.includes(normA))
            return 0.85;
        const distance = this.levenshteinDistance(normA, normB);
        const maxLen = Math.max(normA.length, normB.length);
        if (maxLen === 0)
            return 1;
        return 1 - distance / maxLen;
    }
    normalizePhone(phone) {
        return phone.replace(/[^0-9]/g, '').replace(/^(\+?91|0)?/, '');
    }
    normalizeAddress(address) {
        return address
            .toLowerCase()
            .replace(/[^a-z0-9\s,.-]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    isDuplicate(newLead, existingLeads) {
        for (const existing of existingLeads) {
            if (!existing)
                continue;
            const nameResult = this.compareByName(newLead, existing);
            if (nameResult.duplicate)
                return nameResult;
            const phoneResult = this.compareByPhone(newLead, existing);
            if (phoneResult.duplicate)
                return phoneResult;
            const websiteResult = this.compareByWebsite(newLead, existing);
            if (websiteResult.duplicate)
                return websiteResult;
            const addressResult = this.compareByAddress(newLead, existing);
            if (addressResult.duplicate)
                return addressResult;
        }
        return { duplicate: false, matchedField: '', matchType: 'exact', confidence: 0 };
    }
    compareByName(a, b) {
        if (!a.companyName || !b.companyName) {
            return { duplicate: false, matchedField: '', matchType: 'exact', confidence: 0 };
        }
        const sim = this.similarity(a.companyName, b.companyName);
        if (sim >= this.SIMILARITY_THRESHOLD) {
            return {
                duplicate: true,
                matchedField: 'companyName',
                matchType: sim >= 0.95 ? 'exact' : 'fuzzy',
                confidence: sim,
                matchedWith: b.id || b.companyName,
            };
        }
        return { duplicate: false, matchedField: '', matchType: 'exact', confidence: 0 };
    }
    compareByPhone(a, b) {
        if (!a.phone || !b.phone) {
            return { duplicate: false, matchedField: '', matchType: 'exact', confidence: 0 };
        }
        const phoneA = this.normalizePhone(a.phone);
        const phoneB = this.normalizePhone(b.phone);
        if (!phoneA || !phoneB || phoneA.length < 8 || phoneB.length < 8) {
            return { duplicate: false, matchedField: '', matchType: 'exact', confidence: 0 };
        }
        if (phoneA === phoneB) {
            return {
                duplicate: true,
                matchedField: 'phone',
                matchType: 'phone',
                confidence: 0.98,
                matchedWith: b.id || b.companyName,
            };
        }
        if (phoneA.includes(phoneB) || phoneB.includes(phoneA)) {
            return {
                duplicate: true,
                matchedField: 'phone',
                matchType: 'phone',
                confidence: 0.9,
                matchedWith: b.id || b.companyName,
            };
        }
        return { duplicate: false, matchedField: '', matchType: 'exact', confidence: 0 };
    }
    compareByWebsite(a, b) {
        if (!a.website || !b.website) {
            return { duplicate: false, matchedField: '', matchType: 'exact', confidence: 0 };
        }
        const urlA = a.website.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
        const urlB = b.website.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
        if (urlA === urlB) {
            return {
                duplicate: true,
                matchedField: 'website',
                matchType: 'website',
                confidence: 0.99,
                matchedWith: b.id || b.companyName,
            };
        }
        return { duplicate: false, matchedField: '', matchType: 'exact', confidence: 0 };
    }
    compareByAddress(a, b) {
        if (!a.address || !b.address) {
            return { duplicate: false, matchedField: '', matchType: 'exact', confidence: 0 };
        }
        const addrA = this.normalizeAddress(a.address);
        const addrB = this.normalizeAddress(b.address);
        if (addrA === addrB) {
            return {
                duplicate: true,
                matchedField: 'address',
                matchType: 'exact',
                confidence: 0.9,
                matchedWith: b.id || b.companyName,
            };
        }
        if (addrA.includes(addrB) || addrB.includes(addrA)) {
            return {
                duplicate: true,
                matchedField: 'address',
                matchType: 'fuzzy',
                confidence: 0.7,
                matchedWith: b.id || b.companyName,
            };
        }
        return { duplicate: false, matchedField: '', matchType: 'exact', confidence: 0 };
    }
    deduplicate(leads) {
        const unique = [];
        const duplicates = [];
        let fuzzyMatches = 0;
        let exactMatches = 0;
        for (const lead of leads) {
            const result = this.isDuplicate(lead, unique);
            if (result.duplicate) {
                duplicates.push(lead);
                if (result.matchType === 'fuzzy')
                    fuzzyMatches++;
                else
                    exactMatches++;
            }
            else {
                unique.push(lead);
            }
        }
        logger_1.logger.info({
            action: 'dedup_completed',
            totalProcessed: leads.length,
            duplicatesFound: duplicates.length,
            uniqueLeads: unique.length,
            fuzzyMatches,
            exactMatches,
        }, 'DedupEngine: Deduplication completed');
        return {
            unique,
            duplicates,
            report: {
                totalProcessed: leads.length,
                duplicatesFound: duplicates.length,
                uniqueLeads: unique.length,
                fuzzyMatches,
                exactMatches,
            },
        };
    }
}
exports.DedupEngine = DedupEngine;
exports.dedupEngine = new DedupEngine();
//# sourceMappingURL=dedup-engine.js.map