"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jaccardSimilarity = jaccardSimilarity;
exports.nameSimilarity = nameSimilarity;
exports.detectDuplicate = detectDuplicate;
exports.mergeLeads = mergeLeads;
exports.duplicateConfidenceLabel = duplicateConfidenceLabel;
function normalizeName(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}
function nameWords(name) {
    return normalizeName(name).split(' ').filter(w => w.length > 1);
}
function removeCommonWords(words) {
    const common = new Set(['the', 'and', 'for', 'ltd', 'pvt', 'llp', 'inc', 'co', 'shop', 'store', 'services', 'solutions', 'enterprise', 'enterprises', 'trading', 'company', 'agency', 'house', 'group', 'associates', 'brothers', 'sons']);
    return words.filter(w => !common.has(w));
}
function jaccardSimilarity(a, b) {
    const setA = new Set(a);
    const setB = new Set(b);
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return union.size === 0 ? 0 : intersection.size / union.size;
}
function nameSimilarity(name1, name2) {
    const words1 = removeCommonWords(nameWords(name1));
    const words2 = removeCommonWords(nameWords(name2));
    if (words1.length === 0 && words2.length === 0)
        return 1;
    if (words1.length === 0 || words2.length === 0)
        return 0;
    const exactMatch = words1.length === words2.length && words1.every((w, i) => w === words2[i]);
    if (exactMatch)
        return 1;
    let fuzzyScore = jaccardSimilarity(words1, words2);
    if (fuzzyScore > 0) {
        const initials1 = words1.map(w => w[0]).join('');
        const initials2 = words2.map(w => w[0]).join('');
        if (initials1 === initials2 && initials1.length >= 2) {
            fuzzyScore = Math.max(fuzzyScore, 0.7);
        }
    }
    return fuzzyScore;
}
function detectDuplicate(lead, existing) {
    const matchedOn = [];
    let totalConfidence = 0;
    const weights = [];
    if (lead.phone && existing.phone) {
        const leadPhone = lead.phone.replace(/[\s\-\(\)\+\.]/g, '').replace(/^(91)/, '');
        const existingPhone = existing.phone.replace(/[\s\-\(\)\+\.]/g, '').replace(/^(91)/, '');
        if (leadPhone === existingPhone && leadPhone.length >= 10) {
            matchedOn.push('phone');
            weights.push({ score: 1, weight: 0.4 });
        }
    }
    if (lead.website && existing.website) {
        const leadSite = lead.website.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '').toLowerCase();
        const existingSite = existing.website.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '').toLowerCase();
        if (leadSite === existingSite && leadSite.length > 3) {
            matchedOn.push('website');
            weights.push({ score: 1, weight: 0.35 });
        }
    }
    if (lead.companyName && existing.companyName) {
        const sim = nameSimilarity(lead.companyName, existing.companyName);
        if (sim >= 0.8) {
            matchedOn.push('business_name');
            weights.push({ score: sim, weight: 0.35 });
        }
        else if (sim >= 0.5) {
            matchedOn.push('business_name');
            weights.push({ score: sim, weight: 0.2 });
        }
    }
    if (lead.address && existing.address) {
        const addrSim = nameSimilarity(lead.address.substring(0, 50), existing.address.substring(0, 50));
        if (addrSim >= 0.7) {
            matchedOn.push('address');
            weights.push({ score: addrSim, weight: 0.15 });
        }
    }
    if (matchedOn.length === 0) {
        return { isDuplicate: false, confidence: 0, matchedOn: [] };
    }
    for (const w of weights) {
        totalConfidence += w.score * w.weight;
    }
    const confidence = Math.min(totalConfidence / Math.min(weights.reduce((s, w) => s + w.weight, 0), 1), 1);
    return {
        isDuplicate: confidence >= 0.5,
        confidence,
        matchedOn,
    };
}
function mergeLeads(incoming, existing, priorityFields) {
    const mergedFields = [];
    const priority = new Set(priorityFields || ['phone', 'email', 'website', 'address']);
    const result = { ...existing };
    for (const [key, value] of Object.entries(incoming)) {
        if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
            continue;
        }
        const existingValue = existing[key];
        if (existingValue === null || existingValue === undefined || existingValue === '' || (Array.isArray(existingValue) && existingValue.length === 0)) {
            result[key] = value;
            if (key !== '_id' && key !== '__v') {
                mergedFields.push(key);
            }
        }
        else if (priority.has(key) && typeof value === 'string' && typeof existingValue === 'string') {
            const incomingClean = value.trim().toLowerCase();
            const existingClean = existingValue.trim().toLowerCase();
            if (incomingClean.length > existingClean.length) {
                result[key] = value;
                mergedFields.push(key);
            }
        }
    }
    return {
        merged: mergedFields.length > 0,
        source: incoming,
        target: existing,
        mergedFields,
    };
}
function duplicateConfidenceLabel(score) {
    if (score >= 0.9)
        return 'certain';
    if (score >= 0.7)
        return 'high';
    if (score >= 0.5)
        return 'probable';
    return 'low';
}
//# sourceMappingURL=dedup-engine.js.map