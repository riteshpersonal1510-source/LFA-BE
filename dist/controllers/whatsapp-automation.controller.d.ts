import { Request, Response, NextFunction } from 'express';
export declare class WhatsAppAutomationController {
    getLeads(req: Request, res: Response, _next: NextFunction): Promise<void>;
    generateMessages(req: Request, res: Response, _next: NextFunction): Promise<void>;
    trackOutreachAction(req: Request, res: Response, _next: NextFunction): Promise<void>;
    getStats(_req: Request, res: Response, _next: NextFunction): Promise<void>;
    bulkUpdateStatus(req: Request, res: Response, _next: NextFunction): Promise<void>;
}
export declare const whatsAppAutomationController: WhatsAppAutomationController;
//# sourceMappingURL=whatsapp-automation.controller.d.ts.map