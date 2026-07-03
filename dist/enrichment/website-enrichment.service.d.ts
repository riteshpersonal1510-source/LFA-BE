export interface WebsiteEnrichmentResult {
    emails: string[];
    phones: string[];
    socialLinks: Record<string, string>;
    companyName?: string;
    copyright?: string;
    hasContactForm: boolean;
    hasContactPage: boolean;
    pagesCrawled: string[];
    success: boolean;
    error?: string;
}
export declare class WebsiteEnrichmentService {
    private readonly REQUEST_TIMEOUT;
    private readonly MAX_PAGES;
    enrichWebsite(domain: string): Promise<WebsiteEnrichmentResult>;
    private crawlAndExtract;
    private extractEmails;
    private extractPhones;
    private extractSocialLinks;
    private extractCompanyName;
    private extractCopyright;
    private detectContactForm;
    private isContactPage;
    private isRelevantPage;
    private isSameDomain;
    private joinUrl;
    private toAbsoluteUrl;
}
//# sourceMappingURL=website-enrichment.service.d.ts.map