"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MergeEngine = void 0;
const logger_1 = require("../utils/logger");
const SOURCE_PRIORITY = {
    'official-website': 100,
    'google-maps': 80,
    'clutch': 60,
    'justdial': 40,
    'indiamart': 20,
};
function getPriority(source) {
    return SOURCE_PRIORITY[source] ?? 0;
}
function extractMergeKeys(lead) {
    const keys = [];
    if (lead.placeId) {
        keys.push({ type: 'placeId', value: lead.placeId.toLowerCase().trim() });
    }
    if (lead.sourceUrl && lead.sourceUrl.includes('google.com/maps')) {
        keys.push({ type: 'mapsUrl', value: lead.sourceUrl.toLowerCase().trim() });
    }
    if (lead.website) {
        const domain = lead.website.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '').toLowerCase().trim();
        if (domain) {
            keys.push({ type: 'website', value: domain });
        }
    }
    if (lead.companyName) {
        const normalized = lead.companyName.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
        if (normalized.length > 2) {
            keys.push({ type: 'businessName', value: normalized });
        }
    }
    if (lead.phone) {
        const cleaned = lead.phone.replace(/[^\d]/g, '');
        if (cleaned.length >= 10) {
            keys.push({ type: 'phone', value: cleaned });
        }
    }
    if (lead.companyName && lead.address) {
        const name = lead.companyName.toLowerCase().replace(/\s+/g, '');
        const addr = lead.address.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 30);
        if (name.length > 2 && addr.length > 5) {
            keys.push({ type: 'nameAddress', value: `${name}|${addr}` });
        }
    }
    return keys;
}
function mergeField(existing, incoming, existingPriority, incomingPriority) {
    if (incoming === undefined || incoming === null)
        return existing;
    if (existing === undefined || existing === null)
        return incoming;
    if (incomingPriority > existingPriority)
        return incoming;
    return existing;
}
class MergeEngine {
    constructor() {
        this.KEY_SIMILARITY_THRESHOLD = 0.6;
    }
    merge(leads) {
        if (leads.length === 0)
            return [];
        const groups = this.cluster(leads);
        const merged = groups.map(group => this.mergeGroup(group));
        logger_1.logger.info({
            input: leads.length,
            groups: groups.length,
            merged: merged.length,
        }, 'MergeEngine: Merge completed');
        return merged;
    }
    cluster(leads) {
        const groups = [];
        const assigned = new Set();
        for (let i = 0; i < leads.length; i++) {
            if (assigned.has(i))
                continue;
            const group = [leads[i]];
            assigned.add(i);
            const iKeys = extractMergeKeys(leads[i]);
            for (let j = i + 1; j < leads.length; j++) {
                if (assigned.has(j))
                    continue;
                const jKeys = extractMergeKeys(leads[j]);
                if (this.keysMatch(iKeys, jKeys)) {
                    group.push(leads[j]);
                    assigned.add(j);
                }
            }
            if (group.length > 1) {
                logger_1.logger.debug({
                    base: group[0].companyName,
                    merged: group.slice(1).map(l => l.companyName),
                    keys: iKeys.map(k => k.type).join(','),
                }, 'MergeEngine: Cluster created');
            }
            groups.push(group);
        }
        return groups;
    }
    keysMatch(a, b) {
        for (const ka of a) {
            for (const kb of b) {
                if (ka.type !== kb.type)
                    continue;
                if (ka.type === 'placeId' || ka.type === 'mapsUrl') {
                    if (ka.value === kb.value)
                        return true;
                }
                if (ka.type === 'website') {
                    if (ka.value === kb.value)
                        return true;
                }
                if (ka.type === 'businessName') {
                    if (ka.value === kb.value)
                        return true;
                    if (this.stringSimilarity(ka.value, kb.value) > this.KEY_SIMILARITY_THRESHOLD)
                        return true;
                }
                if (ka.type === 'phone') {
                    const aPhone = ka.value.replace(/^91/, '');
                    const bPhone = kb.value.replace(/^91/, '');
                    if (aPhone === bPhone || aPhone.endsWith(bPhone) || bPhone.endsWith(aPhone))
                        return true;
                }
                if (ka.type === 'nameAddress') {
                    if (ka.value === kb.value)
                        return true;
                }
            }
        }
        return false;
    }
    stringSimilarity(a, b) {
        if (a === b)
            return 1;
        if (a.length < 3 || b.length < 3)
            return 0;
        const longer = a.length > b.length ? a : b;
        const shorter = a.length > b.length ? b : a;
        if (longer.includes(shorter))
            return 0.8;
        const editDist = this.levenshteinDistance(a, b);
        return 1 - editDist / longer.length;
    }
    levenshteinDistance(a, b) {
        const matrix = [];
        for (let i = 0; i <= b.length; i++)
            matrix[i] = [i];
        for (let j = 0; j <= a.length; j++)
            matrix[0][j] = j;
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                const cost = a[j - 1] === b[i - 1] ? 0 : 1;
                matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
            }
        }
        return matrix[b.length][a.length];
    }
    mergeGroup(group) {
        const sorted = [...group].sort((a, b) => getPriority(b.source) - getPriority(a.source));
        const primary = sorted[0];
        const mergedSources = [...new Set(group.map(l => l.source))];
        const basePriority = getPriority(primary.source);
        const merged = {
            ...primary,
            sources: mergedSources,
            mergedSources,
            mergedAt: new Date().toISOString(),
        };
        for (const lead of sorted.slice(1)) {
            const incomingPriority = getPriority(lead.source);
            merged.website = mergeField(merged.website, lead.website, basePriority, incomingPriority);
            merged.phone = mergeField(merged.phone, lead.phone, basePriority, incomingPriority);
            merged.email = mergeField(merged.email, lead.email, basePriority, incomingPriority);
            merged.address = mergeField(merged.address, lead.address, basePriority, incomingPriority);
            merged.category = mergeField(merged.category, lead.category, basePriority, incomingPriority);
            merged.rating = mergeField(merged.rating, lead.rating, basePriority, incomingPriority);
            merged.reviewsCount = mergeField(merged.reviewsCount, lead.reviewsCount, basePriority, incomingPriority);
            merged.sourceUrl = mergeField(merged.sourceUrl, lead.sourceUrl, basePriority, incomingPriority);
            if (merged.rating === undefined && lead.rating !== undefined)
                merged.rating = lead.rating;
            if (merged.reviewsCount === undefined && lead.reviewsCount !== undefined)
                merged.reviewsCount = lead.reviewsCount;
            if (!merged.placeId && lead.placeId)
                merged.placeId = lead.placeId;
        }
        merged.leadScore = this.calculateScore(merged);
        return merged;
    }
    calculateScore(lead) {
        let score = 0;
        if (lead.website)
            score += 20;
        if (lead.phone)
            score += 15;
        if (lead.email)
            score += 15;
        if (lead.address)
            score += 10;
        if (lead.category)
            score += 5;
        if (lead.rating && lead.rating > 0)
            score += 5;
        if (lead.reviewsCount && lead.reviewsCount > 0)
            score += 5;
        if (lead.mergedSources && lead.mergedSources.length > 1)
            score += 10;
        if (lead.mergedSources && lead.mergedSources.length > 2)
            score += 5;
        return Math.min(score, 100);
    }
}
exports.MergeEngine = MergeEngine;
//# sourceMappingURL=merge-engine.js.map