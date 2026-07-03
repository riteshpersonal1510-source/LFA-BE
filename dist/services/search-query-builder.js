"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchQueryBuilder = exports.SearchQueryBuilder = void 0;
const location_query_builder_1 = require("../utils/location-query-builder");
class SearchQueryBuilder {
    build(input) {
        const { businessType, state, city, area, country, sources } = input;
        const queries = [];
        const locationParts = { area, city, state, country };
        for (const source of sources) {
            switch (source) {
                case 'google-maps': {
                    const { searchQuery } = (0, location_query_builder_1.buildMapsSearchQuery)(businessType, locationParts);
                    queries.push({
                        source: 'google-maps',
                        query: searchQuery,
                        url: `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`,
                        fullSearchQuery: searchQuery,
                    });
                    break;
                }
                case 'justdial': {
                    const citySlug = city ? city.toLowerCase().replace(/\s+/g, '-') : 'india';
                    const areaSlug = area ? area.toLowerCase().replace(/\s+/g, '-') : '';
                    const businessSlug = businessType.toLowerCase().replace(/\s+/g, '-');
                    const query = area
                        ? `${businessType} in ${area} ${city}`
                        : city
                            ? `${businessType} in ${city}`
                            : businessType;
                    const url = area
                        ? `https://www.justdial.com/${citySlug}/${businessSlug}-in-${areaSlug}`
                        : `https://www.justdial.com/${citySlug}/${businessSlug}`;
                    queries.push({
                        source: 'justdial',
                        query,
                        url,
                        fullSearchQuery: query,
                    });
                    break;
                }
                case 'indiamart': {
                    const query = area
                        ? `${businessType} ${area} ${city}`
                        : city
                            ? `${businessType} ${city}`
                            : businessType;
                    queries.push({
                        source: 'indiamart',
                        query,
                        url: `https://dir.indiamart.com/search.mp?ss=${encodeURIComponent(query)}`,
                        fullSearchQuery: query,
                    });
                    break;
                }
                case 'clutch': {
                    const query = `${businessType} ${city || ''} ${state || ''}`.trim();
                    queries.push({
                        source: 'clutch',
                        query,
                        url: `https://clutch.co/search?q=${encodeURIComponent(query)}`,
                        fullSearchQuery: query,
                    });
                    break;
                }
            }
        }
        return queries;
    }
    buildMultiQuery(input) {
        const { keywords, state, city, area, country, sources } = input;
        const allQueries = [];
        for (const keyword of keywords) {
            const keywordQueries = this.build({
                businessType: keyword,
                state,
                city,
                area,
                country,
                sources,
            });
            for (const q of keywordQueries) {
                allQueries.push({
                    ...q,
                    semanticKeyword: keyword,
                    isSemanticExpansion: true,
                });
            }
        }
        return allQueries;
    }
}
exports.SearchQueryBuilder = SearchQueryBuilder;
exports.searchQueryBuilder = new SearchQueryBuilder();
//# sourceMappingURL=search-query-builder.js.map