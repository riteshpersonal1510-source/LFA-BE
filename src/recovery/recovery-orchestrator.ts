import { logger } from '../utils/logger';
import { PipelineStage, createPipeline, startStage, completeStage, failStage, getPipeline, getAllPipelines, cleanupOldPipelines } from './pipeline-tracker';
import { executeWithRetry, RetryConfig, DEFAULT_RETRY_CONFIG } from './retry-policy';
import { SearchHistory } from '../models/SearchHistory';

export interface QueueTask {
  id: string;
  sessionId: string;
  stage: PipelineStage;
  label: string;
  execute: () => Promise<void>;
  retryConfig?: Partial<RetryConfig>;
}

interface QueueEntry {
  task: QueueTask;
  enqueuedAt: number;
}

const MAX_CONCURRENCY = 5;
const MAX_QUEUE_DEPTH = 500;

class QueueManager {
  private queue: QueueEntry[] = [];
  private activeCount = 0;
  private processing = false;
  private processingIds = new Set<string>();
  private paused = false;

  enqueue(task: QueueTask): boolean {
    if (this.processingIds.has(task.id)) {
      logger.debug({ taskId: task.id }, 'RecoveryQueue: Already queued or processing');
      return false;
    }

    if (this.queue.length >= MAX_QUEUE_DEPTH) {
      logger.warn({ taskId: task.id }, 'RecoveryQueue: Queue full, dropping task');
      return false;
    }

    this.queue.push({ task, enqueuedAt: Date.now() });
    this.processingIds.add(task.id);

    logger.info({
      taskId: task.id,
      stage: task.stage,
      label: task.label,
      queueDepth: this.queue.length,
      activeCount: this.activeCount,
    }, 'RecoveryQueue: Task enqueued');

    if (!this.processing) {
      setImmediate(() => this.processNext());
    }

    return true;
  }

  getStatus(): { queueLength: number; activeCount: number; maxConcurrent: number; processingIds: number; paused: boolean } {
    return {
      queueLength: this.queue.length,
      activeCount: this.activeCount,
      maxConcurrent: MAX_CONCURRENCY,
      processingIds: this.processingIds.size,
      paused: this.paused,
    };
  }

  pause(): void {
    this.paused = true;
    logger.info('RecoveryQueue: Paused');
  }

  resume(): void {
    this.paused = false;
    logger.info('RecoveryQueue: Resumed');
    if (!this.processing) {
      setImmediate(() => this.processNext());
    }
  }

  clear(): number {
    const count = this.queue.length;
    this.queue = [];
    this.processingIds.clear();
    logger.info({ cleared: count }, 'RecoveryQueue: Cleared');
    return count;
  }

  private processNext(): void {
    if (this.processing) return;
    this.processing = true;

    const loop = (): void => {
      while (this.queue.length > 0 && this.activeCount < MAX_CONCURRENCY && !this.paused) {
        const entry = this.queue.shift();
        if (!entry) break;

        this.activeCount++;
        this.runTask(entry.task).finally(() => {
          this.activeCount--;
          this.processingIds.delete(entry.task.id);
          setImmediate(loop);
        });
      }

      this.processing = this.queue.length > 0 && !this.paused;
    };

    loop();
  }

  private async runTask(task: QueueTask): Promise<void> {
    startStage(task.sessionId, task.stage);

    try {
      const config: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...task.retryConfig };

      const result = await executeWithRetry(task.execute, {
        operation: task.label,
        sessionId: task.sessionId,
      }, config);

      if (result.success) {
        completeStage(task.sessionId, task.stage);
      } else if (result.permanent) {
        failStage(task.sessionId, task.stage, result.error || 'Permanent failure');
      } else {
        failStage(task.sessionId, task.stage, result.error || 'Max retries exceeded');
      }

      logger.info({
        taskId: task.id,
        stage: task.stage,
        success: result.success,
        retriesUsed: result.retriesUsed,
        permanent: result.permanent,
        error: result.error,
      }, 'RecoveryQueue: Task completed');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      failStage(task.sessionId, task.stage, msg);
      logger.error({ taskId: task.id, error: msg }, 'RecoveryQueue: Task threw');
    }
  }
}

