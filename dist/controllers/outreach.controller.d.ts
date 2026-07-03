import { Request, Response } from 'express';
export declare const outreachController: {
    generateForLead(req: Request, res: Response): Promise<void>;
    getLeadOutreach(req: Request, res: Response): Promise<void>;
    updateStatus(req: Request, res: Response): Promise<void>;
    generateForMultipleLeads(req: Request, res: Response): Promise<void>;
    generateForPendingLeads(_req: Request, res: Response): Promise<void>;
    getStats(_req: Request, res: Response): Promise<void>;
};
//# sourceMappingURL=outreach.controller.d.ts.map