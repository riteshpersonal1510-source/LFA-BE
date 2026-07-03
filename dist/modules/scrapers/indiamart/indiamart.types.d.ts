export interface IndiaMartRawListing {
    companyName: string;
    profileUrl: string;
    listingId: string;
    category?: string;
    city?: string;
    state?: string;
    snippet?: string;
    hasPhoneOnListing?: boolean;
    rating?: number;
    reviewsCount?: number;
}
export interface IndiaMartEnrichedLead {
    companyName: string;
    phone?: string;
    secondaryPhone?: string;
    email?: string;
    website?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    gst?: string;
    ownerName?: string;
    category?: string;
    products?: string[];
    services?: string[];
    rating?: number;
    reviewsCount?: number;
    yearOfEstablishment?: number;
    employeeCount?: string;
    profileUrl: string;
    sourceUrl: string;
    socialLinks: {
        instagram?: string;
        facebook?: string;
        linkedin?: string;
        youtube?: string;
        twitter?: string;
        whatsapp?: string;
    };
    images?: string[];
    latitude?: number;
    longitude?: number;
}
export interface ValidationResult {
    valid: boolean;
    reason?: string;
}
export interface ScraperStats {
    totalListingsFound: number;
    totalProfilesOpened: number;
    totalProfilesFailed: number;
    totalLeadsSaved: number;
    totalDuplicatesSkipped: number;
    totalInvalidRejected: number;
    errors: string[];
}
export declare const INDIA_MART_SEARCH_URL = "https://dir.indiamart.com/search.mp";
export declare const KNOWN_GENERIC_NAMES: Set<string>;
export declare const FAKE_PHONE_PATTERNS: RegExp[];
export declare function isGenericSuggestion(name: string): boolean;
//# sourceMappingURL=indiamart.types.d.ts.map