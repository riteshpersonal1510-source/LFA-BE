import { Request, Response, NextFunction } from 'express';
export declare class ExporterController {
    exportToCSV(req: Request, res: Response, next: NextFunction): Promise<void>;
    exportToExcel(req: Request, res: Response, next: NextFunction): Promise<void>;
    exportWithFormatting(req: Request, res: Response, next: NextFunction): Promise<void>;
    exportSearchResults(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const exporterController: ExporterController;
//# sourceMappingURL=exporter.controller.d.ts.map