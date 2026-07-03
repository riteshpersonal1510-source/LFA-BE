"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.automationController = exports.AutomationController = void 0;
const automation_service_1 = require("../automation/automation.service");
const api_response_1 = require("../utils/api-response");
class AutomationController {
    async createAutomation(req, res, next) {
        try {
            const { keyword, location, frequency, limit, category } = req.body;
            if (!keyword || !location || !frequency) {
                api_response_1.APIResponse.error(res, 'keyword, location, and frequency are required', null, 400);
                return;
            }
            const automation = await automation_service_1.automationService.createAutomation({
                keyword,
                location,
                frequency,
                limit: limit || 50,
                category,
            });
            api_response_1.APIResponse.success(res, automation, 'Automation created successfully', 201);
        }
        catch (error) {
            next(error);
        }
    }
    async getAllAutomations(req, res, next) {
        try {
            const page = parseInt(req.query.page?.toString() || '1', 10);
            const limit = parseInt(req.query.limit?.toString() || '10', 10);
            const status = req.query.status?.toString();
            const keyword = req.query.keyword?.toString();
            const result = await automation_service_1.automationService.getAllAutomations({
                page,
                limit,
                status: status,
                keyword,
            });
            api_response_1.APIResponse.success(res, result, 'Automations fetched successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async getAutomation(req, res, next) {
        try {
            const automation = await automation_service_1.automationService.getAutomationById(req.params.id);
            if (!automation) {
                api_response_1.APIResponse.error(res, 'Automation not found', null, 404);
                return;
            }
            api_response_1.APIResponse.success(res, automation, 'Automation fetched successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async updateAutomation(req, res, _next) {
        try {
            const automation = await automation_service_1.automationService.updateAutomation(req.params.id, req.body);
            api_response_1.APIResponse.success(res, automation, 'Automation updated successfully');
        }
        catch (error) {
            api_response_1.APIResponse.error(res, error.message, null, 404);
        }
    }
    async toggleAutomation(req, res, _next) {
        try {
            const automation = await automation_service_1.automationService.toggleAutomation(req.params.id);
            api_response_1.APIResponse.success(res, automation, 'Automation status toggled');
        }
        catch (error) {
            api_response_1.APIResponse.error(res, error.message, null, 404);
        }
    }
    async deleteAutomation(req, res, next) {
        try {
            await automation_service_1.automationService.deleteAutomation(req.params.id);
            api_response_1.APIResponse.success(res, null, 'Automation deleted successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async runAutomation(req, res, next) {
        try {
            const result = await automation_service_1.automationService.runAutomation(req.params.id);
            if (result.success) {
                api_response_1.APIResponse.success(res, result, 'Automation run completed');
            }
            else {
                api_response_1.APIResponse.error(res, 'Automation run failed', result.errors, 400);
            }
        }
        catch (error) {
            next(error);
        }
    }
    async getAutomationLogs(req, res, next) {
        try {
            const page = parseInt(req.query.page?.toString() || '1', 10);
            const limit = parseInt(req.query.limit?.toString() || '10', 10);
            const jobType = req.query.jobType?.toString();
            const result = await automation_service_1.automationService.getAutomationLogs(req.params.id, {
                page,
                limit,
                jobType: jobType,
            });
            api_response_1.APIResponse.success(res, result, 'Automation logs fetched successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async getAutomationStatistics(req, res, next) {
        try {
            const stats = await automation_service_1.automationService.getAutomationStatistics(req.params.id);
            api_response_1.APIResponse.success(res, stats, 'Automation statistics fetched successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async getExportHistory(req, res, next) {
        try {
            const page = parseInt(req.query.page?.toString() || '1', 10);
            const limit = parseInt(req.query.limit?.toString() || '10', 10);
            const exportType = req.query.exportType?.toString();
            const result = await automation_service_1.automationService.getExportHistory(req.params.id, {
                page,
                limit,
                exportType,
            });
            api_response_1.APIResponse.success(res, result, 'Export history fetched successfully');
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AutomationController = AutomationController;
exports.automationController = new AutomationController();
//# sourceMappingURL=automation.controller.js.map