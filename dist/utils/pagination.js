"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaginationQuery = exports.calculatePagination = void 0;
const calculatePagination = (page, limit, total) => {
    const sanitizedPage = Math.max(1, page);
    const sanitizedLimit = Math.max(1, Math.min(limit, 100));
    const totalPages = Math.ceil(total / sanitizedLimit);
    return {
        items: [],
        pagination: {
            page: sanitizedPage,
            limit: sanitizedLimit,
            total,
            totalPages,
        },
    };
};
exports.calculatePagination = calculatePagination;
const getPaginationQuery = (query) => {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '10', 10);
    return {
        page,
        limit,
    };
};
exports.getPaginationQuery = getPaginationQuery;
//# sourceMappingURL=pagination.js.map