"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Country = void 0;
const mongoose_1 = require("mongoose");
const countrySchema = new mongoose_1.Schema({
    _id: { type: Number, required: true },
    name: { type: String, required: true, index: true },
    iso2: { type: String, required: true, unique: true, uppercase: true },
    iso3: { type: String, required: true, unique: true, uppercase: true },
    phoneCode: { type: String, required: true },
    continent: { type: String, required: true },
    currency: { type: String, default: '' },
    supported: { type: Boolean, default: false },
    hasStates: { type: Boolean, default: false },
    slug: { type: String, required: true, unique: true, lowercase: true },
}, { timestamps: true });
countrySchema.index({ supported: 1, name: 1 });
const CountryModel = (0, mongoose_1.model)('Country', countrySchema);
exports.Country = CountryModel;
//# sourceMappingURL=Country.js.map