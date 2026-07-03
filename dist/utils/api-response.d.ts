import { Response } from 'express';
export interface SuccessResponse {
    success: boolean;
    message: string;
    data: unknown;
}
export interface ErrorResponse {
    success: boolean;
    message: string;
    error?: unknown;
}
export interface PaginatedResponse<T> {
    success: boolean;
    message: string;
    data: {
        items: T[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    };
}
export declare class APIResponse {
    static success<T>(res: Response, data: T, message?: string, statusCode?: number): Response<SuccessResponse>;
    static error(res: Response, message: string, error?: unknown, statusCode?: number): Response<ErrorResponse>;
    static paginated<T>(res: Response, items: T[], pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    }, message?: string, statusCode?: number): Response<PaginatedResponse<T>>;
    static successWithLeads<T extends Array<unknown>>(res: Response, leads: T, message?: string, statusCode?: number): Response<SuccessResponse>;
}
//# sourceMappingURL=api-response.d.ts.map