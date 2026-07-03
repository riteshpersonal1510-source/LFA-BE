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
export declare class CSVExporter {
    private readonly defaultFilename;
    exportToCSV(options?: ExportFilters & ExportOptions): Promise<{
        filepath: string;
        rowCount: number;
    }>;
    exportToStream(res: any, options: ExportFilters): Promise<void>;
    private buildQuery;
    exportFromSearch(keyword: string, location: string, options: ExportFilters): Promise<{
        filepath: string;
        rowCount: number;
    }>;
}
export declare const csvExporter: CSVExporter;
//# sourceMappingURL=csv.exporter.d.ts.map