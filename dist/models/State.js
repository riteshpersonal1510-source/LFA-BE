"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.State = void 0;
const mongoose_1 = require("mongoose");
const stateSchema = new mongoose_1.Schema({
    countryId: { type: Number, required: true, index: true, ref: 'Country' },
    name: { type: String, required: true },
    stateCode: { type: String, default: '' },
    slug: { type: String, required: true, lowercase: true },
    latitude: Number,
    longitude: Number,
}, { timestamps: true });
stateSchema.index({ countryId: 1, name: 1 }, { unique: true });
stateSchema.index({ countryId: 1, slug: 1 });
exports.State = (0, mongoose_1.model)('State', stateSchema);
//# sourceMappingURL=State.js.map