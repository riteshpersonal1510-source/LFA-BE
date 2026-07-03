"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.salesIntelligenceController = exports.SalesIntelligenceController = void 0;
const sales_intelligence_service_1 = require("../services/sales-intelligence.service");
const logger_1 = require("../utils/logger");
class SalesIntelligenceController {
    async analyzeSingleLead(req, res) {
        try {
            const { leadId } = req.params;
            logger_1.logger.info(`AI sales intelligence request for lead ${leadId}`);
            const lead = await sales_intelligence_service_1.salesIntelligenceService.analyzeLead(leadId);
            if (!lead) {
                res.status(404).json({ success: false, message: 'Lead not found or analysis failed' });
                return;
            }
            res.status(200).json({
                success: true,
                message: 'AI sales intelligence completed successfully',
                data: {
                    leadId: lead._id,
                    aiLeadScore: lead.aiLeadScore,
                    salesPriority: lead.salesPriority,
                    conversionProbability: lead.conversionProbability,
                    aiInsight: lead.aiInsight,
                    salesIntelligenceCompleted: lead.salesIntelligenceCompleted,
                },
            });
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), 'Sales intelligence single lead error:');
            res.status(500).json({ success: false, message: 'Failed to analyze lead', error: error instanceof Error ? error.message : String(error) });
        }
    }
    async analyzeMultipleLeads(req, res) {
        try {
            const { leadIds } = req.body;
            if (!Array.isArray(leadIds) || leadIds.length === 0) {
                res.status(400).json({ success: false, message: 'leadIds array is required' });
                return;
            }
            logger_1.logger.info(`Bulk sales intelligence request for ${leadIds.length} leads`);
            const result = await sales_intelligence_service_1.salesIntelligenceService.analyzeMultipleLeads(leadIds);
            res.status(200).json({ success: true, message: result.message, data: result });
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), 'Sales intelligence bulk error:');
            res.status(500).json({ success: false, message: 'Failed to analyze leads', error: error instanceof Error ? error.message : String(error) });
        }
    }
    async analyzeLeadsWithoutAnalysis(req, res) {
        try {
            const { limit } = req.body;
            logger_1.logger.info(`Analyze leads without sales intelligence (limit: ${limit || 50})`);
            const result = await sales_intelligence_service_1.salesIntelligenceService.analyzeLeadsWithoutAnalysis({ limit });
            res.status(200).json({ success: true, message: result.message, data: result });
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), 'Analyze without sales intelligence error:');
            res.status(500).json({ success: false, message: 'Failed to analyze leads', error: error instanceof Error ? error.message : String(error) });
        }
    }
    async getSalesStats(_req, res) {
        try {
            const stats = await sales_intelligence_service_1.salesIntelligenceService.getSalesStats();
            res.status(200).json({ success: true, message: 'Sales intelligence statistics retrieved', data: stats });
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), 'Get sales stats error:');
            res.status(500).json({ success: false, message: 'Failed to get sales statistics', error: error instanceof Error ? error.message : String(error) });
        }
    }
}
exports.SalesIntelligenceController = SalesIntelligenceController;
exports.salesIntelligenceController = new SalesIntelligenceController();
//# sourceMappingURL=sales-intelligence.controller.js.map