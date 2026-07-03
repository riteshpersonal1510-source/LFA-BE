"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INDIA_COUNTRY_NAMES = exports.ALL_SOURCES = exports.INTERNATIONAL_SOURCES = exports.INDIA_SOURCES = void 0;
exports.isIndiaCountry = isIndiaCountry;
exports.getSourcesForCountry = getSourcesForCountry;
exports.validateSources = validateSources;
exports.INDIA_SOURCES = ['google-maps', 'justdial', 'indiamart', 'clutch'];
exports.INTERNATIONAL_SOURCES = ['google-maps', 'clutch', 'official-website'];
exports.ALL_SOURCES = [...new Set([...exports.INDIA_SOURCES, ...exports.INTERNATIONAL_SOURCES])];
exports.INDIA_COUNTRY_NAMES = ['india', 'in', 'bharat'];
function isIndiaCountry(country) {
    if (!country)
        return true;
    const lower = country.toLowerCase().trim();
    return exports.INDIA_COUNTRY_NAMES.includes(lower);
}
function getSourcesForCountry(country) {
    if (isIndiaCountry(country)) {
        return [...exports.INDIA_SOURCES];
    }
    return [...exports.INTERNATIONAL_SOURCES];
}
function validateSources(sources, country) {
    if (!sources || sources.length === 0) {
        return getSourcesForCountry(country);
    }
    const validSources = getSourcesForCountry(country);
    const filtered = sources.filter(s => validSources.includes(s));
    if (filtered.length === 0) {
        return getSourcesForCountry(country);
    }
    return filtered;
}
//# sourceMappingURL=source-router.js.map