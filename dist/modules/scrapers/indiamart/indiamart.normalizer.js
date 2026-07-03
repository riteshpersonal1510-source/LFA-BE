"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePhone = normalizePhone;
exports.normalizeWebsite = normalizeWebsite;
exports.normalizeAddress = normalizeAddress;
exports.extractLocationParts = extractLocationParts;
exports.enrichToScraperLead = enrichToScraperLead;
exports.computeLeadScore = computeLeadScore;
const INDIAN_STATES = new Set([
    'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh',
    'goa', 'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka',
    'kerala', 'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram',
    'nagaland', 'odisha', 'punjab', 'rajasthan', 'sikkim', 'tamil nadu',
    'telangana', 'tripura', 'uttar pradesh', 'uttarakhand', 'west bengal',
    'delhi', 'chandigarh', 'puducherry', 'ladakh', 'jammu and kashmir',
    'andaman and nicobar', 'dadra and nagar haveli and daman and diu',
    'lakshadweep',
]);
function normalizePhone(raw) {
    let cleaned = raw.replace(/[\s\-().]/g, '');
    cleaned = cleaned.replace(/^(?:\+?91)?(\d{10})$/, (_, d) => d);
    let digits = cleaned.replace(/[^\d]/g, '');
    if (digits.length === 12 && digits.startsWith('91'))
        digits = digits.slice(2);
    else if (digits.length === 13 && digits.startsWith('91'))
        digits = digits.slice(3);
    else if (digits.length === 11 && digits.startsWith('0'))
        digits = digits.slice(1);
    return digits.length === 10 ? digits : cleaned;
}
function normalizeWebsite(url) {
    if (!url || url.trim().length === 0)
        return undefined;
    let normalized = url.trim();
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
        normalized = `https://${normalized}`;
    }
    try {
        const parsed = new URL(normalized);
        parsed.hash = '';
        const result = parsed.toString().replace(/\/$/, '');
        return result.toLowerCase();
    }
    catch {
        return normalized.toLowerCase();
    }
}
function normalizeAddress(raw) {
    if (!raw)
        return '';
    let normalized = raw.trim();
    normalized = normalized.replace(/\s+/g, ' ');
    normalized = normalized.replace(/,\s*,/g, ',');
    normalized = normalized.replace(/^[,.\s]+|[,.\s]+$/g, '');
    return normalized;
}
function extractLocationParts(address) {
    if (!address)
        return {};
    const pincodeMatch = address.match(/\b(\d{6})\b/);
    const pincode = pincodeMatch ? pincodeMatch[1] : undefined;
    let city;
    let state;
    const parts = address.split(',').map(s => s.trim()).filter(Boolean);
    for (const part of parts) {
        const lower = part.toLowerCase();
        if (!state) {
            for (const s of INDIAN_STATES) {
                if (lower.includes(s)) {
                    state = capitalizeState(s);
                    break;
                }
            }
        }
    }
    for (const part of parts) {
        const lower = part.toLowerCase();
        const isState = Array.from(INDIAN_STATES).some(s => lower.includes(s));
        const isPincode = /\b\d{6}\b/.test(part);
        const isNumeric = /^\d+$/.test(part.replace(/\s/g, ''));
        if (!isState && !isPincode && !isNumeric && part.length <= 30 && !city) {
            city = part;
        }
    }
    return { city, state, pincode };
}
function capitalizeState(state) {
    return state.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
function enrichToScraperLead(enriched, context) {
    const phone = enriched.phone ? normalizePhone(enriched.phone) : undefined;
    const website = enriched.website ? normalizeWebsite(enriched.website) : undefined;
    const fallbackCity = enriched.city || context.city || '';
    const fallbackState = enriched.state || context.state || '';
    return {
        companyName: enriched.companyName,
        phone,
        website,
        email: enriched.email,
        address: normalizeAddress(enriched.address || ''),
        category: enriched.category || '',
        source: 'indiamart',
        sourceUrl: enriched.profileUrl,
        city: fallbackCity,
        state: fallbackState,
        area: context.area || '',
        businessType: context.businessType,
        fullSearchQuery: `${context.businessType} ${context.location}`.trim(),
        gst: enriched.gst,
        products: enriched.products?.join(', '),
        latitude: enriched.latitude,
        longitude: enriched.longitude,
        pincode: enriched.pincode,
        locationRelevanceScore: 0,
        relevanceScore: 0,
    };
}
function computeLeadScore(lead) {
    let score = 30;
    if (lead.website)
        score += 20;
    if (lead.phone)
        score += 15;
    if (lead.email)
        score += 15;
    if (lead.address)
        score += 5;
    if (lead.category)
        score += 5;
    if (lead.gst)
        score += 5;
    if (lead.products)
        score += 3;
    if (lead.latitude && lead.longitude)
        score += 2;
    return Math.min(score, 100);
}
//# sourceMappingURL=indiamart.normalizer.js.map