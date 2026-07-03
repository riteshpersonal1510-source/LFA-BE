"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recoveryOrchestrator = exports.RecoveryOrchestrator = void 0;
const logger_1 = require("../utils/logger");
const pipeline_tracker_1 = require("./pipeline-tracker");
const retry_policy_1 = require("./retry-policy");
const SearchHistory_1 = require("../models/SearchHistory");
const MAX_CONCURRENCY = 5;
const MAX_QUEUE_DEPTH = 500;
class QueueManager {
    constructor() {
        this.queue = [];
        this.activeCount = 0;
        this.processing = false;
        this.processingIds = new Set();
        this.paused = false;
    }
    enqueue(task) {
        if (this.processingIds.has(task.id)) {
            logger_1.logger.debug({ taskId: task.id }, 'RecoveryQueue: Already queued or processing');
            return false;
        }
        if (this.queue.length >= MAX_QUEUE_DEPTH) {
            logger_1.logger.warn({ taskId: task.id }, 'RecoveryQueue: Queue full, dropping task');
            return false;
        }
        this.queue.push({ task, enqueuedAt: Date.now() });
        this.processingIds.add(task.id);
        logger_1.logger.info({
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
    getStatus() {
        return {
            queueLength: this.queue.length,
            activeCount: this.activeCount,
            maxConcurrent: MAX_CONCURRENCY,
            processingIds: this.processingIds.size,
            paused: this.paused,
        };
    }
    pause() {
        this.paused = true;
        logger_1.logger.info('RecoveryQueue: Paused');
    }
    resume() {
        this.paused = false;
        logger_1.logger.info('RecoveryQueue: Resumed');
        if (!this.processing) {
            setImmediate(() => this.processNext());
        }
    }
    clear() {
        const count = this.queue.length;
        this.queue = [];
        this.processingIds.clear();
        logger_1.logger.info({ cleared: count }, 'RecoveryQueue: Cleared');
        return count;
    }
    processNext() {
        if (this.processing)
            return;
        this.processing = true;
        const loop = () => {
            while (this.queue.length > 0 && this.activeCount < MAX_CONCURRENCY && !this.paused) {
                const entry = this.queue.shift();
                if (!entry)
                    break;
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
    async runTask(task) {
        (0, pipeline_tracker_1.startStage)(task.sessionId, task.stage);
        try {
            const config = { ...retry_policy_1.DEFAULT_RETRY_CONFIG, ...task.retryConfig };
            const result = await (0, retry_policy_1.executeWithRetry)(task.execute, {
                operation: task.label,
                sessionId: task.sessionId,
            }, config);
            if (result.success) {
                (0, pipeline_tracker_1.completeStage)(task.sessionId, task.stage);
            }
            else if (result.permanent) {
                (0, pipeline_tracker_1.failStage)(task.sessionId, task.stage, result.error || 'Permanent failure');
            }
            else {
                (0, pipeline_tracker_1.failStage)(task.sessionId, task.stage, result.error || 'Max retries exceeded');
            }
            logger_1.logger.info({
                taskId: task.id,
                stage: task.stage,
                success: result.success,
                retriesUsed: result.retriesUsed,
                permanent: result.permanent,
                error: result.error,
            }, 'RecoveryQueue: Task completed');
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            (0, pipeline_tracker_1.failStage)(task.sessionId, task.stage, msg);
            logger_1.logger.error({ taskId: task.id, error: msg }, 'RecoveryQueue: Task threw');
        }
    }
}
class RecoveryOrchestrator {
    constructor() {
        this.cleanupInterval = null;
        this.queueManager = new QueueManager();
    }
    start() {
        this.cleanupInterval = setInterval(() => {
            const removed = (0, pipeline_tracker_1.cleanupOldPipelines)();
            if (removed > 0) {
                logger_1.logger.info({ removed }, 'RecoveryOrchestrator: Cleaned up old pipelines');
            }
        }, 300000);
        logger_1.logger.info('RecoveryOrchestrator: Started');
    }
    stop() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        logger_1.logger.info('RecoveryOrchestrator: Stopped');
    }
    createPipeline(sessionId, keyword) {
        return (0, pipeline_tracker_1.createPipeline)(sessionId, keyword);
    }
    submitTask(task) {
        return this.queueManager.enqueue(task);
    }
    getPipeline(sessionId) {
        return (0, pipeline_tracker_1.getPipeline)(sessionId);
    }
    getAllPipelines() {
        return (0, pipeline_tracker_1.getAllPipelines)();
    }
    getQueueStatus() {
        return this.queueManager.getStatus();
    }
    pauseQueue() {
        this.queueManager.pause();
    }
    resumeQueue() {
        this.queueManager.resume();
    }
    clearQueue() {
        return this.queueManager.clear();
    }
    async getSearchHistoryStats(days = 7) {
        const since = new Date(Date.now() - days * 86400000);
        const records = await SearchHistory_1.SearchHistory.find({
            startedAt: { $gte: since },
        }).lean();
        const total = records.length;
        const completed = records.filter(r => r.status === 'COMPLETED').length;
        const failed = records.filter(r => r.status === 'FAILED').length;
        const stopped = records.filter(r => r.status === 'STOPPED').length;
        const partial = records.filter(r => r.status === 'PARTIAL_SUCCESS').length;
        const timeout = records.filter(r => r.status === 'TIMEOUT').length;
        const noResults = records.filter(r => r.status === 'NO_RESULTS').length;
        const bySource = {};
        for (const record of records) {
            const sources = Array.isArray(record.sources) ? record.sources : ['unknown'];
            const success = record.status === 'COMPLETED' || record.status === 'PARTIAL_SUCCESS';
            for (const source of sources) {
                if (!bySource[source])
                    bySource[source] = { total: 0, success: 0, failure: 0 };
                bySource[source].total++;
                if (success)
                    bySource[source].success++;
                else
                    bySource[source].failure++;
            }
        }
        const completedWithDuration = records.filter(r => r.duration && r.duration > 0);
        const avgDurationMs = completedWithDuration.length > 0
            ? Math.round(completedWithDuration.reduce((sum, r) => sum + (r.duration || 0), 0) / completedWithDuration.length)
            : 0;
        return { total, completed, failed, stopped, partial, timeout, noResults, bySource, avgDurationMs };
    }
    async getSourceMetrics(days = 7) {
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
exports.RecoveryOrchestrator = RecoveryOrchestrator;
exports.recoveryOrchestrator = new RecoveryOrchestrator();
//# sourceMappingURL=recovery-orchestrator.js.map