export interface GoogleMapsDetailData {
    companyName: string;
    website?: string;
    phone?: string;
    phones?: string[];
    email?: string;
    address?: string;
    streetAddress?: string;
    postalCode?: string;
    pincode?: string;
    area?: string;
    city?: string;
    state?: string;
    country?: string;
    category?: string;
    secondaryCategories?: string[];
    rating?: number;
    reviewsCount?: number;
    totalPhotos?: number;
    workingHours?: string;
    businessStatus?: string;
    serviceOptions?: string[];
    ownerClaimed?: boolean;
    plusCode?: string;
    placeId?: string;
    sourceUrl?: string;
    latitude?: number;
    longitude?: number;
    socialLinks?: {
        facebook?: string;
        instagram?: string;
        linkedin?: string;
        youtube?: string;
        twitter?: string;
        whatsapp?: string;
    };
    extractedAt: string;
}
export declare class GoogleMapsDetailExtractor {
    private readonly AI_SERVICE_URL;
    private readonly AI_TIMEOUT;
    extractDetail(placeId: string, sourceUrl?: string): Promise<GoogleMapsDetailData | null>;
    private extractViaAIService;
    private extractViaLegacyBrowser;
    private buildPlaceUrl;
    private waitForDetailPanel;
    private extractAllFieldsLegacy;
    private extractText;
}
//# sourceMappingURL=google-maps-detail-extractor.d.ts.map