"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COUNTRY_NAMES = exports.COUNTRY_TLD_MAP = void 0;
exports.getTld = getTld;
exports.getCountryName = getCountryName;
exports.buildSearchQuery = buildSearchQuery;
exports.buildFallbackQueries = buildFallbackQueries;
exports.buildBaseMapsUrl = buildBaseMapsUrl;
exports.COUNTRY_TLD_MAP = {
    india: 'co.in',
    usa: 'com',
    'united states': 'com',
    'united states of america': 'com',
    canada: 'ca',
    uk: 'co.uk',
    'united kingdom': 'co.uk',
    australia: 'com.au',
    singapore: 'com.sg',
    japan: 'co.jp',
    germany: 'de',
    france: 'fr',
    uae: 'ae',
    'united arab emirates': 'ae',
    dubai: 'ae',
};
exports.COUNTRY_NAMES = {
    india: 'India',
    usa: 'USA',
    'united states': 'USA',
    'united states of america': 'USA',
    canada: 'Canada',
    uk: 'UK',
    'united kingdom': 'UK',
    australia: 'Australia',
    singapore: 'Singapore',
    japan: 'Japan',
    germany: 'Germany',
    france: 'France',
    uae: 'UAE',
    'united arab emirates': 'UAE',
    dubai: 'UAE',
};
function normalizeCountry(input) {
    const lower = input.toLowerCase().trim();
    const direct = exports.COUNTRY_NAMES[lower];
    if (direct)
        return lower;
    for (const [key] of Object.entries(exports.COUNTRY_TLD_MAP)) {
        if (lower.includes(key))
            return key;
    }
    return 'usa';
}
function getTld(country) {
    const normalized = normalizeCountry(country);
    return exports.COUNTRY_TLD_MAP[normalized] || 'com';
}
function getCountryName(country) {
    const lower = country.toLowerCase().trim();
    const direct = exports.COUNTRY_NAMES[lower];
    if (direct)
        return direct;
    for (const [key, value] of Object.entries(exports.COUNTRY_NAMES)) {
        if (lower.includes(key) || key.includes(lower)) {
            return value;
        }
    }
    return country;
}
function buildSearchQuery(input, level) {
    const { keyword, area, city, state, country } = input;
    const tld = getTld(country);
    const countryName = getCountryName(country);
    const parts = [keyword];
    let locationParts = [];
    switch (level) {
        case 1:
            if (area)
                locationParts.push(area);
            locationParts.push(city);
            if (state)
                locationParts.push(state);
            locationParts.push(countryName);
            break;
        case 2:
            locationParts.push(city);
            if (state)
                locationParts.push(state);
            locationParts.push(countryName);
            break;
        case 3:
            locationParts.push(city);
            locationParts.push(countryName);
            break;
        case 4:
            locationParts.push(countryName);
            break;
        default:
            locationParts.push(city);
            locationParts.push(countryName);
    }
    if (locationParts.length > 0) {
        parts.push('in');
        parts.push(locationParts.join(' '));
    }
    const query = parts.join(' ');
    const encodedQuery = query.replace(/\s+/g, '+').replace(/\+/g, '+');
    const url = `https://www.google.${tld}/maps/search/${encodeURIComponent(query)}/`;
    return { query, encodedQuery, url, tld };
}
function buildFallbackQueries(input) {
    const levels = [1, 2, 3, 4];
    const areaAvailable = !!input.area;
    const stateAvailable = !!input.state;
    const queries = [];
    for (const level of levels) {
        if (level === 1 && !areaAvailable)
            continue;
        if (level === 2 && !stateAvailable)
            continue;
        queries.push(buildSearchQuery(input, level));
    }
    if (queries.length === 0) {
        queries.push(buildSearchQuery(input, 3));
    }
    return queries;
}
function buildBaseMapsUrl(country) {
    const tld = getTld(country);
    return `https://www.google.${tld}/maps`;
}
//# sourceMappingURL=url-builder.js.map