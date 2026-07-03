"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workflowManager = exports.WorkflowManager = void 0;
const logger_1 = require("../utils/logger");
const Automation_1 = require("../models/Automation");
const lead_generation_job_1 = require("../jobs/lead-generation.job");
const website_analysis_job_1 = require("../jobs/website-analysis.job");
const contact_extraction_job_1 = require("../jobs/contact-extraction.job");
const export_generation_job_1 = require("../jobs/export-generation.job");
const Lead_1 = require("../models/Lead");
const Automation_2 = require("../models/Automation");
class WorkflowManager {
    async executeWorkflow(automationId, options) {
        const { keyword, location, limit, category, triggerType } = options;
        logger_1.logger.info(`WorkflowManager: Starting workflow for "${keyword}" in "${location}"`);
        const workflowExecution = await Automation_1.JobExecution.create({
            automationId,
            jobType: 'workflow-execution',
            status: 'running',
            startedAt: new Date(),
            logs: [`Started workflow: ${triggerType}`],
        });
        const errors = [];
        let totalLeads = 0;
        let totalAnalyzed = 0;
        let totalExtracted = 0;
        try {
            const scrapeResult = await lead_generation_job_1.leadGenerationJob.execute({
                automationId,
                keyword,
                location,
                limit,
                categoryId: category,
            });
            if (!scrapeResult.success) {
                throw new Error(scrapeResult.errors.length > 0 ? scrapeResult.errors[0] : 'Lead generation failed');
            }
            totalLeads = scrapeResult.leadsGenerated;
            workflowExecution.logs.push(`Scraped ${totalLeads} leads`);
            await workflowExecution.save();
            if (totalLeads === 0) {
                throw new Error('No leads generated');
            }
            const leads = await Lead_1.Lead.find({
                source: 'google-maps',
                companyName: { $regex: keyword, $options: 'i' },
            }).limit(limit);
            const leadIds = leads.map(l => l.id);
            if (leadIds.length > 0) {
                const analysisResult = await website_analysis_job_1.websiteAnalysisJob.execute({
                    automationId,
                    leadIds,
                });
                totalAnalyzed = analysisResult.analyzedCount;
                workflowExecution.logs.push(`Analyzed ${totalAnalyzed} websites`);
                await workflowExecution.save();
                if (analysisResult.failedCount > 0) {
                    errors.push(`Failed to analyze ${analysisResult.failedCount} websites`);
                }
            }
            if (leadIds.length > 0) {
                const extractionResult = await contact_extraction_job_1.contactExtractionJob.execute({
                    automationId,
                    leadIds,
                });
                totalExtracted = extractionResult.extractedCount;
                workflowExecution.logs.push(`Extracted contacts from ${totalExtracted} leads`);
                await workflowExecution.save();
                if (extractionResult.failedCount > 0) {
                    errors.push(`Failed to extract from ${extractionResult.failedCount} leads`);
                }
            }
            const filters = {
                search: keyword,
                category,
            };
            await export_generation_job_1.exportGenerationJob.execute({
                automationId,
                exportType: 'excel',
                filters,
            });
            workflowExecution.logs.push('Generated export file');
            workflowExecution.logs.push(`Workflow completed: ${totalLeads} leads, ${totalAnalyzed} analyzed, ${totalExtracted} extracted`);
            await workflowExecution.save();
            const history = new Automation_2.AutomationHistory({
                automationId,
                triggerType,
                totalLeadsGenerated: totalLeads,
                status: 'success',
                executionTime: 0,
            });
            await history.save();
            logger_1.logger.info(`WorkflowManager: Workflow completed successfully`);
            return {
                success: true,
                totalLeads,
                totalAnalyzed,
                totalExtracted,
                errors,
            };
        }
        catch (error) {
            logger_1.logger.error('WorkflowManager: Workflow failed:', error);
            workflowExecution.status = 'failed';
            workflowExecution.error = error.message;
            workflowExecution.completedAt = new Date();
            await workflowExecution.save();
            const history = new Automation_2.AutomationHistory({
                automationId,
                triggerType,
                totalLeadsGenerated: totalLeads,
                status: 'failed',
                executionTime: 0,
                error: error.message,
            });
            await history.save();
            return {
                success: false,
                totalLeads,
                totalAnalyzed,
                totalExtracted,
                errors: [...errors, error.message],
            };
        }
    }
    async getExecutionHistory(automationId, options = {}) {
        const { page = 1, limit = 10 } = options;
        const skip = (page - 1) * limit;
        const [executions, total] = await Promise.all([
            Automation_1.JobExecution.find({ automationId })
                .sort({ startedAt: -1 })
                .skip(skip)
                .limit(limit),
            Automation_1.JobExecution.countDocuments({ automationId }),
        ]);
        const totalPages = Math.ceil(total / limit);
        return {
            executions,
            pagination: {
                page,
                limit,
                total,
                totalPages,
            },
        };
    }
    async getStatistics(automationId) {
        const history = await Automation_2.AutomationHistory.aggregate([
            { $match: { automationId: automationId } },
            {
                $group: {
                    _id: null,
                    totalRuns: { $sum: 1 },
                    successfulRuns: {
                        $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] },
                    },
                    failedRuns: {
                        $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
                    },
                    avgLeadsPerRun: { $avg: '$totalLeadsGenerated' },
                    totalLeadsGenerated: { $sum: '$totalLeadsGenerated' },
                },
            },
        ]);
        const stats = history[0] || {
            totalRuns: 0,
            successfulRuns: 0,
            failedRuns: 0,
            avgLeadsPerRun: 0,
            totalLeadsGenerated: 0,
        };
        const automation = await Automation_1.Automation.findById(automationId);
        return {
            totalRuns: stats.totalRuns || 0,
            successfulRuns: stats.successfulRuns || 0,
            failedRuns: stats.failedRuns || 0,
            avgLeadsPerRun: Math.round((stats.avgLeadsPerRun || 0) * 100) / 100,
            totalLeadsGenerated: stats.totalLeadsGenerated || 0,
            lastRunAt: automation?.lastRunAt,
            nextRunAt: automation?.nextRunAt,
        };
    }
    async pauseAutomation(automationId) {
        await Automation_1.Automation.findByIdAndUpdate(automationId, {
            status: 'paused',
        });
        logger_1.logger.info(`WorkflowManager: Paused automation ${automationId}`);
    }
    async resumeAutomation(automationId) {
        await Automation_1.Automation.findByIdAndUpdate(automationId, {
            status: 'active',
        });
        logger_1.logger.info(`WorkflowManager: Resumed automation ${automationId}`);
    }
    async deleteAutomation(automationId) {
        await Automation_1.Automation.findByIdAndDelete(automationId);
        await Automation_1.JobExecution.deleteMany({ automationId });
        await Automation_2.AutomationHistory.deleteMany({ automationId });
        await Automation_2.ExportHistory.deleteMany({ automationId });
        logger_1.logger.info(`WorkflowManager: Deleted automation ${automationId}`);
    }
}
exports.WorkflowManager = WorkflowManager;
exports.workflowManager = new WorkflowManager();
//# sourceMappingURL=workflow-manager.js.map