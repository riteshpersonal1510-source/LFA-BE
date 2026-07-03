"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildLocationSegments = buildLocationSegments;
exports.buildLocationString = buildLocationString;
exports.buildMapsSearchQuery = buildMapsSearchQuery;
exports.countryRequiresState = countryRequiresState;
function cleanPart(value) {
    return (value || '').trim();
}
function buildLocationSegments(parts) {
    const segments = [];
    const area = cleanPart(parts.area);
    const city = cleanPart(parts.city);
    const state = cleanPart(parts.state);
    const country = cleanPart(parts.country);
    const fallback = cleanPart(parts.location);
    if (area)
        segments.push(area);
    if (city)
        segments.push(city);
    if (state)
        segments.push(state);
    if (country)
        segments.push(country);
    if (segments.length === 0 && fallback) {
        return fallback.split(',').map(s => s.trim()).filter(Boolean);
    }
    return segments;
}
function buildLocationString(parts) {
    return buildLocationSegments(parts).join(', ');
}
function buildMapsSearchQuery(keyword, parts) {
    const businessType = cleanPart(keyword);
    const segments = buildLocationSegments(parts);
    const locationString = segments.join(', ');
    if (!businessType) {
        return { locationString, searchQuery: locationString, segments };
    }
    const searchQuery = locationString
        ? `${businessType} in ${locationString}`
        : businessType;
    return { locationString, searchQuery, segments };
}
function countryRequiresState(_country) {
    return false;
}
//# sourceMappingURL=location-query-builder.js.map