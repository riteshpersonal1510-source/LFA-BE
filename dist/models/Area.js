"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Area = void 0;
const mongoose_1 = require("mongoose");
const areaSchema = new mongoose_1.Schema({
    cityId: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true, ref: 'City' },
    stateId: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    countryId: { type: Number, required: true, index: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, lowercase: true },
}, { timestamps: true });
areaSchema.index({ cityId: 1, name: 1 }, { unique: true });
areaSchema.index({ stateId: 1, name: 1 });
exports.Area = (0, mongoose_1.model)('Area', areaSchema);
//# sourceMappingURL=Area.js.map