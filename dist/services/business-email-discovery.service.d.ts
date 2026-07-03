interface DiscoveredEmail {
    email: string;
    type: string;
    sourcePage: string;
    confidence: number;
    verified: boolean;
}
interface DiscoveryResult {
    discoveredEmails: DiscoveredEmail[];
    primaryEmail: string;
    emailCount: number;
    success: boolean;
    error?: string;
    fromCache?: boolean;
    method?: string;
    durationMs?: number;
}
export declare class BusinessEmailDiscoveryService {
    private httpClient;
    constructor();
    normalizeUrl(rawUrl: string): string;
    private getNormalizedDomain;
    isSocialOrDirectoryUrl(url: string): boolean;
    private isFakeEmail;
    private isValidEmail;
    private extractEmailsFromHtml;
    private selectPrimaryEmail;
    private checkCache;
    private saveToCache;
    private fetchWithAxios;
    private fetchWithPlaywright;
    private extractEmailsWithPlaywright;
    private extractEmailsFromHomepage;
    private extractEmailsFromPages;
    private updateLeadWithEmails;
    discoverEmailsForLead(leadId: string): Promise<DiscoveryResult>;
    discoverEmailsForLeadAsync(leadId: string): Promise<void>;
    backfillAllLeads(concurrency?: number): Promise<{
        processed: number;
        succeeded: number;
        failed: number;
        skipped: number;
    }>;
}
export declare const businessEmailDiscoveryService: BusinessEmailDiscoveryService;
export {};
//# sourceMappingURL=business-email-discovery.service.d.ts.map