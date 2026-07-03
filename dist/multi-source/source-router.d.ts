export declare const INDIA_SOURCES: readonly ["google-maps", "justdial", "indiamart", "clutch"];
export declare const INTERNATIONAL_SOURCES: readonly ["google-maps", "clutch", "official-website"];
export declare const ALL_SOURCES: ("google-maps" | "justdial" | "indiamart" | "clutch" | "official-website")[];
export declare const INDIA_COUNTRY_NAMES: string[];
export declare function isIndiaCountry(country?: string): boolean;
export declare function getSourcesForCountry(country?: string): string[];
export declare function validateSources(sources: string[], country?: string): string[];
//# sourceMappingURL=source-router.d.ts.map