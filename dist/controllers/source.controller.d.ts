import { Request, Response, NextFunction } from 'express';
export declare class SourceController {
    searchBySources(req: Request, res: Response, next: NextFunction): Promise<void>;
    getSources(_req: Request, res: Response, next: NextFunction): Promise<void>;
    getSourceStatus(_req: Request, res: Response, next: NextFunction): Promise<void>;
    enableSource(req: Request, res: Response, next: NextFunction): Promise<void>;
    disableSource(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const sourceController: SourceController;
//# sourceMappingURL=source.controller.d.ts.map