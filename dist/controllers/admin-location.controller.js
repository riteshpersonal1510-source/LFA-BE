"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteArea = exports.createArea = exports.listAreas = exports.deleteCity = exports.updateCity = exports.createCity = exports.listCities = exports.deleteState = exports.updateState = exports.createState = exports.listStates = exports.deleteCountry = exports.updateCountry = exports.createCountry = exports.listCountries = void 0;
const models_1 = require("../models");
const api_response_1 = require("../utils/api-response");
function toSlug(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
const listCountries = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const search = req.query.search || '';
        const filter = {};
        if (search)
            filter.name = { $regex: search, $options: 'i' };
        const total = await models_1.Country.countDocuments(filter);
        const countries = await models_1.Country.find(filter)
            .sort({ name: 1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
        api_response_1.APIResponse.paginated(res, countries, { page, limit, total, totalPages: Math.ceil(total / limit) });
    }
    catch (err) {
        next(err);
    }
};
exports.listCountries = listCountries;
const createCountry = async (req, res, next) => {
    try {
        const body = req.body;
        const name = body.name;
        const iso2 = body.iso2;
        const iso3 = body.iso3;
        if (!name || !iso2 || !iso3) {
            api_response_1.APIResponse.error(res, 'name, iso2, iso3 are required', undefined, 400);
            return;
        }
        const country = await models_1.Country.create({
            _id: body.id || Date.now(),
            name,
            iso2,
            iso3,
            phoneCode: body.phoneCode || '',
            continent: body.continent || '',
            currency: body.currency || '',
            supported: body.supported !== undefined ? Boolean(body.supported) : true,
            hasStates: body.hasStates !== undefined ? Boolean(body.hasStates) : true,
            slug: toSlug(name),
        });
        api_response_1.APIResponse.success(res, country.toObject(), 'Country created', 201);
    }
    catch (err) {
        next(err);
    }
};
exports.createCountry = createCountry;
const updateCountry = async (req, res, next) => {
    try {
        const { id } = req.params;
        const body = req.body;
        const update = {};
        const fields = ['name', 'iso2', 'iso3', 'phoneCode', 'continent', 'currency', 'supported', 'hasStates'];
        for (const f of fields) {
            if (body[f] !== undefined)
                update[f] = body[f];
        }
        if (update.name)
            update.slug = toSlug(update.name);
        const country = await models_1.Country.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).lean();
        if (!country) {
            api_response_1.APIResponse.error(res, 'Country not found', undefined, 404);
            return;
        }
        api_response_1.APIResponse.success(res, country, 'Country updated');
    }
    catch (err) {
        next(err);
    }
};
exports.updateCountry = updateCountry;
const deleteCountry = async (req, res, next) => {
    try {
        const { id } = req.params;
        const country = await models_1.Country.findByIdAndUpdate(id, { $set: { supported: false } }, { new: true }).lean();
        if (!country) {
            api_response_1.APIResponse.error(res, 'Country not found', undefined, 404);
            return;
        }
        api_response_1.APIResponse.success(res, country, 'Country disabled');
    }
    catch (err) {
        next(err);
    }
};
exports.deleteCountry = deleteCountry;
const listStates = async (req, res, next) => {
    try {
        const countryId = parseInt(req.params.countryId, 10);
        if (isNaN(countryId)) {
            api_response_1.APIResponse.error(res, 'Invalid country ID', undefined, 400);
            return;
        }
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const search = req.query.search || '';
        const filter = { countryId };
        if (search)
            filter.name = { $regex: search, $options: 'i' };
        const total = await models_1.State.countDocuments(filter);
        const states = await models_1.State.find(filter)
            .sort({ name: 1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
        api_response_1.APIResponse.paginated(res, states, { page, limit, total, totalPages: Math.ceil(total / limit) });
    }
    catch (err) {
        next(err);
    }
};
exports.listStates = listStates;
const createState = async (req, res, next) => {
    try {
        const countryId = parseInt(req.params.countryId, 10);
        if (isNaN(countryId)) {
            api_response_1.APIResponse.error(res, 'Invalid country ID', undefined, 400);
            return;
        }
        const body = req.body;
        const name = body.name;
        if (!name) {
            api_response_1.APIResponse.error(res, 'name is required', undefined, 400);
            return;
        }
        const state = await models_1.State.create({ countryId, name, stateCode: body.stateCode || '', slug: toSlug(name), latitude: body.latitude, longitude: body.longitude });
        api_response_1.APIResponse.success(res, state.toObject(), 'State created', 201);
    }
    catch (err) {
        next(err);
    }
};
exports.createState = createState;
const updateState = async (req, res, next) => {
    try {
        const { id } = req.params;
        const body = req.body;
        const update = {};
        const fields = ['name', 'stateCode', 'latitude', 'longitude'];
        for (const f of fields) {
            if (body[f] !== undefined)
                update[f] = body[f];
        }
        if (update.name)
            update.slug = toSlug(update.name);
        const state = await models_1.State.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).lean();
        if (!state) {
            api_response_1.APIResponse.error(res, 'State not found', undefined, 404);
            return;
        }
        api_response_1.APIResponse.success(res, state, 'State updated');
    }
    catch (err) {
        next(err);
    }
};
exports.updateState = updateState;
const deleteState = async (req, res, next) => {
    try {
        const { id } = req.params;
        const state = await models_1.State.findByIdAndDelete(id).lean();
        if (!state) {
            api_response_1.APIResponse.error(res, 'State not found', undefined, 404);
            return;
        }
        api_response_1.APIResponse.success(res, null, 'State deleted');
    }
    catch (err) {
        next(err);
    }
};
exports.deleteState = deleteState;
const listCities = async (req, res, next) => {
    try {
        const { stateId } = req.params;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const search = req.query.search || '';
        const filter = { stateId };
        if (search)
            filter.name = { $regex: search, $options: 'i' };
        const total = await models_1.City.countDocuments(filter);
        const cities = await models_1.City.find(filter)
            .sort({ name: 1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
        api_response_1.APIResponse.paginated(res, cities, { page, limit, total, totalPages: Math.ceil(total / limit) });
    }
    catch (err) {
        next(err);
    }
};
exports.listCities = listCities;
const createCity = async (req, res, next) => {
    try {
        const { stateId } = req.params;
        const state = await models_1.State.findById(stateId).lean();
        if (!state) {
            api_response_1.APIResponse.error(res, 'State not found', undefined, 404);
            return;
        }
        const body = req.body;
        const name = body.name;
        if (!name) {
            api_response_1.APIResponse.error(res, 'name is required', undefined, 400);
            return;
        }
        const city = await models_1.City.create({
            stateId,
            countryId: state.countryId,
            name,
            slug: toSlug(name),
            latitude: body.latitude,
            longitude: body.longitude,
        });
        api_response_1.APIResponse.success(res, city.toObject(), 'City created', 201);
    }
    catch (err) {
        next(err);
    }
};
exports.createCity = createCity;
const updateCity = async (req, res, next) => {
    try {
        const { id } = req.params;
        const body = req.body;
        const update = {};
        const fields = ['name', 'latitude', 'longitude'];
        for (const f of fields) {
            if (body[f] !== undefined)
                update[f] = body[f];
        }
        if (update.name)
            update.slug = toSlug(update.name);
        const city = await models_1.City.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).lean();
        if (!city) {
            api_response_1.APIResponse.error(res, 'City not found', undefined, 404);
            return;
        }
        api_response_1.APIResponse.success(res, city, 'City updated');
    }
    catch (err) {
        next(err);
    }
};
exports.updateCity = updateCity;
const deleteCity = async (req, res, next) => {
    try {
        const { id } = req.params;
        const city = await models_1.City.findByIdAndDelete(id).lean();
        if (!city) {
            api_response_1.APIResponse.error(res, 'City not found', undefined, 404);
            return;
        }
        api_response_1.APIResponse.success(res, null, 'City deleted');
    }
    catch (err) {
        next(err);
    }
};
exports.deleteCity = deleteCity;
const listAreas = async (req, res, next) => {
    try {
        const { cityId } = req.params;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const search = req.query.search || '';
        const filter = { cityId };
        if (search)
            filter.name = { $regex: search, $options: 'i' };
        const total = await models_1.Area.countDocuments(filter);
        const areas = await models_1.Area.find(filter)
            .sort({ name: 1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
        api_response_1.APIResponse.paginated(res, areas, { page, limit, total, totalPages: Math.ceil(total / limit) });
    }
    catch (err) {
        next(err);
    }
};
exports.listAreas = listAreas;
const createArea = async (req, res, next) => {
    try {
        const { cityId } = req.params;
        const city = await models_1.City.findById(cityId).lean();
        if (!city) {
            api_response_1.APIResponse.error(res, 'City not found', undefined, 404);
            return;
        }
        const body = req.body;
        const name = body.name;
        if (!name) {
            api_response_1.APIResponse.error(res, 'name is required', undefined, 400);
            return;
        }
        const area = await models_1.Area.create({
            cityId,
            stateId: city.stateId,
            countryId: city.countryId,
            name,
            slug: toSlug(name),
        });
        api_response_1.APIResponse.success(res, area.toObject(), 'Area created', 201);
    }
    catch (err) {
        next(err);
    }
};
exports.createArea = createArea;
const deleteArea = async (req, res, next) => {
    try {
        const { id } = req.params;
        const area = await models_1.Area.findByIdAndDelete(id).lean();
        if (!area) {
            api_response_1.APIResponse.error(res, 'Area not found', undefined, 404);
            return;
        }
        api_response_1.APIResponse.success(res, null, 'Area deleted');
    }
    catch (err) {
        next(err);
    }
};
exports.deleteArea = deleteArea;
//# sourceMappingURL=admin-location.controller.js.map