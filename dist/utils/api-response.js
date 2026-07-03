"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.APIResponse = void 0;
class APIResponse {
    static success(res, data, message = 'Request successful', statusCode = 200) {
        return res.status(statusCode).json({
            success: true,
            message,
            data,
        });
    }
    static error(res, message, error, statusCode = 400) {
        return res.status(statusCode).json({
            success: false,
            message,
            error,
        });
    }
    static paginated(res, items, pagination, message = 'Request successful', statusCode = 200) {
        return res.status(statusCode).json({
            success: true,
            message,
            data: {
                items,
                pagination,
            },
        });
    }
    static successWithLeads(res, leads, message = 'Leads fetched successfully', statusCode = 200) {
        return res.status(statusCode).json({
            success: true,
            message,
            data: {
                leads,
                pagination: {
                    page: 1,
                    limit: leads.length,
                    total: leads.length,
                    totalPages: 1,
                },
            },
        });
    }
}
exports.APIResponse = APIResponse;
//# sourceMappingURL=api-response.js.map