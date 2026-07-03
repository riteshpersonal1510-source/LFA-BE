import { Request, Response, NextFunction } from 'express';
export declare class AreaAutomationController {
    getLocationData(req: Request, res: Response, _next: NextFunction): Promise<void>;
    startAutomation(req: Request, res: Response, _next: NextFunction): Promise<void>;
    listSessions(req: Request, res: Response, _next: NextFunction): Promise<void>;
    getSession(req: Request, res: Response, _next: NextFunction): Promise<void>;
    getSessionSummary(req: Request, res: Response, _next: NextFunction): Promise<void>;
    getJobs(req: Request, res: Response, _next: NextFunction): Promise<void>;
    updateSession(req: Request, res: Response, _next: NextFunction): Promise<void>;
    deleteSession(req: Request, res: Response, _next: NextFunction): Promise<void>;
    stopAutomation(req: Request, res: Response, _next: NextFunction): Promise<void>;
    pauseAutomation(req: Request, res: Response, _next: NextFunction): Promise<void>;
    resumeAutomation(req: Request, res: Response, _next: NextFunction): Promise<void>;
    restartAutomation(req: Request, res: Response, _next: NextFunction): Promise<void>;
    duplicateAutomation(req: Request, res: Response, _next: NextFunction): Promise<void>;
    archiveAutomation(req: Request, res: Response, _next: NextFunction): Promise<void>;
    getStats(_req: Request, res: Response, _next: NextFunction): Promise<void>;
    getActiveSessions(_req: Request, res: Response, _next: NextFunction): Promise<void>;
}
export declare const areaAutomationController: AreaAutomationController;
//# sourceMappingURL=area-automation.controller.d.ts.map