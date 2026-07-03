export interface LocationParts {
    country?: string;
    state?: string;
    city?: string;
    area?: string;
    location?: string;
}
export interface BuiltLocationQuery {
    locationString: string;
    searchQuery: string;
    segments: string[];
}
export declare function buildLocationSegments(parts: LocationParts): string[];
export declare function buildLocationString(parts: LocationParts): string;
export declare function buildMapsSearchQuery(keyword: string, parts: LocationParts): BuiltLocationQuery;
export declare function countryRequiresState(_country?: string): boolean;
//# sourceMappingURL=location-query-builder.d.ts.map