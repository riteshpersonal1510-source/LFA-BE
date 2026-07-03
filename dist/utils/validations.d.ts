import { NextFunction, Request, Response } from 'express';
import { AnyZodObject } from 'zod';
export declare const validate: (schema: AnyZodObject) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=validations.d.ts.map