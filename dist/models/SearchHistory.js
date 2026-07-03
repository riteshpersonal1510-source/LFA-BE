"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchHistory = void 0;
const mongoose_1 = require("mongoose");
const searchHistorySchema = new mongoose_1.Schema({
    searchSessionId: { type: String, required: true, unique: true },
    keyword: { type: String, required: true },
    category: String,
    state: String,
    city: String,
    area: String,
    country: String,
    sources: [{ type: String }],
    totalLeads: { type: Number, default: 0 },
    businessesFound: { type: Number, default: 0 },
    businessesSaved: { type: Number, default: 0 },
    duplicates: { type: Number, default: 0 },
    rejected: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    completedAt: Date,
    stoppedAt: Date,
    duration: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'STOPPED', 'CANCELLED', 'TIMEOUT', 'PARTIAL_SUCCESS', 'NO_RESULTS'],
        default: 'QUEUED',
    },
    searchState: { type: String, default: 'IDLE' },
    currentFound: { type: Number, default: 0 },
    currentSaved: { type: Number, default: 0 },
    currentDuplicates: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    rejectedCount: { type: Number, default: 0 },
    estimatedTotal: { type: Number, default: 0 },
    maxProgressReached: { type: Number, default: 0 },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    currentSource: { type: String, default: '' },
    currentStage: { type: String, default: '' },
    currentBusiness: { type: String, default: '' },
    currentUrl: { type: String, default: '' },
    lastProcessedBusiness: String,
    eta: { type: Number, default: 0 },
    totalProcessed: { type: Number, default: 0 },
    totalFound: { type: Number, default: 0 },
    uniqueSaved: { type: Number, default: 0 },
    duplicatesRemoved: { type: Number, default: 0 },
    error: String,
    failureReason: String,
    failureClassification: {
        type: String,
        enum: ['PLAYWRIGHT_CRASH', 'GOOGLE_BLOCKED', 'BROWSER_CLOSED', 'NETWORK_TIMEOUT', 'USER_STOPPED', 'BACKEND_CRASH', 'SOCKET_DISCONNECT', 'NO_RESULTS_FOUND', 'AUTH_EXPIRED', 'UNKNOWN'],
    },
    errorMetadata: {
        errorName: String,
        errorMessage: String,
        errorStack: String,
        browserError: String,
        googleMapsError: String,
        playwrightError: String,
        networkError: String,
        userAgent: String,
        ipAddress: String,
        browserType: String,
        deviceType: String,
    },
    sourceBreakdown: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    logs: [{
            timestamp: { type: Date, default: Date.now },
            message: String,
            level: { type: String, enum: ['info', 'warn', 'error'], default: 'info' },
        }],
    lastHeartbeat: Date,
    lastUpdateTime: Date,
    isRunning: { type: Boolean, default: true, index: true },
    createdBy: String,
    userId: String,
    sessionId: String,
}, {
    timestamps: true,
});
searchHistorySchema.index({ createdAt: -1 });
searchHistorySchema.index({ state: 1, city: 1, area: 1, country: 1 });
searchHistorySchema.index({ status: 1 });
searchHistorySchema.index({ isRunning: 1 });
searchHistorySchema.index({ failureClassification: 1 });
exports.SearchHistory = (0, mongoose_1.model)('SearchHistory', searchHistorySchema);
//# sourceMappingURL=SearchHistory.js.map