import { Request, Response, NextFunction } from 'express';
export declare class EnrichmentController {
    enrichLead(req: Request, res: Response, _next: NextFunction): Promise<void>;
    getEnrichmentStatus(req: Request, res: Response, _next: NextFunction): Promise<void>;
    startBackfill(req: Request, res: Response, _next: NextFunction): Promise<void>;
    getBackfillStatus(_req: Request, res: Response, _next: NextFunction): Promise<void>;
    getEnrichableLeads(req: Request, res: Response, _next: NextFunction): Promise<void>;
    getOrchestratorStatus(_req: Request, res: Response, _next: NextFunction): Promise<void>;
    enqueueLead(req: Request, res: Response, _next: NextFunction): Promise<void>;
    enqueueMultiple(req: Request, res: Response, _next: NextFunction): Promise<void>;
    clearCache(_req: Request, res: Response, _next: NextFunction): Promise<void>;
    startMissingFieldsBackfill(req: Request, res: Response, _next: NextFunction): Promise<void>;
    getMissingFieldsCount(_req: Request, res: Response, _next: NextFunction): Promise<void>;
}
export declare const enrichmentController: EnrichmentController;
//# sourceMappingURL=enrichment.controller.d.ts.map