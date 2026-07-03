import { Lead } from '../models/Lead';
import { logger } from '../utils/logger';
import { LeadEnrichmentOrchestrator } from './lead-enrichment-orchestrator';
import type { EnrichmentResult } from './lead-enrichment-orchestrator';

const leadEnrichmentOrchestrator = new LeadEnrichmentOrchestrator();

export interface BackfillStats {
  total: number;
  processed: number;
  skipped: number;
  succeeded: number;
  failed: number;
  errors: string[];
  startTime: Date;
  endTime?: Date;
  running: boolean;
}

export class BackfillWorker {
  private stats: BackfillStats = {
    total: 0,
    processed: 0,
    skipped: 0,
    succeeded: 0,
    failed: 0,
    errors: [],
    startTime: new Date(),
    running: false,
  };

  private batchSize = 10;
  private concurrency = 3;

  get status(): BackfillStats {
    return { ...this.stats };
  }

  async runBackfill(options?: {
    batchSize?: number;
    concurrency?: number;
    skipCompleted?: boolean;
    limit?: number;
    targetMissingFields?: boolean; // New option to target leads missing core Google Maps fields
  }): Promise<BackfillStats> {
    if (this.stats.running) {
      logger.warn('BackfillWorker: Already running');
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
      const filter: Record<string, unknown> = {};
      
      if (targetMissingFields) {
        // Target leads with missing core Google Maps fields (showing "Not Available" in frontend)
        filter.$or = [
          { phone: { $in: [null, ''] } },
          { address: { $in: [null, ''] } },
          { category: { $in: [null, ''] } },
          { rating: { $in: [null, 0] } },
          { website: null }, // Only null, not empty string
        ];
        // Also ensure they have placeId or sourceUrl for Google Maps extraction
        filter.$and = [
          {
            $or: [
              { placeId: { $exists: true, $nin: [null, ''] } },
              { sourceUrl: { $exists: true, $nin: [null, ''] } }
            ]
          }
        ];
        logger.info('BackfillWorker: Targeting leads with missing Google Maps fields');
      } else if (skipCompleted) {
        filter.enrichmentStatus = { $ne: 'completed' };
      }

      const totalCount = await Lead.countDocuments(filter);
      this.stats.total = limit > 0 ? Math.min(totalCount, limit) : totalCount;

      logger.info({ 
        total: this.stats.total, 
        filter: JSON.stringify(filter), 
        targetMissingFields,
        skipCompleted 
      }, 'BackfillWorker: Starting');

      const batchSize = options?.batchSize || this.batchSize;
      const processedLimit = limit || totalCount;
      let processed = 0;

      while (processed < processedLimit) {
        const batch = await Lead.find(filter)
          .select('_id companyName website phone address category rating placeId sourceUrl enrichmentStatus')
          .sort({ createdAt: -1 })
          .skip(processed)
          .limit(batchSize)
          .lean();

        if (batch.length === 0) break;

        const batchIds = batch.map(doc => (doc as any)._id.toString());
        const promises = batchIds.map(leadId =>
          leadEnrichmentOrchestrator.enrichLead(leadId)
            .then((r: EnrichmentResult) => {
              if (r.success) {
                this.stats.succeeded++;
              } else {
                this.stats.failed++;
                if (r.errors.length > 0) {
                  this.stats.errors.push(...r.errors.map(e => `${leadId}: ${e}`));
                }
              }
            })
            .catch((err: Error) => {
              this.stats.failed++;
              this.stats.errors.push(`${leadId}: ${err.message}`);
            })
        );

        const chunkSize = options?.concurrency || this.concurrency;
        for (let i = 0; i < promises.length; i += chunkSize) {
          const chunk = promises.slice(i, i + chunkSize);
          await Promise.allSettled(chunk);
        }

        processed += batch.length;
        this.stats.processed = processed;

        logger.info({
          processed: this.stats.processed,
          total: this.stats.total,
          succeeded: this.stats.succeeded,
          failed: this.stats.failed,
          errors: this.stats.errors.length,
        }, 'BackfillWorker: Batch completed');

        if (this.stats.errors.length > 100) {
          logger.warn('BackfillWorker: Too many errors, stopping');
          break;
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.stats.errors.push(`Fatal: ${errMsg}`);
      logger.error({ err: errMsg }, 'BackfillWorker: Fatal error');
    }

    this.stats.endTime = new Date();
    this.stats.running = false;

    const duration = (this.stats.endTime.getTime() - this.stats.startTime.getTime()) / 1000;
    logger.info({
      ...this.stats,
      durationSeconds: duration,
    }, 'BackfillWorker: Completed');

    return this.stats;
  }

  reset(): void {
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
