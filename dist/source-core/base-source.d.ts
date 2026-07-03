import { SourceConfig } from './source-config';
export interface LeadData {
    id: string;
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
    leadScore?: number;
    href?: string;
    placeId?: string;
    createdAt: string;
    area?: string;
    city?: string;
    state?: string;
    businessType?: string;
    fullSearchQuery?: string;
    locationRelevanceScore?: number;
    relevanceScore?: number;
    validatedCategory?: string;
    sources?: string[];
    locationConfidence?: number;
    categoryConfidence?: number;
    finalConfidence?: number;
    validationStatus?: 'validated' | 'rejected' | 'needs-review';
    rejectionReason?: string;
    aiMatchType?: string;
    aiWarnings?: string[];
    aiQuality?: 'excellent' | 'good' | 'average' | 'poor';
    semanticCategory?: string;
    semanticCategoryName?: string;
    matchedKeyword?: string;
    originalSearchedKeyword?: string;
    searchGroup?: string;
    semanticMatchReason?: string;
    expandedFromKeyword?: string;
}
export interface ScrapingResult {
    success: boolean;
    message: string;
    totalExtracted: number;
    totalStored: number;
    totalDuplicates: number;
    leads: LeadData[];
}
export interface StoredLeadResult {
    totalStored: number;
    totalDuplicates: number;
    leads: LeadData[];
}
export interface SourceOptions {
    keyword: string;
    location?: string;
    limit: number;
    config?: SourceConfig;
    state?: string;
    city?: string;
    area?: string;
    businessType?: string;
    sessionId?: string;
}
export declare abstract class BaseSource {
    protected readonly sourceName: string;
    protected config: SourceConfig;
    constructor(sourceName: string, config?: Partial<SourceConfig>);
    getName(): string;
    getConfig(): SourceConfig;
    abstract scrape(options: SourceOptions): Promise<ScrapingResult>;
    testConnection(): Promise<boolean>;
    protected storeLeads(leads: LeadData[], context?: {
        keyword?: string;
        location?: string;
        area?: string;
        city?: string;
        state?: string;
        businessType?: string;
        fullSearchQuery?: string;
    }): Promise<StoredLeadResult>;
    private toLeadData;
    protected isDuplicate(business: LeadData, existing: LeadData[]): boolean;
    protected calculateLeadScore(data: LeadData): number;
}
//# sourceMappingURL=base-source.d.ts.map