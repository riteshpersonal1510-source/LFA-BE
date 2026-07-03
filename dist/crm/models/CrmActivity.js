"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Activity = void 0;
const mongoose_1 = require("mongoose");
const activitySchema = new mongoose_1.Schema({
    leadId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Lead',
        required: true,
        index: true,
    },
    type: {
        type: String,
        enum: [
            'lead-created',
            'stage-changed',
            'note-added',
            'note-updated',
            'note-deleted',
            'follow-up-created',
            'follow-up-updated',
            'follow-up-deleted',
            'follow-up-completed',
            'lead-assigned',
            'lead-converted',
        ],
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true,
    },
    previousValue: {
        type: String,
    },
    updatedValue: {
        type: String,
    },
    description: {
        type: String,
        trim: true,
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
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
activitySchema.index({ leadId: 1, timestamp: -1 });
activitySchema.index({ type: 1 });
activitySchema.index({ createdBy: 1 });
exports.Activity = (0, mongoose_1.model)('Activity', activitySchema);
//# sourceMappingURL=CrmActivity.js.map