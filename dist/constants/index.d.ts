export * from './analysis';
export declare const APP_NAME = "Lead Finder Agent";
export declare const API_PREFIX = "/api/v1";
export declare const PAGINATION_DEFAULT: {
    page: number;
    limit: number;
    maxLimit: number;
};
export declare const LEAD_SOURCES: readonly ["google-maps", "justdial", "indiamart", "clutch", "linkedin", "directory", "website", "manual"];
export type LeadSource = typeof LEAD_SOURCES[number];
export declare const EXTRACTION_SOURCES: readonly ["google-maps", "justdial", "indiamart", "clutch"];
export type ExtractionSource = typeof EXTRACTION_SOURCES[number];
export declare const EXTRACTION_STATUSES: readonly ["success", "partial", "failed"];
export type ExtractionStatus = typeof EXTRACTION_STATUSES[number];
//# sourceMappingURL=index.d.ts.map