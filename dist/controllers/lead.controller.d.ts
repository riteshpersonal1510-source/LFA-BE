import { Request, Response, NextFunction } from 'express';
export declare class LeadController {
    private scraperService;
    private leadService;
    private leadQualificationService;
    private websiteAnalyzerService;
    constructor();
    searchLeads(req: Request, res: Response, _next: NextFunction): Promise<void>;
    getLeadStatistics(_req: Request, res: Response, _next: NextFunction): Promise<void>;
    getLeads(req: Request, res: Response, _next: NextFunction): Promise<void>;
    getFilterOptions(req: Request, res: Response, _next: NextFunction): Promise<void>;
    getFilterCounts(req: Request, res: Response, _next: NextFunction): Promise<void>;
    getLead(req: Request, res: Response, next: NextFunction): Promise<void>;
    createLead(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateLead(req: Request, res: Response, next: NextFunction): Promise<void>;
    deleteLead(req: Request, res: Response, next: NextFunction): Promise<void>;
    getCategories(_req: Request, res: Response, next: NextFunction): Promise<void>;
    deleteAllLeads(_req: Request, res: Response, next: NextFunction): Promise<void>;
    analyzeLead(req: Request, res: Response, next: NextFunction): Promise<void>;
    bulkAnalyzeLeads(req: Request, res: Response, next: NextFunction): Promise<void>;
    getQualificationStats(_req: Request, res: Response, next: NextFunction): Promise<void>;
    requalifyUnanalyzedLeads(req: Request, res: Response, next: NextFunction): Promise<void>;
    triggerLeadAudits(req: Request, res: Response, next: NextFunction): Promise<void>;
    triggerBulkAudits(req: Request, res: Response, next: NextFunction): Promise<void>;
    triggerAllMissingAudits(req: Request, res: Response, next: NextFunction): Promise<void>;
    reprocessAllLeads(_req: Request, res: Response, next: NextFunction): Promise<void>;
    reclassifyLeads(_req: Request, res: Response, next: NextFunction): Promise<void>;
    getClassificationStats(_req: Request, res: Response, next: NextFunction): Promise<void>;
    getKeywordStats(req: Request, res: Response, next: NextFunction): Promise<void>;
    getSearchHistory(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const leadController: LeadController;
//# sourceMappingURL=lead.controller.d.ts.map