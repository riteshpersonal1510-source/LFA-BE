"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppCampaign = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const whatsAppCampaignSchema = new mongoose_1.Schema({
    sessionId: { type: String, required: true, unique: true },
    status: {
        type: String,
        enum: ['created', 'loading', 'building', 'ready', 'running', 'completed', 'failed', 'stopped', 'logged_out'],
        default: 'created',
        index: true,
    },
    selectedLeadIds: [{ type: String, ref: 'Lead' }],
    totalLeads: { type: Number, default: 0 },
    completedLeads: { type: Number, default: 0 },
    failedLeads: { type: Number, default: 0 },
    skippedLeads: { type: Number, default: 0 },
    currentLeadId: { type: String, ref: 'Lead', default: null },
    currentLeadIndex: { type: Number, default: 0 },
    currentStep: { type: String, default: '' },
    error: { type: String, default: null },
    failureReason: { type: String, default: null },
    logs: [
        {
            leadId: String,
            companyName: String,
            phone: String || null,
            status: String,
            timestamp: Number,
            error: String,
            message: String,
            duration_ms: Number,
            attempt: Number,
            browser_state: String,
        },
    ],
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    eta: { type: Number, default: null },
    elapsedSeconds: { type: Number, default: 0 },
    processed: { type: Number, default: 0 },
    remaining: { type: Number, default: 0 },
    currentLead: { type: String, default: null },
    leads: [
        {
            leadId: String,
            companyName: String,
            phone: String || null,
            website: String,
            city: String,
            messageType: String,
            queuePosition: Number,
            status: String,
            error: String || null,
            attempts: Number,
            durationMs: Number,
            browserState: String,
            updatedAt: Number,
            completedAt: Number || null,
        },
    ],
}, { timestamps: true });
whatsAppCampaignSchema.index({ status: 1, createdAt: -1 });
whatsAppCampaignSchema.index({ selectedLeadIds: 1 });
exports.WhatsAppCampaign = mongoose_1.default.model('WhatsAppCampaign', whatsAppCampaignSchema, 'whatsapp_campaigns');
//# sourceMappingURL=WhatsAppCampaign.js.map