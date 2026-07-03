import { Request, Response, NextFunction } from 'express';
export declare class AutomationController {
    createAutomation(req: Request, res: Response, next: NextFunction): Promise<void>;
    getAllAutomations(req: Request, res: Response, next: NextFunction): Promise<void>;
    getAutomation(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateAutomation(req: Request, res: Response, _next: NextFunction): Promise<void>;
    toggleAutomation(req: Request, res: Response, _next: NextFunction): Promise<void>;
    deleteAutomation(req: Request, res: Response, next: NextFunction): Promise<void>;
    runAutomation(req: Request, res: Response, next: NextFunction): Promise<void>;
    getAutomationLogs(req: Request, res: Response, next: NextFunction): Promise<void>;
    getAutomationStatistics(req: Request, res: Response, next: NextFunction): Promise<void>;
    getExportHistory(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const automationController: AutomationController;
//# sourceMappingURL=automation.controller.d.ts.map