"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginationQuerySchema = void 0;
const zod_1 = require("zod");
exports.paginationQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().optional().default('1'),
        limit: zod_1.z.string().optional().default('10'),
        keyword: zod_1.z.string().optional(),
        category: zod_1.z.string().optional(),
        minRating: zod_1.z.string().optional(),
        minLeadScore: zod_1.z.string().optional(),
        websiteStatus: zod_1.z.string().optional(),
    }),
});
//# sourceMappingURL=pagination.validator.js.map