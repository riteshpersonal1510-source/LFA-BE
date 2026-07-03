import { Request, Response, NextFunction } from 'express';
import { Lead } from '../models/Lead';
import { APIResponse } from '../utils/api-response';
import { logger } from '../utils/logger';
import { leadEnrichmentOrchestrator, backfillWorker } from '../enrichment';
import { websiteCache } from './../enrichment/website-cache.service';

export class EnrichmentController {
  async enrichLead(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const lead = await Lead.findById(id);
      if (!lead) {
        APIResponse.error(res, 'Lead not found', null, 404);
        return;
      }

      const result = await leadEnrichmentOrchestrator.enrichLead(id);

      APIResponse.success(res, {
        enrichmentResult: result,
      }, 'Lead enrichment completed');
    } catch (err) {
      logger.error({ err }, 'EnrichmentController: enrichLead failed');
      APIResponse.error(res, 'Enrichment failed', err instanceof Error ? err.message : String(err), 500);
    }
  }

  async getEnrichmentStatus(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const lead = await Lead.findById(id)
        .select('enrichmentStatus enrichmentProgress enrichmentCurrentStep enrichmentStartedAt enrichmentCompletedAt enrichmentError')
        .lean();

      if (!lead) {
        APIResponse.error(res, 'Lead not found', null, 404);
        return;
      }

      APIResponse.success(res, { enrichment: lead }, 'Enrichment status');
    } catch (err) {
      logger.error({ err }, 'EnrichmentController: getEnrichmentStatus failed');
      APIResponse.error(res, 'Failed to get enrichment status', err instanceof Error ? err.message : String(err), 500);
    }
  }

  async startBackfill(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      const batchSize = req.body.batchSize ? parseInt(req.body.batchSize.toString(), 10) : undefined;
      const concurrency = req.body.concurrency ? parseInt(req.body.concurrency.toString(), 10) : undefined;
      const skipCompleted = req.body.skipCompleted !== false;
      const limit = req.body.limit ? parseInt(req.body.limit.toString(), 10) : undefined;
      const targetMissingFields = req.body.targetMissingFields === true; // New option for missing Google Maps fields

      if (backfillWorker.status.running) {
        APIResponse.success(res, { status: backfillWorker.status }, 'Backfill already running');
        return;
      }

      backfillWorker.runBackfill({
        batchSize,
        concurrency,
        skipCompleted,
        limit,
        targetMissingFields,
      }).catch((err: Error) => {
        logger.error({ err }, 'EnrichmentController: Backfill error');
      });

      const message = targetMissingFields 
        ? 'Backfill started for leads with missing Google Maps fields'
        : 'Backfill started for incomplete leads';

      APIResponse.success(res, { status: backfillWorker.status }, message);
    } catch (err) {
      logger.error({ err }, 'EnrichmentController: startBackfill failed');
      APIResponse.error(res, 'Failed to start backfill', err instanceof Error ? err.message : String(err), 500);
    }
  }

  async getBackfillStatus(_req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      APIResponse.success(res, {
        backfill: backfillWorker.status,
        orchestrator: leadEnrichmentOrchestrator.status,
      }, 'Backfill status');
    } catch (err) {
      logger.error({ err }, 'EnrichmentController: getBackfillStatus failed');
      APIResponse.error(res, 'Failed to get backfill status', err instanceof Error ? err.message : String(err), 500);
    }
  }

  async getEnrichableLeads(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page?.toString() || '1', 10);
      const limit = parseInt(req.query.limit?.toString() || '20', 10);
      const skip = (page - 1) * limit;
      const status = req.query.status?.toString();

      const filter: Record<string, unknown> = {};
      if (status) {
        filter.enrichmentStatus = status;
      }

      const [leads, total] = await Promise.all([
        Lead.find(filter)
          .select('companyName website enrichmentStatus enrichmentProgress enrichmentCurrentStep enrichmentCompletedAt enrichmentError')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Lead.countDocuments(filter),
      ]);

      APIResponse.success(res, {
        leads,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }, 'Enrichable leads');
    } catch (err) {
      logger.error({ err }, 'EnrichmentController: getEnrichableLeads failed');
      APIResponse.error(res, 'Failed to get enrichable leads', err instanceof Error ? err.message : String(err), 500);
    }
  }

  async getOrchestratorStatus(_req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      APIResponse.success(res, {
        orchestrator: leadEnrichmentOrchestrator.status,
      }, 'Orchestrator status');
    } catch (err) {
      logger.error({ err }, 'EnrichmentController: getOrchestratorStatus failed');
      APIResponse.error(res, 'Failed to get orchestrator status', err instanceof Error ? err.message : String(err), 500);
    }
  }

  async enqueueLead(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const lead = await Lead.findById(id);
      if (!lead) {
        APIResponse.error(res, 'Lead not found', null, 404);
        return;
      }

      leadEnrichmentOrchestrator.enqueue(id, 1);
      APIResponse.success(res, { leadId: id }, 'Lead enqueued for enrichment');
    } catch (err) {
      logger.error({ err }, 'EnrichmentController: enqueueLead failed');
      APIResponse.error(res, 'Failed to enqueue lead', err instanceof Error ? err.message : String(err), 500);
    }
  }

  async enqueueMultiple(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      const { leadIds } = req.body;
      if (!Array.isArray(leadIds) || leadIds.length === 0) {
        APIResponse.error(res, 'leadIds array is required', null, 400);
        return;
      }

      const existing = await Lead.find({ _id: { $in: leadIds } }).select('_id').lean();
      const validIds = existing.map(doc => (doc as any)._id.toString());

      leadEnrichmentOrchestrator.enqueueMultiple(validIds);
      APIResponse.success(res, { enqueued: validIds.length, total: leadIds.length }, 'Leads enqueued for enrichment');
    } catch (err) {
      logger.error({ err }, 'EnrichmentController: enqueueMultiple failed');
      APIResponse.error(res, 'Failed to enqueue leads', err instanceof Error ? err.message : String(err), 500);
    }
  }

  async clearCache(_req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      websiteCache.clear();
      APIResponse.success(res, {}, 'Website cache cleared');
    } catch (err) {
      logger.error({ err }, 'EnrichmentController: clearCache failed');
      APIResponse.error(res, 'Failed to clear cache', err instanceof Error ? err.message : String(err), 500);
    }
  }

  async startMissingFieldsBackfill(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      const batchSize = req.body.batchSize ? parseInt(req.body.batchSize.toString(), 10) : 10;
      const concurrency = req.body.concurrency ? parseInt(req.body.concurrency.toString(), 10) : 3;
      const limit = req.body.limit ? parseInt(req.body.limit.toString(), 10) : undefined;

      if (backfillWorker.status.running) {
        APIResponse.success(res, { status: backfillWorker.status }, 'Backfill already running');
        return;
      }

      // Start backfill specifically for leads with missing Google Maps fields
      backfillWorker.runBackfill({
        batchSize,
        concurrency,
        skipCompleted: false, // Process all leads with missing fields regardless of enrichment status
        limit,
        targetMissingFields: true, // Target leads missing core Google Maps fields
      }).catch((err: Error) => {
        logger.error({ err }, 'EnrichmentController: Missing fields backfill error');
      });

      APIResponse.success(res, { 
        status: backfillWorker.status,
        message: 'Started backfill for leads with missing Google Maps fields (phone, address, category, rating, website)'
      }, 'Missing fields backfill started');
    } catch (err) {
      logger.error({ err }, 'EnrichmentController: startMissingFieldsBackfill failed');
      APIResponse.error(res, 'Failed to start missing fields backfill', err instanceof Error ? err.message : String(err), 500);
    }
  }

  async getMissingFieldsCount(_req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      // Count leads with missing Google Maps fields
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

      const [
        totalMissingFields,
        missingPhone,
        missingAddress,
        missingCategory,
        missingRating,
        missingWebsite,
        totalLeads
      ] = await Promise.all([
        Lead.countDocuments(missingFieldsFilter),
        Lead.countDocuments({ phone: { $in: [null, ''] } }),
        Lead.countDocuments({ address: { $in: [null, ''] } }),
        Lead.countDocuments({ category: { $in: [null, ''] } }),
        Lead.countDocuments({ rating: { $in: [null, 0] } }),
        Lead.countDocuments({ website: null }),
        Lead.countDocuments({})
      ]);

      APIResponse.success(res, {
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
    } catch (err) {
      logger.error({ err }, 'EnrichmentController: getMissingFieldsCount failed');
      APIResponse.error(res, 'Failed to get missing fields count', err instanceof Error ? err.message : String(err), 500);
    }
  }
}

export const enrichmentController = new EnrichmentController();
