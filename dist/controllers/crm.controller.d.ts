import { Request, Response, NextFunction } from 'express';
export declare class CRMController {
    getLeads(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateStage(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateLead(req: Request, res: Response, next: NextFunction): Promise<void>;
    addNote(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateNote(req: Request, res: Response, next: NextFunction): Promise<void>;
    deleteNote(req: Request, res: Response, next: NextFunction): Promise<void>;
    getNotes(req: Request, res: Response, next: NextFunction): Promise<void>;
    createFollowUp(req: Request, res: Response, next: NextFunction): Promise<void>;
    updateFollowUp(req: Request, res: Response, next: NextFunction): Promise<void>;
    deleteFollowUp(req: Request, res: Response, next: NextFunction): Promise<void>;
    getFollowUps(req: Request, res: Response, next: NextFunction): Promise<void>;
    getActivities(req: Request, res: Response, next: NextFunction): Promise<void>;
    getStats(_req: Request, res: Response, next: NextFunction): Promise<void>;
    getAnalytics(_req: Request, res: Response, next: NextFunction): Promise<void>;
    getLeadDetails(req: Request, res: Response, next: NextFunction): Promise<void>;
    getPipeline(_req: Request, res: Response, next: NextFunction): Promise<void>;
    assignLead(req: Request, res: Response, next: NextFunction): Promise<void>;
    moveLead(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const crmController: CRMController;
//# sourceMappingURL=crm.controller.d.ts.map