export declare class WebsiteIntelligenceEngine {
    private queue;
    private processing;
    private running;
    enqueueForProcessing(leadId: string, website?: string): void;
    private processQueue;
    processLead(leadId: string, website: string): Promise<void>;
    private crawlWebsite;
    private extractFooterLinks;
    private assessQuality;
    private normalizeUrl;
    private joinUrl;
    private isSameDomain;
}
export declare const websiteIntelligenceEngine: WebsiteIntelligenceEngine;
//# sourceMappingURL=website-intelligence-engine.service.d.ts.map