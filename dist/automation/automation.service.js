"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.automationService = exports.AutomationService = void 0;
const logger_1 = require("../utils/logger");
const Automation_1 = require("../models/Automation");
const workflow_manager_1 = require("./workflow-manager");
class AutomationService {
    async createAutomation(options) {
        const { keyword, location, frequency, limit = 50, category } = options;
        logger_1.logger.info(`AutomationService: Creating automation for "${keyword}" in "${location}"`);
        if (!keyword || keyword.trim().length < 2) {
            throw new Error('Keyword must be at least 2 characters');
        }
        if (!location || location.trim().length < 2) {
            throw new Error('Location must be at least 2 characters');
        }
        const automation = new Automation_1.Automation({
            keyword,
            location,
            frequency,
            limit,
            category,
            status: 'active',
            nextRunAt: new Date(),
        });
        await automation.save();
        logger_1.logger.info(`AutomationService: Created automation with ID: ${automation.id}`);
        return automation;
    }
    async getAllAutomations(options = {}) {
        const { page = 1, limit = 10, status, keyword } = options;
        const query = {};
        if (status) {
            query.status = status;
        }
        if (keyword) {
            query.keyword = { $regex: keyword, $options: 'i' };
        }
        const skip = (page - 1) * limit;
        const [automations, total] = await Promise.all([
            Automation_1.Automation.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Automation_1.Automation.countDocuments(query),
        ]);
        const totalPages = Math.ceil(total / limit);
        return {
            automations,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        };
    }
    async getAutomationById(id) {
        return await Automation_1.Automation.findById(id);
    }
    async updateAutomation(id, options) {
        const automation = await Automation_1.Automation.findByIdAndUpdate(id, options, { new: true });
        if (!automation) {
            throw new Error('Automation not found');
        }
        logger_1.logger.info(`AutomationService: Updated automation ${id}`);
        return automation;
    }
    async toggleAutomation(id) {
        const automation = await Automation_1.Automation.findById(id);
        if (!automation) {
            throw new Error('Automation not found');
        }
        const newStatus = automation.status === 'active' ? 'paused' : 'active';
        const updated = await Automation_1.Automation.findByIdAndUpdate(id, {
            status: newStatus,
        }, { new: true });
        logger_1.logger.info(`AutomationService: Toggled automation ${id} to ${newStatus}`);
        return updated;
    }
    async deleteAutomation(id) {
        await workflow_manager_1.workflowManager.deleteAutomation(id);
    }
    async runAutomation(id) {
        const automation = await Automation_1.Automation.findById(id);
        if (!automation) {
            throw new Error('Automation not found');
        }
        return await workflow_manager_1.workflowManager.executeWorkflow(id, {
            keyword: automation.keyword,
            location: automation.location,
            limit: automation.limit,
            category: automation.category,
            triggerType: 'manual',
        });
    }
    async getAutomationLogs(id, options = {}) {
        const { page = 1, limit = 10, jobType } = options;
        const query = { automationId: id };
        if (jobType) {
            query.jobType = jobType;
        }
        const skip = (page - 1) * limit;
        const [logs, total] = await Promise.all([
            Automation_1.JobExecution.find(query)
                .sort({ startedAt: -1 })
                .skip(skip)
                .limit(limit),
            Automation_1.JobExecution.countDocuments(query),
        ]);
        const totalPages = Math.ceil(total / limit);
        return {
            logs,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        };
    }
    async getAutomationStatistics(id) {
        return await workflow_manager_1.workflowManager.getStatistics(id);
    }
    async getExportHistory(id, options = {}) {
        const { page = 1, limit = 10, exportType } = options;
        const query = { automationId: id };
        if (exportType) {
            query.exportType = exportType;
        }
        const skip = (page - 1) * limit;
        const [exports, total] = await Promise.all([
            Automation_1.ExportHistory.find(query)
                .sort({ generatedAt: -1 })
                .skip(skip)
                .limit(limit),
            Automation_1.ExportHistory.countDocuments(query),
        ]);
        const totalPages = Math.ceil(total / limit);
        return {
            exports,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        };
    }
}
exports.AutomationService = AutomationService;
exports.automationService = new AutomationService();
//# sourceMappingURL=automation.service.js.map