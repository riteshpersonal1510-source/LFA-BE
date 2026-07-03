import { Request, Response, NextFunction } from 'express';
export declare class WhatsAppTemplateController {
    getTemplates(_req: Request, res: Response, _next: NextFunction): Promise<void>;
    updateWebsiteTemplate(req: Request, res: Response, _next: NextFunction): Promise<void>;
    updateNoWebsiteTemplate(req: Request, res: Response, _next: NextFunction): Promise<void>;
    previewTemplate(req: Request, res: Response, _next: NextFunction): Promise<void>;
    resetTemplates(_req: Request, res: Response, _next: NextFunction): Promise<void>;
}
export declare const whatsAppTemplateController: WhatsAppTemplateController;
//# sourceMappingURL=whatsapp-template.controller.d.ts.map