import type { Request, Response, NextFunction } from 'express';
export declare class ReportController {
    generateReport(req: Request, res: Response, next: NextFunction): Promise<void>;
    getReportStatus(req: Request, res: Response, next: NextFunction): Promise<void>;
    viewReport(req: Request, res: Response, next: NextFunction): Promise<void>;
    downloadReport(req: Request, res: Response, next: NextFunction): Promise<void>;
    deleteReport(req: Request, res: Response, next: NextFunction): Promise<void>;
    getReportProgress(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const reportController: ReportController;
//# sourceMappingURL=report.controller.d.ts.map