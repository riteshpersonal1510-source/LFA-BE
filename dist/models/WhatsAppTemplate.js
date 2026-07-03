"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppTemplate = void 0;
const mongoose_1 = require("mongoose");
const whatsAppTemplateSchema = new mongoose_1.Schema({
    type: {
        type: String,
        enum: ['website', 'no_website'],
        required: true,
        unique: true,
        sparse: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    message: {
        type: String,
        required: true,
    },
}, {
    timestamps: true,
    versionKey: false,
    collection: 'whatsapp_templates',
});
exports.WhatsAppTemplate = (0, mongoose_1.model)('WhatsAppTemplate', whatsAppTemplateSchema);
//# sourceMappingURL=WhatsAppTemplate.js.map