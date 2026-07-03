import { Request, Response, NextFunction } from 'express';
export declare class AnalyticsController {
    getOverview(req: Request, res: Response, next: NextFunction): Promise<void>;
    getLeadAnalytics(req: Request, res: Response, next: NextFunction): Promise<void>;
    getScrapingAnalytics(req: Request, res: Response, next: NextFunction): Promise<void>;
    getAutomationAnalytics(req: Request, res: Response, next: NextFunction): Promise<void>;
    getCategoryDistribution(req: Request, res: Response, next: NextFunction): Promise<void>;
    getLeadsPerDay(req: Request, res: Response, next: NextFunction): Promise<void>;
    getQualificationDistribution(req: Request, res: Response, next: NextFunction): Promise<void>;
    getWebsiteStatusDistribution(req: Request, res: Response, next: NextFunction): Promise<void>;
    getAreaDensity(req: Request, res: Response, next: NextFunction): Promise<void>;
    getTopAreas(req: Request, res: Response, next: NextFunction): Promise<void>;
    getTopLocations(req: Request, res: Response, next: NextFunction): Promise<void>;
    getHighestScoringBusinesses(req: Request, res: Response, next: NextFunction): Promise<void>;
    getRecentScrapingHistory(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const analyticsController: AnalyticsController;
//# sourceMappingURL=analytics.controller.d.ts.map