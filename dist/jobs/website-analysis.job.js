"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.websiteAnalysisJob = exports.WebsiteAnalysisJob = void 0;
const logger_1 = require("../utils/logger");
const website_analyzer_service_1 = require("../services/website-analyzer.service");
const Lead_1 = require("../models/Lead");
const Automation_1 = require("../models/Automation");
class WebsiteAnalysisJob {
    async execute(options) {
        const { automationId, leadIds } = options;
        logger_1.logger.info(`WebsiteAnalysisJob: Starting analysis for ${leadIds.length} leads`);
        const jobExecution = await this.createJobExecution(automationId, 'website-analysis', {
            leadIdsCount: leadIds.length,
        });
        let analyzedCount = 0;
        let failedCount = 0;
        const errors = [];
        for (const leadId of leadIds) {
            try {
                const lead = await Lead_1.Lead.findById(leadId);
                if (!lead || !lead.website) {
                    failedCount++;
                    errors.push(`Lead ${leadId}: No website`);
                    continue;
                }
                const leadAnalysis = await website_analyzer_service_1.websiteAnalyzerService.analyzeLead(leadId, lead.website);
                await Lead_1.Lead.findByIdAndUpdate(leadId, {
                    websiteStatus: leadAnalysis.websiteStatus,
                    leadScore: leadAnalysis.leadScore,
                    qualificationLevel: leadAnalysis.qualificationLevel,
                    sslEnabled: leadAnalysis.analysisData.sslEnabled,
                    responseTime: leadAnalysis.analysisData.responseTime,
                    metaTitle: leadAnalysis.analysisData.metaTitle,
                    metaDescription: leadAnalysis.analysisData.metaDescription,
                    hasContactPage: leadAnalysis.analysisData.hasContactPage,
                    hasSocialLinks: leadAnalysis.analysisData.hasSocialLinks,
                    analyzedAt: new Date(leadAnalysis.analyzedAt),
                });
                analyzedCount++;
                jobExecution.logs.push(`Analyzed ${lead.companyName}: Score ${leadAnalysis.leadScore}`);
                await jobExecution.save();
            }
            catch (error) {
                logger_1.logger.warn(`WebsiteAnalysisJob: Failed for lead ${leadId}:`, error.message);
                failedCount++;
                errors.push(error.message);
            }
        }
        await this.updateJobExecution(jobExecution.id, {
            status: 'completed',
            totalLeadsGenerated: analyzedCount,
            completedAt: new Date(),
        });
        logger_1.logger.info(`WebsiteAnalysisJob: Completed - ${analyzedCount} analyzed, ${failedCount} failed`);
        return {
            success: analyzedCount > 0,
            analyzedCount,
            failedCount,
            errors,
        };
    }
    async createJobExecution(automationId, jobType, metadata) {
        const jobExecution = new Automation_1.JobExecution({
            automationId,
            jobType,
            status: 'running',
            startedAt: new Date(),
            metadata,
            logs: [],
        });
        return await jobExecution.save();
    }
    async updateJobExecution(jobExecutionId, updates) {
        await Automation_1.JobExecution.findByIdAndUpdate(jobExecutionId, updates);
    }
}
exports.WebsiteAnalysisJob = WebsiteAnalysisJob;
exports.websiteAnalysisJob = new WebsiteAnalysisJob();
//# sourceMappingURL=website-analysis.job.js.map