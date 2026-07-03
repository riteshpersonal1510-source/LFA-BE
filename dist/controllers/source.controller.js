"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sourceController = exports.SourceController = void 0;
const source_manager_1 = require("../source-manager/source-manager");
const api_response_1 = require("../utils/api-response");
class SourceController {
    async searchBySources(req, res, next) {
        try {
            const { keyword, location, sources, limit } = req.body;
            if (!keyword || !sources || sources.length === 0) {
                api_response_1.APIResponse.error(res, 'keyword and sources are required', null, 400);
                return;
            }
            const result = await source_manager_1.sourceManager.scrapeMultiSource({
                keyword,
                location,
                sources,
                limit: limit || 50,
            });
            api_response_1.APIResponse.success(res, result, result.message, result.success ? 200 : 206);
        }
        catch (error) {
            next(error);
        }
    }
    async getSources(_req, res, next) {
        try {
            const sources = source_manager_1.sourceManager.getAllSources().map((s) => ({
                name: s.getName(),
                enabled: true,
            }));
            api_response_1.APIResponse.success(res, sources, 'Sources fetched successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async getSourceStatus(_req, res, next) {
        try {
            const status = source_manager_1.sourceManager.getSourcesStatus();
            api_response_1.APIResponse.success(res, status, 'Source status fetched successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async enableSource(req, res, next) {
        try {
            const { sourceName } = req.params;
            const success = source_manager_1.sourceManager.enableSource(sourceName);
            if (success) {
                api_response_1.APIResponse.success(res, null, `Source ${sourceName} enabled`);
            }
            else {
                api_response_1.APIResponse.error(res, 'Source not found', null, 404);
            }
        }
        catch (error) {
            next(error);
        }
    }
    async disableSource(req, res, next) {
        try {
            const { sourceName } = req.params;
            const success = source_manager_1.sourceManager.disableSource(sourceName);
            if (success) {
                api_response_1.APIResponse.success(res, null, `Source ${sourceName} disabled`);
            }
            else {
                api_response_1.APIResponse.error(res, 'Source not found', null, 404);
            }
        }
        catch (error) {
            next(error);
        }
    }
}
exports.SourceController = SourceController;
exports.sourceController = new SourceController();
//# sourceMappingURL=source.controller.js.map