"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Note = void 0;
const mongoose_1 = require("mongoose");
const noteSchema = new mongoose_1.Schema({
    leadId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Lead',
        required: true,
        index: true,
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 5000,
    },
    author: {
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
noteSchema.index({ leadId: 1, createdAt: -1 });
noteSchema.index({ author: 1 });
exports.Note = (0, mongoose_1.model)('Note', noteSchema);
//# sourceMappingURL=CrmNote.js.map