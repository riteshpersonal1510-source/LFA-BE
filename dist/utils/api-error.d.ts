export declare class APIError extends Error {
    readonly statusCode: number;
    readonly isOperational: boolean;
    constructor(message: string, statusCode?: number);
}
export declare const createError: (message: string, statusCode?: number) => APIError;
//# sourceMappingURL=api-error.d.ts.map