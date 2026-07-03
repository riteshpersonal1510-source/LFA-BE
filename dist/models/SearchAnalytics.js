"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchAnalytics = void 0;
const mongoose_1 = require("mongoose");
const SearchAnalyticsSchema = new mongoose_1.Schema({
    sessionId: { type: String, required: true, unique: true },
    keyword: { type: String, required: true, index: true },
    expandedKeywords: [{ type: String }],
    state: String,
    city: String,
    area: String,
    location: { type: String, default: '' },
    sources: [{ type: String }],
    totalLeadsFound: { type: Number, default: 0 },
    totalUniqueLeads: { type: Number, default: 0 },
    totalDuplicatesRemoved: { type: Number, default: 0 },
    sourceBreakdown: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    keywordBreakdown: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    status: {
        type: String,
        enum: ['running', 'completed', 'failed'],
        default: 'running',
    },
    duration: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    completedAt: Date,
    error: String,
}, { timestamps: true });
SearchAnalyticsSchema.index({ keyword: 1, createdAt: -1 });
SearchAnalyticsSchema.index({ status: 1, createdAt: -1 });
exports.SearchAnalytics = (0, mongoose_1.model)('SearchAnalytics', SearchAnalyticsSchema);
//# sourceMappingURL=SearchAnalytics.js.map