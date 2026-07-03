export declare class ReportPdfEngine {
    generatePdf(html: string): Promise<Buffer>;
    captureScreenshot(html: string, viewport: {
        width: number;
        height: number;
    }): Promise<Buffer>;
    close(): Promise<void>;
}
export declare const reportPdfEngine: ReportPdfEngine;
//# sourceMappingURL=report.pdf.d.ts.map