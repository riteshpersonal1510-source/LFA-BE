export interface LeadGenerationOptions {
    automationId: string;
    keyword: string;
    location: string;
    limit: number;
    categoryId?: string;
}
export declare class LeadGenerationJob {
    private scraperService;
    constructor();
    execute(options: LeadGenerationOptions): Promise<{
        success: boolean;
        leadsGenerated: number;
        duplicates: number;
        errors: string[];
    }>;
    private createJobExecution;
    private updateJobExecution;
}
export declare const leadGenerationJob: LeadGenerationJob;
//# sourceMappingURL=lead-generation.job.d.ts.map