import type { ReportData, ReportGenerationResult } from './report.types';
export declare class ReportService {
    private generationLocks;
    generateReport(leadId: string): Promise<ReportGenerationResult>;
    getReportStatus(leadId: string): Promise<{
        exists: boolean;
        report: ReportData | null;
    }>;
    getReportData(leadId: string): Promise<{
        html: string | null;
        pdf: Buffer | null;
        report: ReportData | null;
    }>;
    deleteReport(leadId: string): Promise<boolean>;
    triggerAutoGeneration(leadId: string): Promise<void>;
}
export declare const reportService: ReportService;
//# sourceMappingURL=report.service.d.ts.map