"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.areaAutomationController = exports.AreaAutomationController = void 0;
const area_automation_engine_1 = require("../automation/area-automation-engine");
const area_iterator_1 = require("../automation/area-iterator");
const location_data_1 = require("../config/location-data");
const api_response_1 = require("../utils/api-response");
const logger_1 = require("../utils/logger");
const memory_cache_1 = require("../utils/memory-cache");
function invalidateAreaCache() {
    memory_cache_1.queryCache.deleteByPrefix('sessions:');
    memory_cache_1.queryCache.deleteByPrefix('stats:');
    memory_cache_1.queryCache.deleteByPrefix('active:');
}
class AreaAutomationController {
    async getLocationData(req, res, _next) {
        try {
            const state = req.query.state;
            const city = req.query.city;
            if (state && city) {
                const areas = area_iterator_1.areaIterator.getAreas(state, city);
                api_response_1.APIResponse.success(res, { state, city, areas }, 'Areas fetched');
                return;
            }
            if (state) {
                const cities = area_iterator_1.areaIterator.getCities(state);
                api_response_1.APIResponse.success(res, { state, cities }, 'Cities fetched');
                return;
            }
            const allStates = (0, location_data_1.getAllStates)();
            api_response_1.APIResponse.success(res, { states: allStates }, 'States fetched');
        }
        catch (error) {
            logger_1.logger.error({ err: error }, 'AreaAutomation: getLocationData failed');
            api_response_1.APIResponse.error(res, 'Failed to fetch location data');
        }
    }
    async startAutomation(req, res, _next) {
        try {
            const { businessTypes, state, cities, country, sources, name, maxLeads, concurrency, retryEnabled, dedupEnabled, aiAuditEnabled, autoOutreach, autoReport, autoWhatsApp, schedule, frequency, saveAsDraft } = req.body;
            if (saveAsDraft) {
                const session = await area_automation_engine_1.areaAutomationEngine.saveDraft(req.body);
                api_response_1.APIResponse.success(res, session, 'Draft automation saved', 201);
                return;
            }
            if (!businessTypes || !Array.isArray(businessTypes) || businessTypes.length === 0) {
                api_response_1.APIResponse.error(res, 'At least one business type is required');
                return;
            }
            if (!state) {
                api_response_1.APIResponse.error(res, 'State is required');
                return;
            }
            if (!cities || !Array.isArray(cities) || cities.length === 0) {
                api_response_1.APIResponse.error(res, 'At least one city is required');
                return;
            }
            const cleanBusinessTypes = [...new Set(businessTypes
                    .map((b) => b.trim())
                    .filter((b) => b.length > 0))];
            if (cleanBusinessTypes.length === 0) {
                api_response_1.APIResponse.error(res, 'Valid business types are required');
                return;
            }
            invalidateAreaCache();
            const session = await area_automation_engine_1.areaAutomationEngine.startAutomation({
                businessTypes: cleanBusinessTypes,
                state,
                cities,
                country,
                sources: sources || ['google-maps', 'justdial', 'indiamart'],
                name,
                maxLeads,
                concurrency,
                retryEnabled,
                dedupEnabled,
                aiAuditEnabled,
                autoOutreach,
                autoReport,
                autoWhatsApp,
                schedule,
                frequency,
            });
            api_response_1.APIResponse.success(res, session, 'Automation started successfully', 201);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error({ err: message }, 'AreaAutomation: startAutomation failed');
            api_response_1.APIResponse.error(res, `Failed to start automation: ${message}`);
        }
    }
    async listSessions(req, res, _next) {
        try {
            const { status, search, source, state, city, sortBy, sortOrder, limit, offset } = req.query;
            const cacheKey = `sessions:${status || 'all'}:${search || ''}:${source || ''}:${state || ''}:${city || ''}:${sortBy || 'createdAt'}:${sortOrder || 'desc'}:${limit || 10}:${offset || 0}`;
            const cached = memory_cache_1.queryCache.get(cacheKey);
            if (cached) {
                api_response_1.APIResponse.success(res, cached, 'Sessions fetched (cached)');
                return;
            }
            const result = await area_automation_engine_1.areaAutomationEngine.getSessionsWithFilters({
                status: status,
                search: search,
                source: source,
                state: state,
                city: city,
                sortBy: sortBy,
                sortOrder: sortOrder || 'desc',
                limit: parseInt(limit, 10) || 10,
                offset: parseInt(offset, 10) || 0,
            });
            memory_cache_1.queryCache.set(cacheKey, result, 3000);
            api_response_1.APIResponse.success(res, result, 'Sessions fetched');
        }
        catch (error) {
            logger_1.logger.error({ err: error }, 'AreaAutomation: listSessions failed');
            api_response_1.APIResponse.error(res, 'Failed to fetch sessions');
        }
    }
    async getSession(req, res, _next) {
        try {
            const { sessionId } = req.params;
            const progress = await area_automation_engine_1.areaAutomationEngine.getProgress(sessionId);
            if (!progress) {
                api_response_1.APIResponse.error(res, 'Session not found', null, 404);
                return;
            }
            api_response_1.APIResponse.success(res, progress, 'Session progress fetched');
        }
        catch (error) {
            logger_1.logger.error({ err: error }, 'AreaAutomation: getSession failed');
            api_response_1.APIResponse.error(res, 'Failed to fetch session');
        }
    }
    async getSessionSummary(req, res, _next) {
        try {
            const { sessionId } = req.params;
            const session = await area_automation_engine_1.areaAutomationEngine.getSession(sessionId);
            if (!session) {
                api_response_1.APIResponse.error(res, 'Session not found', null, 404);
                return;
            }
            api_response_1.APIResponse.success(res, session, 'Session fetched');
        }
        catch (error) {
            logger_1.logger.error({ err: error }, 'AreaAutomation: getSessionSummary failed');
            api_response_1.APIResponse.error(res, 'Failed to fetch session');
        }
    }
    async getJobs(req, res, _next) {
        try {
            const { sessionId } = req.params;
            const { status, businessType, city } = req.query;
            const jobs = await area_automation_engine_1.areaAutomationEngine.getJobs(sessionId, status, businessType, city);
            api_response_1.APIResponse.success(res, jobs, 'Jobs fetched');
        }
        catch (error) {
            logger_1.logger.error({ err: error }, 'AreaAutomation: getJobs failed');
            api_response_1.APIResponse.error(res, 'Failed to fetch jobs');
        }
    }
    async updateSession(req, res, _next) {
        try {
            invalidateAreaCache();
            const { sessionId } = req.params;
            const session = await area_automation_engine_1.areaAutomationEngine.updateSession(sessionId, req.body);
            if (!session) {
                api_response_1.APIResponse.error(res, 'Session not found', null, 404);
                return;
            }
            api_response_1.APIResponse.success(res, session, 'Automation updated successfully');
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error({ err: message }, 'AreaAutomation: updateSession failed');
            api_response_1.APIResponse.error(res, `Failed to update automation: ${message}`);
        }
    }
    async deleteSession(req, res, _next) {
        try {
            invalidateAreaCache();
            const { sessionId } = req.params;
            const deleted = await area_automation_engine_1.areaAutomationEngine.deleteSession(sessionId);
            if (!deleted) {
                api_response_1.APIResponse.error(res, 'Session not found', null, 404);
                return;
            }
            api_response_1.APIResponse.success(res, null, 'Automation deleted successfully');
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error({ err: message }, 'AreaAutomation: deleteSession failed');
            api_response_1.APIResponse.error(res, `Failed to delete automation: ${message}`);
        }
    }
    async stopAutomation(req, res, _next) {
        try {
            invalidateAreaCache();
            const { sessionId } = req.params;
            const session = await area_automation_engine_1.areaAutomationEngine.stopAutomation(sessionId);
            if (!session) {
                api_response_1.APIResponse.error(res, 'Session not found', null, 404);
                return;
            }
            api_response_1.APIResponse.success(res, session, 'Automation stopped');
        }
        catch (error) {
            logger_1.logger.error({ err: error }, 'AreaAutomation: stopAutomation failed');
            api_response_1.APIResponse.error(res, 'Failed to stop automation');
        }
    }
    async pauseAutomation(req, res, _next) {
        try {
            invalidateAreaCache();
            const { sessionId } = req.params;
            const session = await area_automation_engine_1.areaAutomationEngine.pauseAutomation(sessionId);
            if (!session) {
                api_response_1.APIResponse.error(res, 'Session not found', null, 404);
                return;
            }
            api_response_1.APIResponse.success(res, session, 'Automation paused');
        }
        catch (error) {
            logger_1.logger.error({ err: error }, 'AreaAutomation: pauseAutomation failed');
            api_response_1.APIResponse.error(res, 'Failed to pause automation');
        }
    }
    async resumeAutomation(req, res, _next) {
        try {
            invalidateAreaCache();
            const { sessionId } = req.params;
            const session = await area_automation_engine_1.areaAutomationEngine.resumeAutomation(sessionId);
            api_response_1.APIResponse.success(res, session, 'Automation resumed successfully');
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error({ err: message }, 'AreaAutomation: resumeAutomation failed');
            api_response_1.APIResponse.error(res, `Failed to resume automation: ${message}`);
        }
    }
    async restartAutomation(req, res, _next) {
        try {
            invalidateAreaCache();
            const { sessionId } = req.params;
            const session = await area_automation_engine_1.areaAutomationEngine.restartAutomation(sessionId);
            if (!session) {
                api_response_1.APIResponse.error(res, 'Session not found', null, 404);
                return;
            }
            api_response_1.APIResponse.success(res, session, 'Automation restarted');
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error({ err: message }, 'AreaAutomation: restartAutomation failed');
            api_response_1.APIResponse.error(res, `Failed to restart automation: ${message}`);
        }
    }
    async duplicateAutomation(req, res, _next) {
        try {
            invalidateAreaCache();
            const { sessionId } = req.params;
            const session = await area_automation_engine_1.areaAutomationEngine.duplicateSession(sessionId);
            if (!session) {
                api_response_1.APIResponse.error(res, 'Session not found', null, 404);
                return;
            }
            api_response_1.APIResponse.success(res, session, 'Automation duplicated', 201);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error({ err: message }, 'AreaAutomation: duplicateAutomation failed');
            api_response_1.APIResponse.error(res, `Failed to duplicate automation: ${message}`);
        }
    }
    async archiveAutomation(req, res, _next) {
        try {
            invalidateAreaCache();
            const { sessionId } = req.params;
            const session = await area_automation_engine_1.areaAutomationEngine.archiveSession(sessionId);
            if (!session) {
                api_response_1.APIResponse.error(res, 'Session not found', null, 404);
                return;
            }
            api_response_1.APIResponse.success(res, session, 'Automation archived');
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error({ err: message }, 'AreaAutomation: archiveAutomation failed');
            api_response_1.APIResponse.error(res, `Failed to archive automation: ${message}`);
        }
    }
    async getStats(_req, res, _next) {
        try {
            const cacheKey = 'stats:overview';
            const cached = memory_cache_1.queryCache.get(cacheKey);
            if (cached) {
                api_response_1.APIResponse.success(res, cached, 'Stats fetched (cached)');
                return;
            }
            const stats = await area_automation_engine_1.areaAutomationEngine.getStats();
            memory_cache_1.queryCache.set(cacheKey, stats, 3000);
            api_response_1.APIResponse.success(res, stats, 'Stats fetched');
        }
        catch (error) {
            logger_1.logger.error({ err: error }, 'AreaAutomation: getStats failed');
            api_response_1.APIResponse.error(res, 'Failed to fetch stats');
        }
    }
    async getActiveSessions(_req, res, _next) {
        try {
            const cacheKey = 'active:sessions';
            const cached = memory_cache_1.queryCache.get(cacheKey);
            if (cached) {
                api_response_1.APIResponse.success(res, { sessions: cached }, 'Active sessions fetched (cached)');
                return;
            }
            const sessions = await area_automation_engine_1.areaAutomationEngine.getActiveSessions();
            memory_cache_1.queryCache.set(cacheKey, sessions, 3000);
            api_response_1.APIResponse.success(res, { sessions }, 'Active sessions fetched');
        }
        catch (error) {
            logger_1.logger.error({ err: error }, 'AreaAutomation: getActiveSessions failed');
            api_response_1.APIResponse.error(res, 'Failed to fetch active sessions');
        }
    }
}
exports.AreaAutomationController = AreaAutomationController;
exports.areaAutomationController = new AreaAutomationController();
//# sourceMappingURL=area-automation.controller.js.map