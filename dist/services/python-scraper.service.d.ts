export interface PythonScrapeRequest {
    keyword: string;
    location?: string;
    state?: string;
    city?: string;
    area?: string;
    country?: string;
    sources: string[];
    limit: number;
    businessType?: string;
    sessionId?: string;
    maxResults?: number;
    resumeSessionId?: string;
}
export interface PythonSourceResult {
    source: string;
    totalExtracted: number;
    totalStored: number;
    totalDuplicates: number;
    success: boolean;
    error?: string;
}
export interface PythonScrapedLead {
    companyName: string;
    website?: string;
    phone?: string;
    email?: string;
    address?: string;
    category?: string;
    rating?: number;
    reviewsCount?: number;
    source: string;
    sourceUrl?: string;
    placeId?: string;
    href?: string;
    city?: string;
    state?: string;
    area?: string;
    country?: string;
    businessType?: string;
    fullSearchQuery?: string;
    searchedKeyword?: string;
    searchedLocation?: string;
    searchedCity?: string;
    searchedState?: string;
    searchedArea?: string;
    searchedCountry?: string;
    searchedBusinessType?: string;
    latitude?: number;
    longitude?: number;
    pincode?: string;
    postalCode?: string;
    streetAddress?: string;
    workingHours?: string;
    businessStatus?: string;
    plusCode?: string;
    secondaryCategories?: string[];
    serviceOptions?: string[];
    ownerClaimed?: boolean;
    totalPhotos?: number;
    searchRank?: number;
    relevanceScore?: number;
    leadScore?: number;
    semanticKeyword?: string;
    socialLinks?: Record<string, string>;
    additionalPhones?: string[];
    additionalEmails?: string[];
    whatsappNumber?: string;
    technologyStack?: string[];
    sslEnabled?: boolean;
    businessDescription?: string;
}
export interface PythonScrapeResponse {
    success: boolean;
    message: string;
    sessionId?: string;
    totalExtracted: number;
    totalStored: number;
    totalDuplicates: number;
    sourceResults: PythonSourceResult[];
    leads: PythonScrapedLead[];
    errors?: Array<{
        source: string;
        error: string;
    }>;
}
export interface PythonScrapeStartResponse {
    success: boolean;
    message: string;
    jobId: string;
    sessionId: string;
}
export interface PythonScrapeStatusResponse {
    success: boolean;
    data: {
        jobId: string;
        sessionId: string;
        status: string;
        message?: string;
        lastHeartbeat?: string;
        createdAt?: string;
        updatedAt?: string;
        startedAt?: string;
        completedAt?: string;
        result?: PythonScrapeResponse;
        error?: string;
        newLeads?: PythonScrapedLead[];
    };
}
export interface PythonScrapeResult {
    success: boolean;
    message: string;
    totalExtracted: number;
    totalStored: number;
    totalDuplicates: number;
    sourceResults: PythonSourceResult[];
    leads: PythonScrapedLead[];
    errors?: Array<{
        source: string;
        error: string;
    }>;
}
export declare class PythonScraperService {
    private readonly baseUrl;
    constructor();
    healthCheck(): Promise<boolean>;
    scrape(request: PythonScrapeRequest, sessionId: string): Promise<PythonScrapeResult>;
}
export declare const pythonScraperService: PythonScraperService;
//# sourceMappingURL=python-scraper.service.d.ts.map