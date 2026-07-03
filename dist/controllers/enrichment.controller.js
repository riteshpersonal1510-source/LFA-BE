"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enrichmentController = exports.EnrichmentController = void 0;
const Lead_1 = require("../models/Lead");
const api_response_1 = require("../utils/api-response");
const logger_1 = require("../utils/logger");
const enrichment_1 = require("../enrichment");
const website_cache_service_1 = require("./../enrichment/website-cache.service");
class EnrichmentController {
    async enrichLead(req, res, _next) {
        try {
            const { id } = req.params;
            const lead = await Lead_1.Lead.findById(id);
            if (!lead) {
                api_response_1.APIResponse.error(res, 'Lead not found', null, 404);
                return;
            }
            const result = await enrichment_1.leadEnrichmentOrchestrator.enrichLead(id);
            api_response_1.APIResponse.success(res, {
                enrichmentResult: result,
            }, 'Lead enrichment completed');
        }
        catch (err) {
            logger_1.logger.error({ err }, 'EnrichmentController: enrichLead failed');
            api_response_1.APIResponse.error(res, 'Enrichment failed', err instanceof Error ? err.message : String(err), 500);
        }
    }
    async getEnrichmentStatus(req, res, _next) {
        try {
            const { id } = req.params;
            const lead = await Lead_1.Lead.findById(id)
                .select('enrichmentStatus enrichmentProgress enrichmentCurrentStep enrichmentStartedAt enrichmentCompletedAt enrichmentError')
                .lean();
            if (!lead) {
                api_response_1.APIResponse.error(res, 'Lead not found', null, 404);
                return;
            }
            api_response_1.APIResponse.success(res, { enrichment: lead }, 'Enrichment status');
        }
        catch (err) {
            logger_1.logger.error({ err }, 'EnrichmentController: getEnrichmentStatus failed');
            api_response_1.APIResponse.error(res, 'Failed to get enrichment status', err instanceof Error ? err.message : String(err), 500);
        }
    }
    async startBackfill(req, res, _next) {
        try {
            const batchSize = req.body.batchSize ? parseInt(req.body.batchSize.toString(), 10) : undefined;
            const concurrency = req.body.concurrency ? parseInt(req.body.concurrency.toString(), 10) : undefined;
            const skipCompleted = req.body.skipCompleted !== false;
            const limit = req.body.limit ? parseInt(req.body.limit.toString(), 10) : undefined;
            const targetMissingFields = req.body.targetMissingFields === true;
            if (enrichment_1.backfillWorker.status.running) {
                api_response_1.APIResponse.success(res, { status: enrichment_1.backfillWorker.status }, 'Backfill already running');
                return;
            }
            enrichment_1.backfillWorker.runBackfill({
                batchSize,
                concurrency,
                skipCompleted,
                limit,
                targetMissingFields,
            }).catch((err) => {
                logger_1.logger.error({ err }, 'EnrichmentController: Backfill error');
            });
            const message = targetMissingFields
                ? 'Backfill started for leads with missing Google Maps fields'
                : 'Backfill started for incomplete leads';
            api_response_1.APIResponse.success(res, { status: enrichment_1.backfillWorker.status }, message);
        }
        catch (err) {
            logger_1.logger.error({ err }, 'EnrichmentController: startBackfill failed');
            api_response_1.APIResponse.error(res, 'Failed to start backfill', err instanceof Error ? err.message : String(err), 500);
        }
    }
    async getBackfillStatus(_req, res, _next) {
        try {
            api_response_1.APIResponse.success(res, {
                backfill: enrichment_1.backfillWorker.status,
                orchestrator: enrichment_1.leadEnrichmentOrchestrator.status,
            }, 'Backfill status');
        }
        catch (err) {
            logger_1.logger.error({ err }, 'EnrichmentController: getBackfillStatus failed');
            api_response_1.APIResponse.error(res, 'Failed to get backfill status', err instanceof Error ? err.message : String(err), 500);
        }
    }
    async getEnrichableLeads(req, res, _next) {
        try {
            const page = parseInt(req.query.page?.toString() || '1', 10);
            const limit = parseInt(req.query.limit?.toString() || '20', 10);
            const skip = (page - 1) * limit;
            const status = req.query.status?.toString();
            const filter = {};
            if (status) {
                filter.enrichmentStatus = status;
            }
            const [leads, total] = await Promise.all([
                Lead_1.Lead.find(filter)
                    .select('companyName website enrichmentStatus enrichmentProgress enrichmentCurrentStep enrichmentCompletedAt enrichmentError')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Lead_1.Lead.countDocuments(filter),
            ]);
            api_response_1.APIResponse.success(res, {
                leads,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            }, 'Enrichable leads');
        }
        catch (err) {
            logger_1.logger.error({ err }, 'EnrichmentController: getEnrichableLeads failed');
            api_response_1.APIResponse.error(res, 'Failed to get enrichable leads', err instanceof Error ? err.message : String(err), 500);
        }
    }
    async getOrchestratorStatus(_req, res, _next) {
        try {
            api_response_1.APIResponse.success(res, {
                orchestrator: enrichment_1.leadEnrichmentOrchestrator.status,
            }, 'Orchestrator status');
        }
        catch (err) {
            logger_1.logger.error({ err }, 'EnrichmentController: getOrchestratorStatus failed');
            api_response_1.APIResponse.error(res, 'Failed to get orchestrator status', err instanceof Error ? err.message : String(err), 500);
        }
    }
    async enqueueLead(req, res, _next) {
        try {
            const { id } = req.params;
            const lead = await Lead_1.Lead.findById(id);
            if (!lead) {
                api_response_1.APIResponse.error(res, 'Lead not found', null, 404);
                return;
            }
            enrichment_1.leadEnrichmentOrchestrator.enqueue(id, 1);
            api_response_1.APIResponse.success(res, { leadId: id }, 'Lead enqueued for enrichment');
        }
        catch (err) {
            logger_1.logger.error({ err }, 'EnrichmentController: enqueueLead failed');
            api_response_1.APIResponse.error(res, 'Failed to enqueue lead', err instanceof Error ? err.message : String(err), 500);
        }
    }
    async enqueueMultiple(req, res, _next) {
        try {
            const { leadIds } = req.body;
            if (!Array.isArray(leadIds) || leadIds.length === 0) {
                api_response_1.APIResponse.error(res, 'leadIds array is required', null, 400);
                return;
            }
            const existing = await Lead_1.Lead.find({ _id: { $in: leadIds } }).select('_id').lean();
            const validIds = existing.map(doc => doc._id.toString());
            enrichment_1.leadEnrichmentOrchestrator.enqueueMultiple(validIds);
            api_response_1.APIResponse.success(res, { enqueued: validIds.length, total: leadIds.length }, 'Leads enqueued for enrichment');
        }
        catch (err) {
            logger_1.logger.error({ err }, 'EnrichmentController: enqueueMultiple failed');
            api_response_1.APIResponse.error(res, 'Failed to enqueue leads', err instanceof Error ? err.message : String(err), 500);
        }
    }
    async clearCache(_req, res, _next) {
        try {
            website_cache_service_1.websiteCache.clear();
            api_response_1.APIResponse.success(res, {}, 'Website cache cleared');
        }
        catch (err) {
            logger_1.logger.error({ err }, 'EnrichmentController: clearCache failed');
            api_response_1.APIResponse.error(res, 'Failed to clear cache', err instanceof Error ? err.message : String(err), 500);
        }
    }
    async startMissingFieldsBackfill(req, res, _next) {
        try {
            const batchSize = req.body.batchSize ? parseInt(req.body.batchSize.toString(), 10) : 10;
            const concurrency = req.body.concurrency ? parseInt(req.body.concurrency.toString(), 10) : 3;
            const limit = req.body.limit ? parseInt(req.body.limit.toString(), 10) : undefined;
            if (enrichment_1.backfillWorker.status.running) {
                api_response_1.APIResponse.success(res, { status: enrichment_1.backfillWorker.status }, 'Backfill already running');
                return;
            }
            enrichment_1.backfillWorker.runBackfill({
                batchSize,
                concurrency,
                skipCompleted: false,
                limit,
                targetMissingFields: true,
            }).catch((err) => {
                logger_1.logger.error({ err }, 'EnrichmentController: Missing fields backfill error');
            });
            api_response_1.APIResponse.success(res, {
                status: enrichment_1.backfillWorker.status,
                message: 'Started backfill for leads with missing Google Maps fields (phone, address, category, rating, website)'
            }, 'Missing fields backfill started');
        }
        catch (err) {
            logger_1.logger.error({ err }, 'EnrichmentController: startMissingFieldsBackfill failed');
            api_response_1.APIResponse.error(res, 'Failed to start missing fields backfill', err instanceof Error ? err.message : String(err), 500);
        }
    }
    async getMissingFieldsCount(_req, res, _next) {
        try {
            const missingFieldsFilter = {
                $or: [
                    { phone: { $in: [null, ''] } },
                    { address: { $in: [null, ''] } },
                    { category: { $in: [null, ''] } },
                    { rating: { $in: [null, 0] } },
                    { website: null },
                ],
                $and: [
                    {
                        $or: [
                            { placeId: { $exists: true, $nin: [null, ''] } },
                            { sourceUrl: { $exists: true, $nin: [null, ''] } }
                        ]
                    }
                ]
            };
            const [totalMissingFields, missingPhone, missingAddress, missingCategory, missingRating, missingWebsite, totalLeads] = await Promise.all([
                Lead_1.Lead.countDocuments(missingFieldsFilter),
                Lead_1.Lead.countDocuments({ phone: { $in: [null, ''] } }),
                Lead_1.Lead.countDocuments({ address: { $in: [null, ''] } }),
                Lead_1.Lead.countDocuments({ category: { $in: [null, ''] } }),
                Lead_1.Lead.countDocuments({ rating: { $in: [null, 0] } }),
                Lead_1.Lead.countDocuments({ website: null }),
                Lead_1.Lead.countDocuments({})
            ]);
            api_response_1.APIResponse.success(res, {
                totalMissingFields,
                breakdown: {
                    missingPhone,
                    missingAddress,
                    missingCategory,
                    missingRating,
                    missingWebsite
                },
                totalLeads,
                percentageMissingFields: totalLeads > 0 ? Math.round((totalMissingFields / totalLeads) * 100) : 0
            }, 'Missing fields count');
        }
        catch (err) {
            logger_1.logger.error({ err }, 'EnrichmentController: getMissingFieldsCount failed');
            api_response_1.APIResponse.error(res, 'Failed to get missing fields count', err instanceof Error ? err.message : String(err), 500);
        }
    }
}
exports.EnrichmentController = EnrichmentController;
exports.enrichmentController = new EnrichmentController();
//# sourceMappingURL=enrichment.controller.js.map