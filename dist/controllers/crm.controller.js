"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crmController = exports.CRMController = void 0;
const crm_service_1 = require("../services/crm.service");
const api_response_1 = require("../utils/api-response");
class CRMController {
    async getLeads(req, res, next) {
        try {
            const { stage, page = '1', limit = '20' } = req.query;
            const pageNum = parseInt(page, 10);
            const limitNum = parseInt(limit, 10);
            let leads;
            let pagination;
            if (stage && typeof stage === 'string') {
                const result = await crm_service_1.crmService.getLeadsByStage(stage, { page: pageNum, limit: limitNum });
                leads = result.leads;
                pagination = result.pagination;
            }
            else {
                const result = await crm_service_1.crmService.getAllLeads({ page: pageNum, limit: limitNum });
                leads = result.leads;
                pagination = result.pagination;
            }
            api_response_1.APIResponse.success(res, { leads, pagination }, 'Leads fetched');
        }
        catch (error) {
            next(error);
        }
    }
    async updateStage(req, res, next) {
        try {
            const { leadId } = req.params;
            const { stage } = req.body;
            const userId = req.user?.id;
            if (!stage) {
                api_response_1.APIResponse.error(res, 'Stage is required', null, 400);
                return;
            }
            const result = await crm_service_1.crmService.updateLeadStage(leadId, stage, userId);
            if (!result.success) {
                api_response_1.APIResponse.error(res, result.message, null, 404);
                return;
            }
            api_response_1.APIResponse.success(res, result, result.message);
        }
        catch (error) {
            next(error);
        }
    }
    async updateLead(req, res, next) {
        try {
            const { leadId } = req.params;
            const userId = req.user?.id;
            const result = await crm_service_1.crmService.updateLeadCRMFields(leadId, req.body, userId);
            if (!result.success) {
                api_response_1.APIResponse.error(res, result.message, null, 404);
                return;
            }
            api_response_1.APIResponse.success(res, result, result.message);
        }
        catch (error) {
            next(error);
        }
    }
    async addNote(req, res, next) {
        try {
            const { leadId } = req.params;
            const { content } = req.body;
            const userId = req.user?.id;
            if (!content) {
                api_response_1.APIResponse.error(res, 'Note content is required', null, 400);
                return;
            }
            const result = await crm_service_1.crmService.addNote(leadId, content, userId);
            if (!result.success) {
                api_response_1.APIResponse.error(res, result.message, null, 404);
                return;
            }
            api_response_1.APIResponse.success(res, result, result.message, 201);
        }
        catch (error) {
            next(error);
        }
    }
    async updateNote(req, res, next) {
        try {
            const { noteId } = req.params;
            const { content } = req.body;
            const userId = req.user?.id;
            if (!content) {
                api_response_1.APIResponse.error(res, 'Note content is required', null, 400);
                return;
            }
            const result = await crm_service_1.crmService.updateNote(noteId, content, userId);
            if (!result.success) {
                api_response_1.APIResponse.error(res, result.message, null, 404);
                return;
            }
            api_response_1.APIResponse.success(res, result, result.message);
        }
        catch (error) {
            next(error);
        }
    }
    async deleteNote(req, res, next) {
        try {
            const { noteId } = req.params;
            const userId = req.user?.id;
            const result = await crm_service_1.crmService.deleteNote(noteId, userId);
            if (!result.success) {
                api_response_1.APIResponse.error(res, result.message, null, 404);
                return;
            }
            api_response_1.APIResponse.success(res, null, result.message);
        }
        catch (error) {
            next(error);
        }
    }
    async getNotes(req, res, next) {
        try {
            const { leadId } = req.params;
            const notes = await crm_service_1.crmService.getNotes(leadId);
            api_response_1.APIResponse.success(res, notes, 'Notes fetched');
        }
        catch (error) {
            next(error);
        }
    }
    async createFollowUp(req, res, next) {
        try {
            const { leadId } = req.params;
            const { dueDate, note } = req.body;
            const userId = req.user?.id;
            if (!dueDate) {
                api_response_1.APIResponse.error(res, 'Due date is required', null, 400);
                return;
            }
            const result = await crm_service_1.crmService.createFollowUp(leadId, new Date(dueDate), note, userId);
            if (!result.success) {
                api_response_1.APIResponse.error(res, result.message, null, 404);
                return;
            }
            api_response_1.APIResponse.success(res, result, result.message, 201);
        }
        catch (error) {
            next(error);
        }
    }
    async updateFollowUp(req, res, next) {
        try {
            const { followUpId } = req.params;
            const updates = req.body;
            const userId = req.user?.id;
            const result = await crm_service_1.crmService.updateFollowUp(followUpId, updates, userId);
            if (!result.success) {
                api_response_1.APIResponse.error(res, result.message, null, 404);
                return;
            }
            api_response_1.APIResponse.success(res, result, result.message);
        }
        catch (error) {
            next(error);
        }
    }
    async deleteFollowUp(req, res, next) {
        try {
            const { followUpId } = req.params;
            const userId = req.user?.id;
            const result = await crm_service_1.crmService.deleteFollowUp(followUpId, userId);
            if (!result.success) {
                api_response_1.APIResponse.error(res, result.message, null, 404);
                return;
            }
            api_response_1.APIResponse.success(res, null, result.message);
        }
        catch (error) {
            next(error);
        }
    }
    async getFollowUps(req, res, next) {
        try {
            const { leadId } = req.params;
            const followUps = await crm_service_1.crmService.getFollowUps(leadId);
            api_response_1.APIResponse.success(res, followUps, 'Follow-ups fetched');
        }
        catch (error) {
            next(error);
        }
    }
    async getActivities(req, res, next) {
        try {
            const { leadId } = req.params;
            const { type, limit } = req.query;
            const activities = await crm_service_1.crmService.getActivities(leadId, {
                type: type, limit: parseInt(limit, 10),
            });
            api_response_1.APIResponse.success(res, activities, 'Activities fetched');
        }
        catch (error) {
            next(error);
        }
    }
    async getStats(_req, res, next) {
        try {
            const stats = await crm_service_1.crmService.getCRMStats();
            api_response_1.APIResponse.success(res, stats, 'CRM stats fetched');
        }
        catch (error) {
            next(error);
        }
    }
    async getAnalytics(_req, res, next) {
        try {
            const analytics = await crm_service_1.crmService.getCRMAnalytics();
            api_response_1.APIResponse.success(res, analytics, 'CRM analytics fetched');
        }
        catch (error) {
            next(error);
        }
    }
    async getLeadDetails(req, res, next) {
        try {
            const { leadId } = req.params;
            const details = await crm_service_1.crmService.getLeadDetails(leadId);
            if (!details) {
                api_response_1.APIResponse.error(res, 'Lead not found', null, 404);
                return;
            }
            api_response_1.APIResponse.success(res, details, 'Lead details fetched');
        }
        catch (error) {
            next(error);
        }
    }
    async getPipeline(_req, res, next) {
        try {
            const pipeline = await crm_service_1.crmService.getPipeline();
            api_response_1.APIResponse.success(res, pipeline, 'Pipeline fetched');
        }
        catch (error) {
            next(error);
        }
    }
    async assignLead(req, res, next) {
        try {
            const { leadId } = req.params;
            const { userId } = req.body;
            const assignedBy = req.user?.id;
            const result = await crm_service_1.crmService.assignLead(leadId, userId, assignedBy);
            if (!result.success) {
                api_response_1.APIResponse.error(res, result.message, null, 404);
                return;
            }
            api_response_1.APIResponse.success(res, result, result.message);
        }
        catch (error) {
            next(error);
        }
    }
    async moveLead(req, res, next) {
        try {
            const { leadId } = req.params;
            const { fromStage, toStage } = req.body;
            const userId = req.user?.id;
            const result = await crm_service_1.crmService.moveLead(leadId, fromStage, toStage, userId);
            if (!result.success) {
                api_response_1.APIResponse.error(res, result.message, null, 400);
                return;
            }
            api_response_1.APIResponse.success(res, result, result.message);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.CRMController = CRMController;
exports.crmController = new CRMController();
//# sourceMappingURL=crm.controller.js.map