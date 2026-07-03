"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.areaAutomationQueue = exports.AreaAutomationQueue = void 0;
const scraper_service_1 = require("../services/scraper.service");
const logger_1 = require("../utils/logger");
const area_automation_model_1 = require("./area-automation.model");
const MAX_RETRIES = 2;
class AreaAutomationQueue {
    constructor() {
        this.processingSessions = new Set();
        this.activeJobBySession = new Map();
        this.stopRequestedBySession = new Map();
    }
    async enqueueJobs(sessionId, jobs) {
        const docs = jobs.map((job, index) => ({
            sessionId,
            businessType: job.businessType,
            state: job.state,
            city: job.city,
            area: job.area,
            country: job.country,
            sources: job.sources,
            status: 'pending',
            progress: '',
            totalLeads: 0,
            sourceResults: [],
            startedAt: null,
            completedAt: null,
            failedReason: null,
            queuePosition: index + 1,
            totalJobs: jobs.length,
        }));
        await area_automation_model_1.AreaJobModel.insertMany(docs);
        logger_1.logger.info({ sessionId, count: jobs.length }, 'Queue: Jobs enqueued');
    }
    async startProcessing(sessionId) {
        if (this.processingSessions.has(sessionId)) {
            logger_1.logger.warn({ sessionId }, 'Queue: Session already processing, skipping');
            return;
        }
        this.processingSessions.add(sessionId);
        this.stopRequestedBySession.set(sessionId, false);
        logger_1.logger.info({ sessionId, jobs: [] }, 'Queue: Started processing');
        try {
            while (!this.stopRequestedBySession.get(sessionId)) {
                const nextJob = await area_automation_model_1.AreaJobModel.findOneAndUpdate({ sessionId, status: 'pending' }, { $set: { status: 'running', startedAt: new Date(), progress: 'Starting...' } }, { sort: { queuePosition: 1 }, new: true });
                if (!nextJob) {
                    logger_1.logger.info({ sessionId }, 'Queue: No more pending jobs, finishing');
                    break;
                }
                this.activeJobBySession.set(sessionId, nextJob._id.toString());
                await area_automation_model_1.AreaSessionModel.updateOne({ _id: sessionId }, { $inc: { runningJobs: 1 } });
                logger_1.logger.info({
                    sessionId,
                    jobId: nextJob._id,
                    businessType: nextJob.businessType,
                    area: nextJob.area,
                    city: nextJob.city,
                    queuePosition: nextJob.queuePosition,
                    totalJobs: nextJob.totalJobs,
                }, 'Queue: Processing job');
                let lastError = null;
                let success = false;
                for (let attempt = 0; attempt <= MAX_RETRIES && !success; attempt++) {
                    if (attempt > 0) {
                        logger_1.logger.info({
                            sessionId, jobId: nextJob._id, attempt,
                            businessType: nextJob.businessType,
                            area: nextJob.area,
                        }, 'Queue: Retrying job');
                        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
                    }
                    try {
                        await this.processJob(nextJob);
                        success = true;
                    }
                    catch (error) {
                        lastError = error instanceof Error ? error.message : 'Unknown error';
                        logger_1.logger.warn({
                            err: lastError, sessionId, jobId: nextJob._id, attempt,
                            businessType: nextJob.businessType, area: nextJob.area,
                        }, 'Queue: Job attempt failed');
                    }
                }
                if (!success) {
                    await area_automation_model_1.AreaJobModel.findByIdAndUpdate(nextJob._id, {
                        $set: {
                            status: 'failed',
                            completedAt: new Date(),
                            progress: `Failed: ${lastError || 'Unknown error'}`,
                            failedReason: lastError || 'Unknown error',
                        },
                    });
                    await area_automation_model_1.AreaSessionModel.updateOne({ _id: sessionId }, { $inc: { failedJobs: 1, runningJobs: -1 } });
                    logger_1.logger.error({
                        err: lastError, sessionId, jobId: nextJob._id,
                        businessType: nextJob.businessType, area: nextJob.area,
                    }, 'Queue: Job failed after all retries');
                }
                this.activeJobBySession.delete(sessionId);
                if (this.stopRequestedBySession.get(sessionId)) {
                    logger_1.logger.info({ sessionId }, 'Queue: Stop requested after completing current job');
                    break;
                }
            }
            if (!this.stopRequestedBySession.get(sessionId)) {
                await area_automation_model_1.AreaSessionModel.updateOne({ _id: sessionId }, { $set: { status: 'completed', completedAt: new Date() } });
                logger_1.logger.info({ sessionId }, 'Queue: All jobs completed successfully');
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Queue processing error';
            logger_1.logger.error({ err: message, sessionId }, 'Queue: Processing error');
        }
        finally {
            this.processingSessions.delete(sessionId);
            this.activeJobBySession.delete(sessionId);
            this.stopRequestedBySession.delete(sessionId);
            logger_1.logger.info({ sessionId }, 'Queue: Processing finished');
        }
    }
    async processJob(job) {
        const { sessionId, businessType, state, city, area, country, sources } = job;
        const locationStr = [area, city, state, country].filter(Boolean).join(', ');
        logger_1.logger.info({
            action: 'area_scrape_started',
            sessionId, businessType, city, area,
            searchQuery: `${businessType} in ${locationStr}`,
        }, 'Queue: Job started');
        await area_automation_model_1.AreaJobModel.findByIdAndUpdate(job._id, {
            $set: { progress: `Scraping ${businessType} in ${area}...` },
        });
        const result = await scraper_service_1.scraperService.scrapeBusinesses({
            keyword: businessType,
            location: locationStr,
            sources,
            limit: 100,
            state,
            city,
            area,
            country,
            businessType,
            sessionId,
        });
        const sourceResults = [];
        let totalStored = 0;
        for (const [sourceName, sourceResult] of Object.entries(result.results)) {
            sourceResults.push({
                source: sourceName,
                totalStored: sourceResult.totalStored,
                totalExtracted: sourceResult.totalExtracted,
                totalDuplicates: sourceResult.totalDuplicates,
                success: sourceResult.totalStored > 0,
            });
            totalStored += sourceResult.totalStored;
            logger_1.logger.info({
                action: 'source_completed',
                source: sourceName,
                totalStored: sourceResult.totalStored,
                totalExtracted: sourceResult.totalExtracted,
                totalDuplicates: sourceResult.totalDuplicates,
            }, 'Queue: Source completed');
        }
        await area_automation_model_1.AreaJobModel.findByIdAndUpdate(job._id, {
            $set: {
                status: 'completed',
                completedAt: new Date(),
                progress: `Completed - ${totalStored} leads found`,
                totalLeads: totalStored,
                sourceResults,
            },
        });
        await area_automation_model_1.AreaSessionModel.updateOne({ _id: sessionId }, {
            $inc: { completedJobs: 1, totalLeads: totalStored, runningJobs: -1 },
        });
        logger_1.logger.info({
            action: 'area_scrape_completed',
            sessionId, businessType, city, area,
            totalStored, sources: sources.length,
        }, 'Queue: Job completed');
    }
    async stopProcessing(sessionId) {
        if (sessionId) {
            this.stopRequestedBySession.set(sessionId, true);
            const activeJobId = this.activeJobBySession.get(sessionId);
            if (activeJobId) {
                await area_automation_model_1.AreaJobModel.findByIdAndUpdate(activeJobId, {
                    $set: { status: 'pending', progress: 'Paused', startedAt: null },
                });
            }
            this.activeJobBySession.delete(sessionId);
            logger_1.logger.info({ sessionId }, 'Queue: Stopped processing for session');
        }
        else {
            this.stopRequestedBySession.forEach((_, sid) => {
                this.stopRequestedBySession.set(sid, true);
            });
            this.activeJobBySession.forEach(async (jobId) => {
                await area_automation_model_1.AreaJobModel.findByIdAndUpdate(jobId, {
                    $set: { status: 'pending', progress: 'Paused', startedAt: null },
                });
            });
            this.activeJobBySession.clear();
            logger_1.logger.info('Queue: Stopped all sessions');
        }
    }
    isProcessing(sessionId) {
        if (sessionId) {
            return this.processingSessions.has(sessionId);
        }
        return this.processingSessions.size > 0;
    }
    getActiveJobId(sessionId) {
        return this.activeJobBySession.get(sessionId) || null;
    }
}
exports.AreaAutomationQueue = AreaAutomationQueue;
exports.areaAutomationQueue = new AreaAutomationQueue();
//# sourceMappingURL=area-automation-queue.js.map