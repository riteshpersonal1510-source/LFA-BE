import type { GoogleMapsDetailData } from './google-maps-detail-extractor';
import type { WebsiteEnrichmentResult } from './website-enrichment.service';
export interface EnrichmentResult {
    leadId: string;
    success: boolean;
    googleMapsData?: GoogleMapsDetailData;
    websiteData?: WebsiteEnrichmentResult;
    fieldsUpdated: string[];
    errors: string[];
    durationMs: number;
}
export declare class LeadEnrichmentOrchestrator {
    private queue;
    private processing;
    private maxConcurrent;
    private running;
    enqueue(leadId: string, priority?: number): void;
    enqueueMultiple(leadIds: string[], priority?: number): void;
    get queueSize(): number;
    get activeCount(): number;
    get status(): {
        queueSize: number;
        activeCount: number;
        maxConcurrent: number;
        cacheSize: number;
    };
    private processQueue;
    enrichLead(leadId: string): Promise<EnrichmentResult>;
    private runEnrichment;
    private buildGoogleMapsUpdates;
    private buildWebsiteUpdates;
    private mergeEnrichmentData;
}
//# sourceMappingURL=lead-enrichment-orchestrator.d.ts.map