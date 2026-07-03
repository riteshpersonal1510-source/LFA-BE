"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchRequestSchema = void 0;
const zod_1 = require("zod");
exports.searchRequestSchema = zod_1.z.object({
    body: zod_1.z.object({
        keyword: zod_1.z.string().min(1, 'Keyword is required').max(255),
        location: zod_1.z.string().optional(),
        state: zod_1.z.string().optional(),
        city: zod_1.z.string().optional(),
        area: zod_1.z.string().optional(),
        country: zod_1.z.string().optional(),
        businessType: zod_1.z.string().optional(),
        sources: zod_1.z.array(zod_1.z.string()).optional(),
        limit: zod_1.z.number().optional().default(0),
        sessionId: zod_1.z.string().optional(),
        semanticExpansion: zod_1.z.boolean().optional(),
        maxResults: zod_1.z.number().optional(),
    }).passthrough(),
});
//# sourceMappingURL=search.validator.js.map