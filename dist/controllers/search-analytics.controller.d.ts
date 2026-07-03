import { Request, Response, NextFunction } from 'express';
export declare class SearchAnalyticsController {
    getBySessionId(req: Request, res: Response, _next: NextFunction): Promise<void>;
    getByKeyword(req: Request, res: Response, _next: NextFunction): Promise<void>;
    getRecent(req: Request, res: Response, _next: NextFunction): Promise<void>;
}
export declare const searchAnalyticsController: SearchAnalyticsController;
//# sourceMappingURL=search-analytics.controller.d.ts.map