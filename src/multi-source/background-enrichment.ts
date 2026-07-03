import { logger } from '../utils/logger';
import {
  emitLeadEnrichmentStarted,
  emitLeadEnrichmentCompleted,
  emitLeadEnrichmentFailed,
} from '../modules/automation-monitor/socket-manager';

interface EnrichmentTask {
  leadId: string;
  source: string;
  keyword: string;
}

const ENRICHMENT_CONCURRENCY = 2;
const POLL_INTERVAL_MS = 1000;

export class BackgroundEnrichmentWorker {
  private queue: EnrichmentTask[] = [];
  private processing = new Set<string>();
  private running = false;
  private activeCount = 0;

  start(): void {
    if (this.running) return;
    this.running = true;
    this.processLoop();
    logger.info('BackgroundEnrichmentWorker: Started');
  }

  stop(): void {
    this.running = false;
    logger.info('BackgroundEnrichmentWorker: Stopped');
  }

  enqueue(task: EnrichmentTask): void {
    if (this.processing.has(task.leadId)) {
      logger.debug({ leadId: task.leadId }, 'BackgroundEnrichmentWorker: Already processing, skipping');
      return;
    }
    this.queue.push(task);
    logger.info({ leadId: task.leadId, source: task.source, queueSize: this.queue.length }, 'BackgroundEnrichmentWorker: Enqueued');
  }

  enqueueBatch(tasks: EnrichmentTask[]): void {
    for (const task of tasks) {
      this.enqueue(task);
    }
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  getProcessingCount(): number {
    return this.activeCount;
  }

  private async processLoop(): Promise<void> {
    while (this.running) {
      if (this.activeCount < ENRICHMENT_CONCURRENCY && this.queue.length > 0) {
        const task = this.queue.shift()!;
        if (!this.processing.has(task.leadId)) {
          this.activeCount++;
          this.processing.add(task.leadId);
          this.processTask(task).finally(() => {
            this.activeCount--;
            this.processing.delete(task.leadId);
          });
        }
      }

      if (this.activeCount === 0 && this.queue.length === 0) {
        await this.sleep(POLL_INTERVAL_MS);
      } else {
        await this.sleep(100);
      }
    }
  }

  private async processTask(task: EnrichmentTask): Promise<void> {
    const startTime = Date.now();

    try {
      emitLeadEnrichmentStarted(task.leadId);

      const { leadEnrichmentOrchestrator } = await import('../enrichment');

      const result = await leadEnrichmentOrchestrator.enrichLead(task.leadId);

      if (result.success) {
        emitLeadEnrichmentCompleted(task.leadId, {
          duration: Date.now() - startTime,
          totalSteps: result.fieldsUpdated?.length || 0,
          errors: result.errors?.length || 0,
        });

        logger.info({
          leadId: task.leadId,
          duration: Date.now() - startTime,
          fieldsUpdated: result.fieldsUpdated?.length || 0,
        }, 'BackgroundEnrichmentWorker: Enrichment completed');
      } else {
        const errorMsg = result.errors?.length > 0 ? result.errors[0] : 'Unknown enrichment error';
        emitLeadEnrichmentFailed(task.leadId, {
          error: errorMsg,
          duration: Date.now() - startTime,
          completedSteps: result.fieldsUpdated?.length || 0,
          totalSteps: 0,
        });

        logger.error({
          leadId: task.leadId,
          error: errorMsg,
          duration: Date.now() - startTime,
        }, 'BackgroundEnrichmentWorker: Enrichment failed');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      emitLeadEnrichmentFailed(task.leadId, {
        error: message,
        duration: Date.now() - startTime,
        completedSteps: 0,
        totalSteps: 0,
      });

      logger.error({
        leadId: task.leadId,
        error: message,
        duration: Date.now() - startTime,
      }, 'BackgroundEnrichmentWorker: Enrichment threw');
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
