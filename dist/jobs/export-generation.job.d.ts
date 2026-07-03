export interface ExportGenerationOptions {
    automationId: string;
    exportType: 'csv' | 'excel';
    filters: any;
}
export declare class ExportGenerationJob {
    execute(options: ExportGenerationOptions): Promise<{
        success: boolean;
        exportPath: string;
        fileName: string;
        totalRecords: number;
        errors: string[];
    }>;
    private createJobExecution;
    private updateJobExecution;
}
export declare const exportGenerationJob: ExportGenerationJob;
//# sourceMappingURL=export-generation.job.d.ts.map