import { Request, Response, NextFunction } from 'express';
export declare class MonitorController {
    getLogs(req: Request, res: Response, _next: NextFunction): Promise<void>;
    getLiveStatus(req: Request, res: Response, _next: NextFunction): Promise<void>;
    getStats(req: Request, res: Response, _next: NextFunction): Promise<void>;
    getMemoryLogs(req: Request, res: Response, _next: NextFunction): Promise<void>;
    clearMemoryLogs(req: Request, res: Response, _next: NextFunction): Promise<void>;
}
export declare const monitorController: MonitorController;
//# sourceMappingURL=monitor.controller.d.ts.map