"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const mongoose_1 = require("mongoose");
const models_1 = require("../models");
const countries_data_1 = require("../config/countries-data");
const location_data_1 = require("../config/location-data");
const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
    "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
    "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Andaman and Nicobar Islands", "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu", "Lakshadweep", "Delhi",
    "Puducherry", "Ladakh", "Jammu and Kashmir",
];
function slugify(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
async function seedLocations(mongoUri) {
    await (0, mongoose_1.connect)(mongoUri);
    console.log('Connected to MongoDB');
    const existingCountries = await models_1.Country.countDocuments();
    if (existingCountries === 0) {
        for (const c of countries_data_1.COUNTRIES) {
            await models_1.Country.create({
                _id: c.id,
                name: c.name,
                iso2: c.iso2,
                iso3: c.iso3,
                phoneCode: c.phoneCode,
                continent: c.continent,
                currency: c.currency,
                supported: true,
                hasStates: c.hasStates,
                slug: slugify(c.name),
            });
        }
        console.log(`Seeded ${countries_data_1.COUNTRIES.length} countries`);
    }
    else {
        console.log(`Database already has ${existingCountries} countries. Skipping countries.`);
    }
    const indiaId = 76;
    for (const stateName of INDIAN_STATES) {
        let state = await models_1.State.findOne({ countryId: indiaId, name: stateName });
        if (!state) {
            state = await models_1.State.create({
                countryId: indiaId,
                name: stateName,
                stateCode: stateName.substring(0, 3).toUpperCase(),
                slug: slugify(stateName),
            });
        }
        const cities = (0, location_data_1.getCitiesForState)(stateName);
        if (cities.length === 0)
            continue;
        for (const cityName of cities) {
            let city = await models_1.City.findOne({ stateId: state._id, name: cityName });
            if (!city) {
                city = await models_1.City.create({
                    stateId: state._id,
                    countryId: indiaId,
                    name: cityName,
                    slug: slugify(cityName),
                });
            }
            const areas = (0, location_data_1.getAreasForCity)(stateName, cityName);
            if (areas.length === 0)
                continue;
            const areaDocs = areas.map((areaName) => ({
                cityId: city._id,
                stateId: state._id,
                countryId: indiaId,
                name: areaName,
                slug: slugify(areaName),
            }));
            try {
                const result = await models_1.Area.insertMany(areaDocs, { ordered: false });
                console.log(`  ${stateName} > ${cityName}: ${result.length} areas`);
            }
            catch {
                console.log(`  ${stateName} > ${cityName}: 0 new areas (all duplicates)`);
            }
        }
    }
    console.log('India location data seeded successfully');
    await (0, mongoose_1.disconnect)();
}
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lead-finder';
seedLocations(uri).catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
//# sourceMappingURL=seed-locations.js.map