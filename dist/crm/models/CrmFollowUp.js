"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FollowUp = void 0;
const mongoose_1 = require("mongoose");
const followUpSchema = new mongoose_1.Schema({
    leadId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Lead',
        required: true,
        index: true,
    },
    dueDate: {
        type: Date,
        required: true,
        index: true,
    },
    note: {
        type: String,
        trim: true,
        maxlength: 1000,
    },
    completed: {
        type: Boolean,
        default: false,
    },
    completedAt: {
        type: Date,
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
followUpSchema.index({ leadId: 1, completed: 1, dueDate: 1 });
followUpSchema.index({ dueDate: 1, completed: 1 });
followUpSchema.index({ completed: 1 });
followUpSchema.virtual('isOverdue').get(function () {
    if (this.completed)
        return false;
    return new Date() > this.dueDate;
});
exports.FollowUp = (0, mongoose_1.model)('FollowUp', followUpSchema);
//# sourceMappingURL=CrmFollowUp.js.map