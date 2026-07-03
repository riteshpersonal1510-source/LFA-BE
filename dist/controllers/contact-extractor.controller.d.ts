import { Request, Response, NextFunction } from 'express';
export declare class ContactExtractorController {
    private leadService;
    constructor();
    extractContacts(req: Request, res: Response, next: NextFunction): Promise<void>;
    bulkExtractContacts(req: Request, res: Response, next: NextFunction): Promise<void>;
    crawlWebsite(req: Request, res: Response, next: NextFunction): Promise<void>;
    extractSocialLinks(req: Request, res: Response, next: NextFunction): Promise<void>;
    detectOwner(req: Request, res: Response, next: NextFunction): Promise<void>;
    detectContactPages(req: Request, res: Response, next: NextFunction): Promise<void>;
    fullExtraction(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const contactExtractorController: ContactExtractorController;
//# sourceMappingURL=contact-extractor.controller.d.ts.map