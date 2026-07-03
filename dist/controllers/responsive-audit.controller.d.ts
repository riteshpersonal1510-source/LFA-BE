import { Request, Response } from 'express';
export declare class ResponsiveAuditController {
    auditSingleLead(req: Request, res: Response): Promise<void>;
    auditMultipleLeads(req: Request, res: Response): Promise<void>;
    auditLeadsWithoutAudit(_req: Request, res: Response): Promise<void>;
    getAuditStats(_req: Request, res: Response): Promise<void>;
    reauditLead(req: Request, res: Response): Promise<void>;
}
export declare const responsiveAuditController: ResponsiveAuditController;
//# sourceMappingURL=responsive-audit.controller.d.ts.map