"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiLeadAnalysisService = exports.AILeadAnalysisService = exports.AIClient = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
class AIClient {
    constructor() {
        this.baseUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
        this.timeout = parseInt(process.env.AI_SERVICE_TIMEOUT || '30000', 10);
        this.client = axios_1.default.create({
            baseURL: this.baseUrl,
            timeout: this.timeout,
            headers: {
                'Content-Type': 'application/json',
            },
        });
        this.client.interceptors.request.use((config) => {
            logger_1.logger.debug(`AI Service: ${config.method?.toUpperCase()} ${config.url}`);
            return config;
        }, (error) => {
            logger_1.logger.error(error, 'AI Service: Request error');
            return Promise.reject(error);
        });
        this.client.interceptors.response.use((response) => {
            logger_1.logger.debug(`AI Service: Response status ${response.status}`);
            return response;
        }, (error) => {
            logger_1.logger.error(error, 'AI Service: Response error');
            return Promise.reject(error);
        });
    }
    async analyzeLead(leadData) {
        try {
            const response = await this.client.post('/api/v1/analyze-lead', leadData);
            return response.data;
        }
        catch (error) {
            logger_1.logger.error('AI Service: Lead analysis failed', error);
            throw new Error(`AI Analysis failed: ${error.message}`);
        }
    }
    async analyzeBulkLeads(leads, batchSize = 10) {
        try {
            const request = {
                leads,
                batchSize,
            };
            const response = await this.client.post('/api/v1/bulk-analyze', request);
            return response.data;
        }
        catch (error) {
            logger_1.logger.error('AI Service: Bulk analysis failed', error);
            throw new Error(`Bulk AI Analysis failed: ${error.message}`);
        }
    }
    async analyzeScoreOnly(leadData) {
        try {
            const response = await this.client.post('/api/v1/score-only', leadData);
            return response.data;
        }
        catch (error) {
            logger_1.logger.error('AI Service: Score-only analysis failed', error);
            throw new Error(`AI Score analysis failed: ${error.message}`);
        }
    }
    async checkHealth() {
        try {
            await this.client.get('/api/v1/health');
            return true;
        }
        catch (error) {
            logger_1.logger.warn(error instanceof Error ? error : new Error(String(error)), 'AI Service: Health check failed');
            return false;
        }
    }
}
exports.AIClient = AIClient;
class AILeadAnalysisService {
    constructor() {
        this.client = new AIClient();
    }
    async analyzeLead(lead) {
        const leadData = {
            companyName: lead.companyName,
            website: lead.website,
            category: lead.category,
            websiteStatus: lead.websiteStatus,
            sslEnabled: lead.sslEnabled,
            responseTime: lead.responseTime,
            metaTitle: lead.metaTitle,
            metaDescription: lead.metaDescription,
            hasContactPage: lead.hasContactPage,
            hasSocialLinks: !!lead.hasSocialLinks,
            rating: lead.rating,
            reviewsCount: lead.reviewsCount,
            leadScore: lead.leadScore,
        };
        const aiResult = await this.client.analyzeLead(leadData);
        lead.leadScore = aiResult.leadScore;
        lead.qualificationLevel = aiResult.qualificationLevel;
        lead.websiteStatus = this.mapAIWebsiteStatus(aiResult.qualificationLevel);
        lead.analyzedAt = new Date(aiResult.analysisTimestamp);
        lead.hasSocialLinks.aiSummary = aiResult.summary;
        lead.hasSocialLinks.aiWeaknesses = aiResult.websiteWeaknesses;
        lead.hasSocialLinks.aiOpportunities = aiResult.businessOpportunities;
        return lead;
    }
    async analyzeBulkLeads(leads, batchSize = 10) {
        const leadDataArray = leads.map(lead => ({
            companyName: lead.companyName,
            website: lead.website,
            category: lead.category,
            websiteStatus: lead.websiteStatus,
            sslEnabled: lead.sslEnabled,
            responseTime: lead.responseTime,
            metaTitle: lead.metaTitle,
            metaDescription: lead.metaDescription,
            hasContactPage: lead.hasContactPage,
            hasSocialLinks: !!lead.hasSocialLinks,
            rating: lead.rating,
            reviewsCount: lead.reviewsCount,
            leadScore: lead.leadScore,
        }));
        const aiResult = await this.client.analyzeBulkLeads(leadDataArray, batchSize);
        const updatedLeads = [];
        let failed = 0;
        for (let i = 0; i < aiResult.results.length; i++) {
            try {
                const lead = leads[i];
                const aiAnalysis = aiResult.results[i];
                lead.leadScore = aiAnalysis.leadScore;
                lead.qualificationLevel = aiAnalysis.qualificationLevel;
                lead.websiteStatus = this.mapAIWebsiteStatus(aiAnalysis.qualificationLevel);
                lead.analyzedAt = new Date(aiAnalysis.analysisTimestamp);
                lead.hasSocialLinks.aiSummary = aiAnalysis.summary;
                lead.hasSocialLinks.aiWeaknesses = aiAnalysis.websiteWeaknesses;
                lead.hasSocialLinks.aiOpportunities = aiAnalysis.businessOpportunities;
                updatedLeads.push(lead);
            }
            catch (error) {
                failed++;
            }
        }
        return {
            totalProcessed: aiResult.totalProcessed,
            successful: aiResult.successful,
            failed: failed,
            leads: updatedLeads,
        };
    }
    async isServiceAvailable() {
        return this.client.checkHealth();
    }
    mapAIWebsiteStatus(qualification) {
        switch (qualification) {
            case 'high-potential':
                return 'modern-website';
            case 'medium-potential':
                return 'average-website';
            case 'low-potential':
                return 'outdated-website';
            default:
                return 'unknown';
        }
    }
}
exports.AILeadAnalysisService = AILeadAnalysisService;
exports.aiLeadAnalysisService = new AILeadAnalysisService();
//# sourceMappingURL=ai-analysis.service.js.map