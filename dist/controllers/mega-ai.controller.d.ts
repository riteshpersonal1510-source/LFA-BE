import type { Request, Response } from 'express';
export declare const megaAIController: {
    analyzeLead(req: Request, res: Response): void;
    analyzeMultipleLeads(req: Request, res: Response): void;
    analyzePendingLeads(req: Request, res: Response): Promise<void>;
    getPipelineStats(_req: Request, res: Response): Promise<void>;
    getLeadAIStatus(req: Request, res: Response): Promise<void>;
    refreshAnalysis(req: Request, res: Response): Promise<void>;
};
//# sourceMappingURL=mega-ai.controller.d.ts.map