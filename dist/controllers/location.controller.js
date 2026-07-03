"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateLocation = exports.getAreas = exports.getCities = exports.getStates = exports.getCountries = void 0;
const models_1 = require("../models");
const api_response_1 = require("../utils/api-response");
const getCountries = async (req, res, next) => {
    try {
        const { supported } = req.query;
        const filter = {};
        if (supported === 'true')
            filter.supported = true;
        const countries = await models_1.Country.find(filter).sort({ name: 1 }).lean();
        api_response_1.APIResponse.success(res, countries);
    }
    catch (err) {
        next(err);
    }
};
exports.getCountries = getCountries;
const getStates = async (req, res, next) => {
    try {
        const countryId = parseInt(req.params.countryId, 10);
        if (isNaN(countryId)) {
            api_response_1.APIResponse.error(res, 'Invalid country ID', undefined, 400);
            return;
        }
        const states = await models_1.State.find({ countryId }).sort({ name: 1 }).lean();
        api_response_1.APIResponse.success(res, states);
    }
    catch (err) {
        next(err);
    }
};
exports.getStates = getStates;
const getCities = async (req, res, next) => {
    try {
        const { stateId } = req.params;
        const cities = await models_1.City.find({ stateId }).sort({ name: 1 }).lean();
        api_response_1.APIResponse.success(res, cities);
    }
    catch (err) {
        next(err);
    }
};
exports.getCities = getCities;
const getAreas = async (req, res, next) => {
    try {
        const { cityId } = req.params;
        const areas = await models_1.Area.find({ cityId }).sort({ name: 1 }).lean();
        api_response_1.APIResponse.success(res, areas);
    }
    catch (err) {
        next(err);
    }
};
exports.getAreas = getAreas;
const validateLocation = async (req, res, next) => {
    try {
        const { countryId, stateId, cityId, areaId } = req.body;
        if (!countryId) {
            api_response_1.APIResponse.error(res, 'countryId is required', undefined, 400);
            return;
        }
        const country = await models_1.Country.findById(countryId).lean();
        if (!country) {
            api_response_1.APIResponse.error(res, 'Country not found', undefined, 404);
            return;
        }
        if (stateId) {
            const state = await models_1.State.findOne({ _id: stateId, countryId }).lean();
            if (!state) {
                api_response_1.APIResponse.error(res, 'State not found in the given country', undefined, 404);
                return;
            }
            if (cityId) {
                const city = await models_1.City.findOne({ _id: cityId, stateId }).lean();
                if (!city) {
                    api_response_1.APIResponse.error(res, 'City not found in the given state', undefined, 404);
                    return;
                }
                if (areaId) {
                    const area = await models_1.Area.findOne({ _id: areaId, cityId }).lean();
                    if (!area) {
                        api_response_1.APIResponse.error(res, 'Area not found in the given city', undefined, 404);
                        return;
                    }
                }
            }
        }
        api_response_1.APIResponse.success(res, { valid: true });
    }
    catch (err) {
        next(err);
    }
};
exports.validateLocation = validateLocation;
//# sourceMappingURL=location.controller.js.map