import { Request, Response, NextFunction } from 'express';
export declare class ScraperController {
    getStatus(_req: Request, res: Response, next: NextFunction): Promise<void>;
    getMetrics(_req: Request, res: Response, next: NextFunction): Promise<void>;
    restart(_req: Request, res: Response, next: NextFunction): Promise<void>;
    getSessions(_req: Request, res: Response, next: NextFunction): Promise<void>;
    getSearchStatus(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const scraperController: ScraperController;
//# sourceMappingURL=scraper.controller.d.ts.map