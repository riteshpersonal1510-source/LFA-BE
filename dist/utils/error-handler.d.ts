import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
export declare class AppError extends Error {
    statusCode: number;
    isOperational: boolean;
    constructor(message: string, statusCode: number);
}
export declare const errorHandler: ErrorRequestHandler;
export declare const asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
export declare const notFound: (req: Request, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=error-handler.d.ts.map