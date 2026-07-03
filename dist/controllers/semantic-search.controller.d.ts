import { Request, Response } from 'express';
export declare class SemanticSearchController {
    expandKeywords(req: Request, res: Response): Promise<void>;
    getCategoryGroups(_req: Request, res: Response): Promise<void>;
    getSearchCoverageAnalytics(_req: Request, res: Response): Promise<void>;
    getSessionCoverage(req: Request, res: Response): void;
    getSearchStatus(_req: Request, res: Response): void;
}
export declare const semanticSearchController: SemanticSearchController;
//# sourceMappingURL=semantic-search.controller.d.ts.map