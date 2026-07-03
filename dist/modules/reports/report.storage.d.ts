export declare class ReportStorage {
    private ensureDir;
    savePdf(leadId: string, pdfBuffer: Buffer): Promise<string>;
    saveHtml(leadId: string, html: string): Promise<string>;
    saveScreenshot(leadId: string, type: 'desktop' | 'mobile', buffer: Buffer): Promise<string>;
    getPdf(filepath: string): Promise<Buffer | null>;
    getHtml(filepath: string): Promise<string | null>;
    deleteReport(filepath: string): Promise<boolean>;
    getPdfUrl(filepath: string): string;
    getHtmlUrl(filepath: string): string;
}
export declare const reportStorage: ReportStorage;
//# sourceMappingURL=report.storage.d.ts.map