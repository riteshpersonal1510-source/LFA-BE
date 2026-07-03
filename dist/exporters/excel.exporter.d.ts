import { QualificationLevel, WebsiteStatus } from '../types/analysis.types';
export interface ExportFilters {
    qualificationLevel?: QualificationLevel;
    websiteStatus?: WebsiteStatus;
    category?: string;
    minLeadScore?: number;
    maxLeadScore?: number;
    search?: string;
    keyword?: string;
    location?: string;
    source?: string;
    sources?: string;
    hasWebsite?: string;
    hasPhone?: string;
}
export interface ExportOptions {
    filename?: string;
    filePath?: string;
}
export declare class ExcelExporter {
    private readonly defaultFilename;
    exportToExcel(options?: ExportFilters & ExportOptions): Promise<{
        filepath: string;
        rowCount: number;
    }>;
    exportToStream(res: any, options: ExportFilters): Promise<void>;
    private buildQuery;
    exportWithFormatting(options: ExportFilters & ExportOptions): Promise<{
        filepath: string;
        rowCount: number;
    }>;
    private createFormattedWorkbook;
    private calculateLeadStats;
}
export declare const excelExporter: ExcelExporter;
//# sourceMappingURL=excel.exporter.d.ts.map