export class RecoveryOrchestrator {
  private queueManager: QueueManager;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.queueManager = new QueueManager();
  }

  start(): void {
    this.cleanupInterval = setInterval(() => {
      const removed = cleanupOldPipelines();
      if (removed > 0) {
        logger.info({ removed }, 'RecoveryOrchestrator: Cleaned up old pipelines');
      }
    }, 300000);

    logger.info('RecoveryOrchestrator: Started');
  }

  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    logger.info('RecoveryOrchestrator: Stopped');
  }

  createPipeline(sessionId: string, keyword: string): ReturnType<typeof createPipeline> {
    return createPipeline(sessionId, keyword);
  }

  submitTask(task: QueueTask): boolean {
    return this.queueManager.enqueue(task);
  }

  getPipeline(sessionId: string): ReturnType<typeof getPipeline> {
    return getPipeline(sessionId);
  }

  getAllPipelines(): ReturnType<typeof getAllPipelines> {
    return getAllPipelines();
  }

  getQueueStatus(): ReturnType<QueueManager['getStatus']> {
    return this.queueManager.getStatus();
  }

  pauseQueue(): void {
    this.queueManager.pause();
  }

  resumeQueue(): void {
    this.queueManager.resume();
  }

  clearQueue(): number {
    return this.queueManager.clear();
  }

  async getSearchHistoryStats(days: number = 7): Promise<{
    total: number;
    completed: number;
    failed: number;
    stopped: number;
    partial: number;
    timeout: number;
    noResults: number;
    bySource: Record<string, { total: number; success: number; failure: number }>;
    avgDurationMs: number;
  }> {
    const since = new Date(Date.now() - days * 86400000);

    const records = await SearchHistory.find({
      startedAt: { $gte: since },
    }).lean();

    const total = records.length;
    const completed = records.filter(r => r.status === 'COMPLETED').length;
    const failed = records.filter(r => r.status === 'FAILED').length;
    const stopped = records.filter(r => r.status === 'STOPPED').length;
    const partial = records.filter(r => r.status === 'PARTIAL_SUCCESS').length;
    const timeout = records.filter(r => r.status === 'TIMEOUT').length;
    const noResults = records.filter(r => r.status === 'NO_RESULTS').length;

    const bySource: Record<string, { total: number; success: number; failure: number }> = {};
    for (const record of records) {
      const sources = Array.isArray(record.sources) ? record.sources : ['unknown'];
      const success = record.status === 'COMPLETED' || record.status === 'PARTIAL_SUCCESS';

      for (const source of sources) {
        if (!bySource[source]) bySource[source] = { total: 0, success: 0, failure: 0 };
        bySource[source].total++;
        if (success) bySource[source].success++;
        else bySource[source].failure++;
      }
    }

    const completedWithDuration = records.filter(r => r.duration && r.duration > 0);
    const avgDurationMs = completedWithDuration.length > 0
      ? Math.round(completedWithDuration.reduce((sum, r) => sum + (r.duration || 0), 0) / completedWithDuration.length)
      : 0;

    return { total, completed, failed, stopped, partial, timeout, noResults, bySource, avgDurationMs };
  }

  async getSourceMetrics(days: number = 7): Promise<Array<{
    source: string;
    totalSearches: number;
    successCount: number;
    failureCount: number;
    successRate: number;
    failureRate: number;
    avgExtractionMs: number;
    avgEnrichmentMs: number;
    retryCount: number;
  }>> {
    const stats = await this.getSearchHistoryStats(days);
    const sources = Object.keys(stats.bySource);

    return sources.map(source => {
      const s = stats.bySource[source];
      const total = s.total || 1;
      return {
        source,
        totalSearches: s.total,
        successCount: s.success,
        failureCount: s.failure,
        successRate: Math.round((s.success / total) * 100),
        failureRate: Math.round((s.failure / total) * 100),
        avgExtractionMs: stats.avgDurationMs,
        avgEnrichmentMs: 0,
        retryCount: 0,
      };
    });
  }
}

export const recoveryOrchestrator = new RecoveryOrchestrator();
