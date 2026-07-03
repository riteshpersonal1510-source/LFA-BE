"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackfillWorker = void 0;
const Lead_1 = require("../models/Lead");
const logger_1 = require("../utils/logger");
const lead_enrichment_orchestrator_1 = require("./lead-enrichment-orchestrator");
const leadEnrichmentOrchestrator = new lead_enrichment_orchestrator_1.LeadEnrichmentOrchestrator();
class BackfillWorker {
    constructor() {
        this.stats = {
            total: 0,
            processed: 0,
            skipped: 0,
            succeeded: 0,
            failed: 0,
            errors: [],
            startTime: new Date(),
            running: false,
        };
        this.batchSize = 10;
        this.concurrency = 3;
    }
    get status() {
        return { ...this.stats };
    }
    async runBackfill(options) {
        if (this.stats.running) {
            logger_1.logger.warn('BackfillWorker: Already running');
            return this.stats;
        }
        const skipCompleted = options?.skipCompleted !== false;
        const limit = options?.limit || 0;
        const targetMissingFields = options?.targetMissingFields || false;
        this.stats = {
            total: 0,
            processed: 0,
            skipped: 0,
            succeeded: 0,
            failed: 0,
            errors: [],
            startTime: new Date(),
            running: true,
        };
        try {
            const filter = {};
            if (targetMissingFields) {
                filter.$or = [
                    { phone: { $in: [null, ''] } },
                    { address: { $in: [null, ''] } },
                    { category: { $in: [null, ''] } },
                    { rating: { $in: [null, 0] } },
                    { website: null },
                ];
                filter.$and = [
                    {
                        $or: [
                            { placeId: { $exists: true, $nin: [null, ''] } },
                            { sourceUrl: { $exists: true, $nin: [null, ''] } }
                        ]
                    }
                ];
                logger_1.logger.info('BackfillWorker: Targeting leads with missing Google Maps fields');
            }
            else if (skipCompleted) {
                filter.enrichmentStatus = { $ne: 'completed' };
            }
            const totalCount = await Lead_1.Lead.countDocuments(filter);
            this.stats.total = limit > 0 ? Math.min(totalCount, limit) : totalCount;
            logger_1.logger.info({
                total: this.stats.total,
                filter: JSON.stringify(filter),
                targetMissingFields,
                skipCompleted
            }, 'BackfillWorker: Starting');
            const batchSize = options?.batchSize || this.batchSize;
            const processedLimit = limit || totalCount;
            let processed = 0;
            while (processed < processedLimit) {
                const batch = await Lead_1.Lead.find(filter)
                    .select('_id companyName website phone address category rating placeId sourceUrl enrichmentStatus')
                    .sort({ createdAt: -1 })
                    .skip(processed)
                    .limit(batchSize)
                    .lean();
                if (batch.length === 0)
                    break;
                const batchIds = batch.map(doc => doc._id.toString());
                const promises = batchIds.map(leadId => leadEnrichmentOrchestrator.enrichLead(leadId)
                    .then((r) => {
                    if (r.success) {
                        this.stats.succeeded++;
                    }
                    else {
                        this.stats.failed++;
                        if (r.errors.length > 0) {
                            this.stats.errors.push(...r.errors.map(e => `${leadId}: ${e}`));
                        }
                    }
                })
                    .catch((err) => {
                    this.stats.failed++;
                    this.stats.errors.push(`${leadId}: ${err.message}`);
                }));
                const chunkSize = options?.concurrency || this.concurrency;
                for (let i = 0; i < promises.length; i += chunkSize) {
                    const chunk = promises.slice(i, i + chunkSize);
                    await Promise.allSettled(chunk);
                }
                processed += batch.length;
                this.stats.processed = processed;
                logger_1.logger.info({
                    processed: this.stats.processed,
                    total: this.stats.total,
                    succeeded: this.stats.succeeded,
                    failed: this.stats.failed,
                    errors: this.stats.errors.length,
                }, 'BackfillWorker: Batch completed');
                if (this.stats.errors.length > 100) {
                    logger_1.logger.warn('BackfillWorker: Too many errors, stopping');
                    break;
                }
            }
        }
        catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            this.stats.errors.push(`Fatal: ${errMsg}`);
            logger_1.logger.error({ err: errMsg }, 'BackfillWorker: Fatal error');
        }
        this.stats.endTime = new Date();
        this.stats.running = false;
        const duration = (this.stats.endTime.getTime() - this.stats.startTime.getTime()) / 1000;
        logger_1.logger.info({
            ...this.stats,
            durationSeconds: duration,
        }, 'BackfillWorker: Completed');
        return this.stats;
    }
    reset() {
        this.stats = {
            total: 0,
            processed: 0,
            skipped: 0,
            succeeded: 0,
            failed: 0,
            errors: [],
            startTime: new Date(),
            running: false,
        };
    }
}
exports.BackfillWorker = BackfillWorker;
//# sourceMappingURL=backfill-worker.js.map