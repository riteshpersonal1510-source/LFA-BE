"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AreaSessionModel = exports.AreaJobModel = void 0;
const mongoose_1 = require("mongoose");
const sourceResultSchema = new mongoose_1.Schema({
    source: { type: String, required: true },
    totalStored: { type: Number, default: 0 },
    totalExtracted: { type: Number, default: 0 },
    totalDuplicates: { type: Number, default: 0 },
    success: { type: Boolean, default: false },
}, { _id: false });
const areaJobSchema = new mongoose_1.Schema({
    sessionId: { type: String, required: true, index: true },
    businessType: { type: String, required: true },
    state: { type: String, required: true },
    city: { type: String, required: true },
    area: { type: String, default: '' },
    country: { type: String, default: '' },
    sources: [{ type: String }],
    status: {
        type: String,
        enum: ['pending', 'running', 'completed', 'failed', 'skipped'],
        default: 'pending',
    },
    progress: { type: String, default: '' },
    currentStage: { type: String, default: '' },
    totalLeads: { type: Number, default: 0 },
    savedLeads: { type: Number, default: 0 },
    duplicates: { type: Number, default: 0 },
    rejected: { type: Number, default: 0 },
    attempts: { type: Number, default: 0 },
    sourceResults: [sourceResultSchema],
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    failedReason: { type: String, default: null },
    queuePosition: { type: Number, default: 0 },
    totalJobs: { type: Number, default: 0 },
}, {
    timestamps: true,
    versionKey: false,
    toJSON: {
        transform: (_, ret) => {
            ret.id = ret._id;
            delete ret._id;
            return ret;
        },
    },
});
areaJobSchema.index({ sessionId: 1, status: 1 });
areaJobSchema.index({ sessionId: 1, queuePosition: 1 });
const areaSessionSchema = new mongoose_1.Schema({
    _id: { type: String },
    name: { type: String, default: '' },
    businessTypes: [{ type: String }],
    state: { type: String, required: true },
    cities: [{ type: String }],
    country: { type: String, default: '' },
    sources: [{ type: String }],
    status: {
        type: String,
        enum: ['draft', 'running', 'paused', 'completed', 'failed', 'archived'],
        default: 'draft',
    },
    totalJobs: { type: Number, default: 0 },
    completedJobs: { type: Number, default: 0 },
    failedJobs: { type: Number, default: 0 },
    runningJobs: { type: Number, default: 0 },
    skippedJobs: { type: Number, default: 0 },
    totalLeads: { type: Number, default: 0 },
    savedLeads: { type: Number, default: 0 },
    duplicates: { type: Number, default: 0 },
    rejected: { type: Number, default: 0 },
    currentJobId: { type: String, default: null },
    currentStage: { type: String, default: '' },
    lastHeartbeat: { type: Date, default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    pausedAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null },
    retryCount: { type: Number, default: 0 },
    lastRunAt: { type: Date, default: null },
    maxLeads: { type: Number, default: 100 },
    concurrency: { type: Number, default: 2 },
    retryEnabled: { type: Boolean, default: true },
    dedupEnabled: { type: Boolean, default: true },
    aiAuditEnabled: { type: Boolean, default: false },
    autoOutreach: { type: Boolean, default: false },
    autoReport: { type: Boolean, default: false },
    autoWhatsApp: { type: Boolean, default: false },
    schedule: { type: String, default: '' },
    frequency: { type: String, default: 'once' },
}, {
    timestamps: true,
    versionKey: false,
    toJSON: {
        transform: (_, ret) => {
            ret.id = ret._id;
            delete ret._id;
            return ret;
        },
    },
});
areaSessionSchema.index({ status: 1 });
areaSessionSchema.index({ createdAt: -1 });
areaSessionSchema.index({ name: 1 });
areaSessionSchema.index({ state: 1 });
exports.AreaJobModel = (0, mongoose_1.model)('AreaAutomationJob', areaJobSchema);
exports.AreaSessionModel = (0, mongoose_1.model)('AreaAutomationSession', areaSessionSchema);
//# sourceMappingURL=area-automation.model.js.map