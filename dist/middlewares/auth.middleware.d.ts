import { Request, Response, NextFunction } from 'express';
export interface AuthRequest extends Request {
    user: {
        id: string;
        role: 'admin';
    };
}
export declare const authenticate: (req: Request, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.middleware.d.ts.map