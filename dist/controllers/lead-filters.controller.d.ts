import { Request, Response, NextFunction } from 'express';
export declare class LeadFiltersController {
    getStates(_req: Request, res: Response, _next: NextFunction): Promise<void>;
    getCities(req: Request, res: Response, _next: NextFunction): Promise<void>;
    getAreas(req: Request, res: Response, _next: NextFunction): Promise<void>;
}
export declare const leadFiltersController: LeadFiltersController;
//# sourceMappingURL=lead-filters.controller.d.ts.map