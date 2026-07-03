import { Request, Response } from 'express';
export declare class BusinessIntelligenceController {
    analyzeSingleLead(req: Request, res: Response): Promise<void>;
    analyzeMultipleLeads(req: Request, res: Response): Promise<void>;
    analyzeLeadsWithoutIntelligence(req: Request, res: Response): Promise<void>;
    getIntelligenceStats(_req: Request, res: Response): Promise<void>;
    reanalyzeLead(req: Request, res: Response): Promise<void>;
}
export declare const businessIntelligenceController: BusinessIntelligenceController;
//# sourceMappingURL=business-intelligence.controller.d.ts.map