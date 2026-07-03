"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const lead_controller_1 = require("../controllers/lead.controller");
const lead_qualification_service_1 = require("../services/lead-qualification.service");
const error_handler_1 = require("../utils/error-handler");
const api_response_1 = require("../utils/api-response");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const validate_objectid_middleware_1 = require("../middlewares/validate-objectid.middleware");
const router = (0, express_1.Router)();
const leadQualificationService = new lead_qualification_service_1.LeadQualificationService();
router.get('/', (0, error_handler_1.asyncHandler)((req, res, next) => lead_controller_1.leadController.getLeads(req, res, next)));
router.get('/statistics', (0, error_handler_1.asyncHandler)((req, res, next) => lead_controller_1.leadController.getLeadStatistics(req, res, next)));
router.get('/filter-options', (0, error_handler_1.asyncHandler)((req, res, next) => lead_controller_1.leadController.getFilterOptions(req, res, next)));
router.get('/filter-counts', (0, error_handler_1.asyncHandler)((req, res, next) => lead_controller_1.leadController.getFilterCounts(req, res, next)));
router.get('/categories', (0, error_handler_1.asyncHandler)((req, res, next) => lead_controller_1.leadController.getCategories(req, res, next)));
router.get('/keyword-stats', (0, error_handler_1.asyncHandler)((req, res, next) => lead_controller_1.leadController.getKeywordStats(req, res, next)));
router.delete('/delete-all', auth_middleware_1.authenticate, (0, error_handler_1.asyncHandler)((req, res, next) => lead_controller_1.leadController.deleteAllLeads(req, res, next)));
router.get('/stats', (0, error_handler_1.asyncHandler)((req, res, next) => lead_controller_1.leadController.getQualificationStats(req, res, next)));
router.get('/qualified', (0, error_handler_1.asyncHandler)(async (req, res, _next) => {
    const page = parseInt(req.query.page?.toString() || '1', 10);
    const limit = parseInt(req.query.limit?.toString() || '10', 10);
    const qualificationLevel = req.query.qualificationLevel?.toString();
    const websiteStatus = req.query.websiteStatus?.toString();
    const minLeadScore = req.query.minLeadScore ? parseFloat(req.query.minLeadScore.toString()) : undefined;
    const maxLeadScore = req.query.maxLeadScore ? parseFloat(req.query.maxLeadScore.toString()) : undefined;
    const result = await leadQualificationService.getQualifiedLeads({
        page, limit, qualificationLevel, websiteStatus, minLeadScore, maxLeadScore,
    });
    api_response_1.APIResponse.success(res, result, 'Qualified leads fetched successfully');
}));
router.get('/:id', (0, validate_objectid_middleware_1.validateObjectId)('id'), (0, error_handler_1.asyncHandler)((req, res, next) => lead_controller_1.leadController.getLead(req, res, next)));
router.post('/', (0, error_handler_1.asyncHandler)((req, res, next) => lead_controller_1.leadController.createLead(req, res, next)));
router.post('/bulk-analyze', (0, error_handler_1.asyncHandler)((req, res, next) => lead_controller_1.leadController.bulkAnalyzeLeads(req, res, next)));
router.post('/requalify', (0, error_handler_1.asyncHandler)((req, res, next) => lead_controller_1.leadController.requalifyUnanalyzedLeads(req, res, next)));
router.post('/audit/trigger', (0, error_handler_1.asyncHandler)((req, res, next) => lead_controller_1.leadController.triggerLeadAudits(req, res, next)));
router.post('/audit/trigger-bulk', (0, error_handler_1.asyncHandler)((req, res, next) => lead_controller_1.leadController.triggerBulkAudits(req, res, next)));
router.post('/audit/trigger-all', (0, error_handler_1.asyncHandler)((req, res, next) => lead_controller_1.leadController.triggerAllMissingAudits(req, res, next)));
router.post('/audit/reprocess-all', (0, error_handler_1.asyncHandler)((req, res, next) => lead_controller_1.leadController.reprocessAllLeads(req, res, next)));
router.post('/reclassify', (0, error_handler_1.asyncHandler)((req, res, next) => lead_controller_1.leadController.reclassifyLeads(req, res, next)));
router.get('/classification-stats', (0, error_handler_1.asyncHandler)((req, res, next) => lead_controller_1.leadController.getClassificationStats(req, res, next)));
router.post('/:id/analyze', (0, validate_objectid_middleware_1.validateObjectId)('id'), (0, error_handler_1.asyncHandler)((req, res, next) => lead_controller_1.leadController.analyzeLead(req, res, next)));
router.put('/:id', (0, validate_objectid_middleware_1.validateObjectId)('id'), (0, error_handler_1.asyncHandler)((req, res, next) => lead_controller_1.leadController.updateLead(req, res, next)));
router.delete('/:id', (0, validate_objectid_middleware_1.validateObjectId)('id'), (0, error_handler_1.asyncHandler)((req, res, next) => lead_controller_1.leadController.deleteLead(req, res, next)));
exports.default = router;
//# sourceMappingURL=leads.route.js.map