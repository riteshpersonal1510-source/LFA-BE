import { CookieOptions, Request, Response } from 'express';
export declare const getCookieOptions: () => CookieOptions;
export declare const setAuthCookies: (res: Response, accessToken: string, refreshToken: string) => void;
export declare const clearAuthCookies: (res: Response) => void;
export declare const getUserRoleFromRequest: (req: Request) => string | undefined;
export declare const hasRole: (userRole: string, requiredRoles: string[]) => boolean;
//# sourceMappingURL=auth-utils.d.ts.map