import { logger } from './logger';

interface PerfEntry {
  operation: string;
  sessionId?: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

class PerfMonitor {
  private entries: PerfEntry[] = [];
  private active = new Map<string, PerfEntry>();
  private readonly MAX_ENTRIES = 1000;

  start(operation: string, sessionId?: string, metadata?: Record<string, unknown>): string {
    const id = `${operation}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const entry: PerfEntry = {
      operation,
      sessionId,
      startTime: Date.now(),
      metadata,
    };
    this.active.set(id, entry);
    return id;
  }

  end(id: string, metadata?: Record<string, unknown>): number | null {
    const entry = this.active.get(id);
    if (!entry) return null;
    entry.endTime = Date.now();
    entry.durationMs = entry.endTime - entry.startTime;
    if (metadata) entry.metadata = { ...entry.metadata, ...metadata };
    this.entries.push(entry);
    this.active.delete(id);

    if (this.entries.length > this.MAX_ENTRIES) {
      this.entries = this.entries.slice(-this.MAX_ENTRIES);
    }

    return entry.durationMs;
  }

  async measure<T>(
    operation: string,
    fn: () => Promise<T>,
    options?: { sessionId?: string; metadata?: Record<string, unknown>; log?: boolean }
  ): Promise<T> {
    const id = this.start(operation, options?.sessionId, options?.metadata);
    try {
      const result = await fn();
      const duration = this.end(id);
      if (options?.log && duration !== null) {
        logger.info({ operation, durationMs: duration, sessionId: options?.sessionId }, `[PERF] ${operation} completed in ${duration}ms`);
      }
      return result;
    } catch (error) {
      this.end(id, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  getRecent(count = 50): PerfEntry[] {
    return this.entries.slice(-count).reverse();
  }

  getStats(operation?: string): {
    count: number;
    avgMs: number;
    minMs: number;
    maxMs: number;
    recentAvgMs: number;
  } {
    const filtered = operation
      ? this.entries.filter(e => e.operation === operation && e.durationMs != null)
      : this.entries.filter(e => e.durationMs != null);

    if (filtered.length === 0) {
      return { count: 0, avgMs: 0, minMs: 0, maxMs: 0, recentAvgMs: 0 };
    }

    const durations = filtered.map(e => e.durationMs!);
    const recent = durations.slice(-20);
    const sum = durations.reduce((a, b) => a + b, 0);
    const recentSum = recent.reduce((a, b) => a + b, 0);

    return {
      count: durations.length,
      avgMs: Math.round(sum / durations.length),
      minMs: Math.min(...durations),
      maxMs: Math.max(...durations),
      recentAvgMs: recent.length > 0 ? Math.round(recentSum / recent.length) : 0,
    };
  }

  getAllStats(): Record<string, { count: number; avgMs: number; minMs: number; maxMs: number; recentAvgMs: number }> {
    const operations = new Set(this.entries.map(e => e.operation));
    const stats: Record<string, any> = {};
    for (const op of operations) {
      stats[op] = this.getStats(op);
    }
    return stats;
  }

  reset(): void {
    this.entries = [];
    this.active.clear();
  }
}

export const perfMonitor = new PerfMonitor();
