interface MigrationStats {
    total: number;
    processed: number;
    classified: number;
    realWebsites: number;
    socialOnly: number;
    googleOnly: number;
    marketplaceOnly: number;
    directoryOnly: number;
    invalidUrls: number;
    noWebsite: number;
}
export declare class LeadMigrationService {
    reclassifyAllLeads(batchSize?: number): Promise<MigrationStats>;
    getClassificationStats(): Promise<{
        total: number;
        withWebsite: number;
        realWebsites: number;
        socialOnly: number;
        googleOnly: number;
        marketplaceOnly: number;
        noWebsite: number;
    }>;
    migrateWebsiteDetectionFields(batchSize?: number): Promise<{
        processed: number;
        updated: number;
    }>;
}
export declare const leadMigrationService: LeadMigrationService;
export {};
//# sourceMappingURL=lead-migration.service.d.ts.map