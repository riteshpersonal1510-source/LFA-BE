import { Request, Response } from 'express';
export declare class SalesIntelligenceController {
    analyzeSingleLead(req: Request, res: Response): Promise<void>;
    analyzeMultipleLeads(req: Request, res: Response): Promise<void>;
    analyzeLeadsWithoutAnalysis(req: Request, res: Response): Promise<void>;
    getSalesStats(_req: Request, res: Response): Promise<void>;
}
export declare const salesIntelligenceController: SalesIntelligenceController;
//# sourceMappingURL=sales-intelligence.controller.d.ts.map