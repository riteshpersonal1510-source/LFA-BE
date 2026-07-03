"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionLogModel = void 0;
const mongoose_1 = require("mongoose");
const logEntrySchema = new mongoose_1.Schema({
    timestamp: { type: String, required: true },
    message: { type: String, required: true },
    level: { type: String, enum: ['info', 'warn', 'error', 'success'], required: true },
}, { _id: false });
const executionLogSchema = new mongoose_1.Schema({
    sessionId: { type: String, required: true, index: true },
    jobId: { type: String, required: true },
    state: { type: String, required: true },
    city: { type: String, required: true },
    area: { type: String, required: true },
    businessType: { type: String, required: true },
    sources: [{ type: String }],
    status: {
        type: String,
        enum: ['pending', 'running', 'completed', 'failed'],
        default: 'pending',
    },
    totalLeads: { type: Number, default: 0 },
    sourceResults: [{
            _id: false,
            source: { type: String },
            totalStored: { type: Number },
            totalExtracted: { type: Number },
            success: { type: Boolean },
        }],
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    duration: { type: Number, default: null },
    error: { type: String, default: null },
    workerId: { type: String, required: true },
    logs: [logEntrySchema],
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
executionLogSchema.index({ sessionId: 1, status: 1 });
executionLogSchema.index({ sessionId: 1, city: 1, area: 1 });
exports.ExecutionLogModel = (0, mongoose_1.model)('AutomationExecutionLog', executionLogSchema);
//# sourceMappingURL=execution-log.model.js.map