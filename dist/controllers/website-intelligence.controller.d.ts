import { Request, Response, NextFunction } from 'express';
export declare class WebsiteIntelligenceController {
    analyzeSingleLead(req: Request, res: Response, next: NextFunction): Promise<void>;
    reanalyzeLead(req: Request, res: Response, next: NextFunction): Promise<void>;
    getIntelligenceStats(_req: Request, res: Response, next: NextFunction): Promise<void>;
    analyzeMultipleLeads(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const websiteIntelligenceController: WebsiteIntelligenceController;
//# sourceMappingURL=website-intelligence.controller.d.ts.map