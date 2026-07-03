export interface ContactExtractionResult {
    emails: string[];
    phones: string[];
    socialLinks: {
        facebook?: string;
        instagram?: string;
        linkedin?: string;
        twitter?: string;
        youtube?: string;
    };
    contactPages: string[];
    ownerNames: string[];
    websitePagesCrawled: string[];
    extractionStatus: 'success' | 'partial' | 'failed';
    extractionTime: number;
    extractionError?: string;
}
export interface ExtractionOptions {
    maxDepth?: number;
    maxPages?: number;
    timeout?: number;
    followExternalLinks?: boolean;
}
export declare class ContactExtractorService {
    private browserManager;
    constructor();
    extractContacts(website: string, options?: ExtractionOptions): Promise<ContactExtractionResult>;
    bulkExtractContacts(leads: Array<{
        id: string;
        website?: string;
    }>, options?: ExtractionOptions): Promise<{
        totalProcessed: number;
        successful: number;
        failed: number;
        results: Array<{
            leadId: string;
            result: ContactExtractionResult;
        }>;
    }>;
    private extractFromPage;
    private detectContactPage;
    private detectAboutPage;
    private extractSocialLinks;
    private extractOwnerNames;
    private normalizeUrl;
    private deduplicate;
}
export declare const contactExtractorService: ContactExtractorService;
//# sourceMappingURL=contact-extractor.service.d.ts.map