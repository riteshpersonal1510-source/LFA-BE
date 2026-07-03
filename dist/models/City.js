"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.City = void 0;
const mongoose_1 = require("mongoose");
const citySchema = new mongoose_1.Schema({
    stateId: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true, ref: 'State' },
    countryId: { type: Number, required: true, index: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, lowercase: true },
    latitude: Number,
    longitude: Number,
}, { timestamps: true });
citySchema.index({ stateId: 1, name: 1 }, { unique: true });
citySchema.index({ countryId: 1, name: 1 });
exports.City = (0, mongoose_1.model)('City', citySchema);
//# sourceMappingURL=City.js.map