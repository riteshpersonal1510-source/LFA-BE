export interface PaginationParams {
    page: number;
    limit: number;
}
export interface PaginationResult<T> {
    items: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export declare const calculatePagination: (page: number, limit: number, total: number) => PaginationResult<{
    skip: number;
    limit: number;
}>;
export declare const getPaginationQuery: (query: {
    page?: string;
    limit?: string;
}) => PaginationParams;
//# sourceMappingURL=pagination.d.ts.map