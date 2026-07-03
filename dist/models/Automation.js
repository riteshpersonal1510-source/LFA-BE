"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportHistory = exports.AutomationHistory = exports.JobExecution = exports.Automation = void 0;
const mongoose_1 = require("mongoose");
const automationSchema = new mongoose_1.Schema({
    keyword: {
        type: String,
        required: true,
        trim: true,
        maxlength: 255,
    },
    location: {
        type: String,
        required: true,
        trim: true,
        maxlength: 255,
    },
    frequency: {
        type: String,
        enum: ['hourly', 'daily', 'weekly'],
        required: true,
    },
    limit: {
        type: Number,
        required: true,
        min: 1,
        max: 100,
    },
    category: {
        type: String,
        trim: true,
    },
    status: {
        type: String,
        enum: ['active', 'paused', 'failed'],
        default: 'active',
    },
    lastRunAt: {
        type: Date,
    },
    nextRunAt: {
        type: Date,
    },
    totalRuns: {
        type: Number,
        default: 0,
    },
    lastRunLeads: {
        type: Number,
        default: 0,
    },
    lastRunStatus: {
        type: String,
        enum: ['success', 'partial', 'failed'],
    },
    error: {
        type: String,
    },
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
automationSchema.index({ keyword: 1, location: 1 });
automationSchema.index({ frequency: 1 });
automationSchema.index({ status: 1 });
automationSchema.index({ nextRunAt: 1 });
automationSchema.index({ createdAt: -1 });
exports.Automation = (0, mongoose_1.model)('Automation', automationSchema);
const jobExecutionSchema = new mongoose_1.Schema({
    automationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Automation',
        required: true,
    },
    jobType: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'running', 'completed', 'failed'],
        default: 'pending',
    },
    startedAt: {
        type: Date,
        required: true,
    },
    completedAt: {
        type: Date,
    },
    totalLeadsGenerated: {
        type: Number,
        default: 0,
    },
    failedCount: {
        type: Number,
        default: 0,
    },
    logs: [{
            type: String,
        }],
    error: {
        type: String,
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
    },
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
jobExecutionSchema.index({ automationId: 1 });
jobExecutionSchema.index({ jobType: 1 });
jobExecutionSchema.index({ status: 1 });
jobExecutionSchema.index({ startedAt: -1 });
exports.JobExecution = (0, mongoose_1.model)('JobExecution', jobExecutionSchema);
const automationHistorySchema = new mongoose_1.Schema({
    automationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Automation',
        required: true,
    },
    triggerType: {
        type: String,
        enum: ['scheduled', 'manual', 'api'],
        required: true,
    },
    totalLeadsGenerated: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ['success', 'partial', 'failed'],
        required: true,
    },
    executionTime: {
        type: Number,
        required: true,
    },
    error: {
        type: String,
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
    },
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
automationHistorySchema.index({ automationId: 1 });
automationHistorySchema.index({ triggerType: 1 });
automationHistorySchema.index({ status: 1 });
automationHistorySchema.index({ createdAt: -1 });
exports.AutomationHistory = (0, mongoose_1.model)('AutomationHistory', automationHistorySchema);
const exportHistorySchema = new mongoose_1.Schema({
    automationId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Automation',
        required: true,
    },
    exportType: {
        type: String,
        enum: ['csv', 'excel'],
        required: true,
    },
    filePath: {
        type: String,
        required: true,
    },
    fileName: {
        type: String,
        required: true,
    },
    fileUrl: {
        type: String,
    },
    generatedAt: {
        type: Date,
        required: true,
    },
    totalRecords: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ['generated', 'archived', 'deleted'],
        default: 'generated',
    },
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
exportHistorySchema.index({ automationId: 1 });
exportHistorySchema.index({ exportType: 1 });
exportHistorySchema.index({ generatedAt: -1 });
exports.ExportHistory = (0, mongoose_1.model)('ExportHistory', exportHistorySchema);
//# sourceMappingURL=Automation.js.map