export interface ContactExtractionOptions {
    automationId: string;
    leadIds: string[];
}
export declare class ContactExtractionJob {
    execute(options: ContactExtractionOptions): Promise<{
        success: boolean;
        extractedCount: number;
        failedCount: number;
        errors: string[];
    }>;
    private createJobExecution;
    private updateJobExecution;
}
export declare const contactExtractionJob: ContactExtractionJob;
//# sourceMappingURL=contact-extraction.job.d.ts.map