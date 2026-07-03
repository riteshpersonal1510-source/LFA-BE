"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadFiltersController = exports.LeadFiltersController = void 0;
const Lead_1 = require("../models/Lead");
const logger_1 = require("../utils/logger");
class LeadFiltersController {
    async getStates(_req, res, _next) {
        try {
            const states = await Lead_1.Lead.distinct('searchedState', {
                searchedState: { $exists: true, $nin: [null, ''] },
            }).sort();
            logger_1.logger.info(`[LeadFilters] States count: ${states.length}`);
            res.status(200).json({
                success: true,
                data: states,
            });
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error({ err: errMsg }, '[LeadFilters] Failed to get states');
            res.status(500).json({
                success: false,
                message: `Failed to fetch states: ${errMsg}`,
            });
        }
    }
    async getCities(req, res, _next) {
        try {
            const { state } = req.query;
            if (!state || typeof state !== 'string') {
                res.status(400).json({
                    success: false,
                    message: 'State parameter is required',
                });
                return;
            }
            const cities = await Lead_1.Lead.distinct('searchedCity', {
                searchedState: state,
                searchedCity: { $exists: true, $nin: [null, ''] },
            }).sort();
            logger_1.logger.info(`[LeadFilters] Cities for ${state}: ${cities.length}`);
            res.status(200).json({
                success: true,
                data: cities,
            });
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error({ err: errMsg, state: req.query.state }, '[LeadFilters] Failed to get cities');
            res.status(500).json({
                success: false,
                message: `Failed to fetch cities: ${errMsg}`,
            });
        }
    }
    async getAreas(req, res, _next) {
        try {
            const { city, state } = req.query;
            if (!city || typeof city !== 'string') {
                res.status(400).json({
                    success: false,
                    message: 'City parameter is required',
                });
                return;
            }
            const areasQuery = {
                searchedCity: city,
                searchedArea: { $exists: true, $nin: [null, ''] },
            };
            if (state && typeof state === 'string') {
                areasQuery.searchedState = state;
            }
            const areas = await Lead_1.Lead.distinct('searchedArea', areasQuery).sort();
            logger_1.logger.info(`[LeadFilters] Areas for ${city}, ${state || 'all states'}: ${areas.length}`);
            res.status(200).json({
                success: true,
                data: areas,
            });
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error({ err: errMsg, city: req.query.city, state: req.query.state }, '[LeadFilters] Failed to get areas');
            res.status(500).json({
                success: false,
                message: `Failed to fetch areas: ${errMsg}`,
            });
        }
    }
}
exports.LeadFiltersController = LeadFiltersController;
exports.leadFiltersController = new LeadFiltersController();
//# sourceMappingURL=lead-filters.controller.js.map