"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchQueryScheduler = exports.SearchQueryScheduler = void 0;
const logger_1 = require("../utils/logger");
class SearchQueryScheduler {
    constructor(concurrencyLimit = 5) {
        this.activeCount = 0;
        this.queue = [];
        this.concurrencyLimit = concurrencyLimit;
    }
    setConcurrency(limit) {
        this.concurrencyLimit = Math.max(1, limit);
        logger_1.logger.info({ concurrencyLimit: this.concurrencyLimit }, 'SearchQueryScheduler: Concurrency updated');
    }
    async submit(query) {
        return new Promise((resolve) => {
            this.queue.push({ query: query, resolve: resolve });
            this.processNext();
        });
    }
    async submitBatch(queries) {
        const results = await Promise.all(queries.map(q => this.submit(q)));
        return results;
    }
    processNext() {
        if (this.queue.length === 0)
            return;
        while (this.activeCount < this.concurrencyLimit && this.queue.length > 0) {
            const item = this.queue.shift();
            if (!item)
                break;
            this.activeCount++;
            this.executeWithRetry(item.query, item.resolve);
        }
    }
    async executeWithRetry(query, resolve) {
        const startTime = Date.now();
        let retriesUsed = 0;
        let lastError = null;
        for (let attempt = 0; attempt <= Math.min(query.maxRetries, 2); attempt++) {
            if (attempt > 0) {
                retriesUsed = attempt;
                logger_1.logger.info({
                    label: query.label,
                    attempt: attempt + 1,
                    maxRetries: query.maxRetries,
                }, 'SearchQueryScheduler: Retrying query');
            }
            const abortController = new AbortController();
            const timeoutId = setTimeout(() => {
                abortController.abort();
            }, query.timeoutMs || 20000);
            try {
                const result = await Promise.race([
                    query.execute(),
                    new Promise((_, reject) => {
                        abortController.signal.addEventListener('abort', () => {
                            reject(new Error(`Query timed out after ${query.timeoutMs}ms`));
                        });
                    }),
                ]);
                clearTimeout(timeoutId);
                this.activeCount--;
                this.processNext();
                resolve({
                    id: query.id,
                    label: query.label,
                    success: true,
                    data: result,
                    error: null,
                    durationMs: Date.now() - startTime,
                    retriesUsed,
                    timedOut: false,
                });
                return;
            }
            catch (error) {
                clearTimeout(timeoutId);
                const message = error instanceof Error ? error.message : String(error);
                const isTimeout = message.includes('timed out');
                const isRetryable = this.isRetryableError(message) && !isTimeout;
                lastError = message;
                if (isTimeout) {
                    logger_1.logger.warn({
                        label: query.label,
                        durationMs: Date.now() - startTime,
                    }, 'SearchQueryScheduler: Query timed out, skipping');
                    break;
                }
                if (!isRetryable || attempt >= Math.min(query.maxRetries, 2)) {
                    break;
                }
                await this.delay(1000 * (attempt + 1));
            }
        }
        this.activeCount--;
        this.processNext();
        const isTimeout = lastError?.includes('timed out') ?? false;
        resolve({
            id: query.id,
            label: query.label,
            success: false,
            data: null,
            error: lastError,
            durationMs: Date.now() - startTime,
            retriesUsed,
            timedOut: isTimeout,
        });
    }
    isRetryableError(message) {
        const nonRetryable = [
            'invalid query',
            'invalid keyword',
            'bad request',
            'invalid source',
            'not found',
            '404',
            'validation failed',
        ];
        const lower = message.toLowerCase();
        return !nonRetryable.some(nr => lower.includes(nr));
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    getActiveCount() {
        return this.activeCount;
    }
    getQueueLength() {
        return this.queue.length;
    }
    getStatus() {
        return {
            activeCount: this.activeCount,
            queueLength: this.queue.length,
            concurrencyLimit: this.concurrencyLimit,
        };
    }
    clear() {
        const remaining = this.queue.splice(0);
        for (const item of remaining) {
            item.resolve({
                id: item.query.id,
                label: item.query.label,
                success: false,
                data: null,
                error: 'Scheduler cleared',
                durationMs: 0,
                retriesUsed: 0,
                timedOut: false,
            });
        }
        logger_1.logger.info({ clearedJobs: remaining.length }, 'SearchQueryScheduler: Queue cleared');
    }
}
exports.SearchQueryScheduler = SearchQueryScheduler;
exports.searchQueryScheduler = new SearchQueryScheduler(5);
//# sourceMappingURL=search-query-scheduler.service.js.map