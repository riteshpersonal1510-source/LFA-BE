export declare const COUNTRY_TLD_MAP: Record<string, string>;
export declare const COUNTRY_NAMES: Record<string, string>;
export interface NavigationInput {
    keyword: string;
    area?: string;
    city: string;
    state?: string;
    country: string;
}
export interface BuiltQuery {
    query: string;
    encodedQuery: string;
    url: string;
    tld: string;
}
export declare function getTld(country: string): string;
export declare function getCountryName(country: string): string;
export declare function buildSearchQuery(input: NavigationInput, level: number): BuiltQuery;
export declare function buildFallbackQueries(input: NavigationInput): BuiltQuery[];
export declare function buildBaseMapsUrl(country: string): string;
//# sourceMappingURL=url-builder.d.ts.map