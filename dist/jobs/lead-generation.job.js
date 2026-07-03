"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadGenerationJob = exports.LeadGenerationJob = void 0;
const logger_1 = require("../utils/logger");
const scraper_service_1 = require("../services/scraper.service");
const Automation_1 = require("../models/Automation");
const Automation_2 = require("../models/Automation");
class LeadGenerationJob {
    constructor() {
        this.scraperService = new scraper_service_1.ScraperService();
    }
    async execute(options) {
        const { automationId, keyword, location, limit, categoryId: _categoryId } = options;
        logger_1.logger.info(`LeadGenerationJob: Starting generation for "${keyword}" in "${location}"`);
        const jobExecution = await this.createJobExecution(automationId, 'lead-generation', {
            keyword,
            location,
            limit,
        });
        try {
            const result = await this.scraperService.scrapeBusinesses({
                keyword,
                location,
                limit,
            });
            await this.updateJobExecution(jobExecution.id, {
                status: 'completed',
                totalLeadsGenerated: result.totalStored,
                completedAt: new Date(),
            });
            await Automation_1.Automation.findByIdAndUpdate(automationId, {
                $inc: { totalRuns: 1, lastRunLeads: result.totalStored },
                lastRunStatus: result.totalStored > 0 ? 'success' : 'partial',
                lastRunAt: new Date(),
            });
            logger_1.logger.info(`LeadGenerationJob: Completed - ${result.totalStored} leads generated`);
            return {
                success: result.totalStored > 0,
                leadsGenerated: result.totalStored,
                duplicates: result.totalDuplicates,
                errors: [],
            };
        }
        catch (error) {
            logger_1.logger.error('LeadGenerationJob: Failed:', error);
            await this.updateJobExecution(jobExecution.id, {
                status: 'failed',
                failedCount: 1,
                error: error.message,
                completedAt: new Date(),
            });
            await Automation_1.Automation.findByIdAndUpdate(automationId, {
                status: 'failed',
                error: error.message,
                lastRunStatus: 'failed',
                lastRunAt: new Date(),
            });
            return {
                success: false,
                leadsGenerated: 0,
                duplicates: 0,
                errors: [error.message],
            };
        }
    }
    async createJobExecution(automationId, jobType, metadata) {
        const jobExecution = new Automation_2.JobExecution({
            automationId,
            jobType,
            status: 'running',
            startedAt: new Date(),
            metadata,
        });
        return await jobExecution.save();
    }
    async updateJobExecution(jobExecutionId, updates) {
        await Automation_2.JobExecution.findByIdAndUpdate(jobExecutionId, updates);
    }
}
exports.LeadGenerationJob = LeadGenerationJob;
exports.leadGenerationJob = new LeadGenerationJob();
//# sourceMappingURL=lead-generation.job.js.map