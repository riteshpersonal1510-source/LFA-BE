export interface WebsiteAnalysisOptions {
    automationId: string;
    leadIds: string[];
}
export declare class WebsiteAnalysisJob {
    execute(options: WebsiteAnalysisOptions): Promise<{
        success: boolean;
        analyzedCount: number;
        failedCount: number;
        errors: string[];
    }>;
    private createJobExecution;
    private updateJobExecution;
}
export declare const websiteAnalysisJob: WebsiteAnalysisJob;
//# sourceMappingURL=website-analysis.job.d.ts.map