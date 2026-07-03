"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cronScheduler = exports.CronScheduler = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const logger_1 = require("../utils/logger");
const Automation_1 = require("../models/Automation");
const lead_generation_job_1 = require("../jobs/lead-generation.job");
const website_analysis_job_1 = require("../jobs/website-analysis.job");
const contact_extraction_job_1 = require("../jobs/contact-extraction.job");
const export_generation_job_1 = require("../jobs/export-generation.job");
const Lead_1 = require("../models/Lead");
const Automation_2 = require("../models/Automation");
class CronScheduler {
    constructor() {
        this.cronJobs = new Map();
    }
    async start() {
        logger_1.logger.info('CronScheduler: Starting scheduled jobs');
        await this.checkPendingAutomations();
        this.cronJobs.set('periodic-check', node_cron_1.default.schedule('*/5 * * * *', () => {
            this.checkPendingAutomations();
        }));
        logger_1.logger.info('CronScheduler: Scheduler started');
    }
    async stop() {
        logger_1.logger.info('CronScheduler: Stopping scheduled jobs');
        for (const [name, job] of this.cronJobs) {
            try {
                job.stop();
                logger_1.logger.info(`CronScheduler: Stopped job: ${name}`);
            }
            catch (error) {
                logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), `CronScheduler: Failed to stop job ${name}:`);
            }
        }
        this.cronJobs.clear();
    }
    async scheduleAutomation(automationId) {
        const automation = await Automation_1.Automation.findById(automationId);
        if (!automation) {
            logger_1.logger.warn(`CronScheduler: Automation not found: ${automationId}`);
            return;
        }
        const cronExpression = this.getCronExpression(automation.frequency);
        const jobKey = `automation-${automationId}`;
        if (this.cronJobs.has(jobKey)) {
            this.cronJobs.get(jobKey)?.stop();
        }
        const task = node_cron_1.default.schedule(cronExpression, async () => {
            await this.runAutomation(automation);
        });
        this.cronJobs.set(jobKey, task);
        logger_1.logger.info(`CronScheduler: Scheduled automation ${automationId} with frequency: ${automation.frequency}`);
    }
    async cancelAutomation(automationId) {
        const jobKey = `automation-${automationId}`;
        if (this.cronJobs.has(jobKey)) {
            this.cronJobs.get(jobKey)?.stop();
            this.cronJobs.delete(jobKey);
            logger_1.logger.info(`CronScheduler: Cancelled automation ${automationId}`);
        }
    }
    getCronExpression(frequency) {
        switch (frequency) {
            case 'hourly':
                return '0 * * * *';
            case 'daily':
                return '0 9 * * *';
            case 'weekly':
                return '0 9 * * 1';
            default:
                return '0 9 * * *';
        }
    }
    async checkPendingAutomations() {
        try {
            const now = new Date();
            const automations = await Automation_1.Automation.find({
                status: 'active',
                nextRunAt: { $lte: now },
            });
            if (automations.length === 0) {
                return;
            }
            logger_1.logger.info(`CronScheduler: Found ${automations.length} pending automations`);
            for (const automation of automations) {
                try {
                    await this.runAutomation(automation);
                }
                catch (error) {
                    logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), `CronScheduler: Failed to run automation ${automation.id}:`);
                }
            }
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), 'CronScheduler: Failed to check pending automations:');
        }
    }
    async runAutomation(automation) {
        logger_1.logger.info(`CronScheduler: Running automation ${automation.id} - ${automation.keyword}`);
        const nextRunAt = this.calculateNextRun(automation.frequency);
        await Automation_1.Automation.findByIdAndUpdate(automation.id, { nextRunAt });
        const history = new Automation_2.AutomationHistory({
            automationId: automation.id,
            triggerType: 'scheduled',
            totalLeadsGenerated: 0,
            status: 'partial',
            executionTime: 0,
        });
        const startTime = Date.now();
        try {
            const scrapeResult = await lead_generation_job_1.leadGenerationJob.execute({
                automationId: automation.id,
                keyword: automation.keyword,
                location: automation.location,
                limit: automation.limit,
            });
            if (!scrapeResult.success) {
                throw new Error('Lead generation failed');
            }
            history.totalLeadsGenerated = scrapeResult.leadsGenerated;
            const leads = await Lead_1.Lead.find({
                source: 'google-maps',
                createdAt: { $gte: new Date(Date.now() - 60000) },
            }).limit(automation.limit);
            const leadIds = leads.map(l => l.id);
            if (leadIds.length > 0) {
                await website_analysis_job_1.websiteAnalysisJob.execute({
                    automationId: automation.id,
                    leadIds,
                });
            }
            if (leadIds.length > 0) {
                await contact_extraction_job_1.contactExtractionJob.execute({
                    automationId: automation.id,
                    leadIds,
                });
            }
            const filters = {
                search: automation.keyword,
                category: automation.category,
            };
            await export_generation_job_1.exportGenerationJob.execute({
                automationId: automation.id,
                exportType: 'excel',
                filters,
            });
            history.status = 'success';
            logger_1.logger.info(`CronScheduler: Automation ${automation.id} completed successfully`);
        }
        catch (error) {
            history.status = 'failed';
            history.error = error.message;
            logger_1.logger.error(`CronScheduler: Automation ${automation.id} failed:`, error);
        }
        finally {
            history.executionTime = (Date.now() - startTime) / 1000;
            await history.save();
            await Automation_1.Automation.findByIdAndUpdate(automation.id, {
                lastRunAt: new Date(),
                lastRunStatus: history.status,
                lastRunLeads: history.totalLeadsGenerated,
                error: history.error || undefined,
            });
        }
    }
    calculateNextRun(frequency) {
        const now = new Date();
        switch (frequency) {
            case 'hourly':
                return new Date(now.getTime() + 60 * 60 * 1000);
            case 'daily':
                return new Date(now.getTime() + 24 * 60 * 60 * 1000);
            case 'weekly':
                return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            default:
                return new Date(now.getTime() + 24 * 60 * 60 * 1000);
        }
    }
    async manualRun(automationId) {
        const automation = await Automation_1.Automation.findById(automationId);
        if (!automation) {
            throw new Error('Automation not found');
        }
        await this.runAutomation(automation);
    }
}
exports.CronScheduler = CronScheduler;
exports.cronScheduler = new CronScheduler();
//# sourceMappingURL=cron.scheduler.js.map