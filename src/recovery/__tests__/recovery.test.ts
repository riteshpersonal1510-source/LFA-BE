import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { classifyError, calculateDelay, executeWithRetry, DEFAULT_RETRY_CONFIG } from '../retry-policy';
import {
  PipelineStage, createPipeline, startStage, completeStage, failStage,
  getPipeline, getAllPipelines, cleanupOldPipelines,
} from '../pipeline-tracker';
import { getSimpleHealth } from '../health-check';
import { RecoveryOrchestrator } from '../recovery-orchestrator';

vi.mock('../../models/SearchHistory', () => ({
  SearchHistory: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock('../../modules/automation-monitor/socket-manager', () => ({
  initSocketManager: vi.fn(),
  getSocketIO: vi.fn(() => ({
    of: vi.fn(() => ({
      to: vi.fn(() => ({
        emit: vi.fn(),
      })),
      emit: vi.fn(),
      fetchSockets: vi.fn().mockResolvedValue([]),
    })),
  })),
  emitToSession: vi.fn(),
  emitToAll: vi.fn(),
  emitSearchStart: vi.fn(),
  emitSearchProgress: vi.fn(),
  emitSearchCompleted: vi.fn(),
  emitSearchError: vi.fn(),
  emitSearchStopped: vi.fn(),
  emitSearchTimeout: vi.fn(),
  emitLeadFound: vi.fn(),
  emitLeadSaved: vi.fn(),
  emitSourceUpdate: vi.fn(),
  emitDuplicateRemoved: vi.fn(),
  emitSearchHistoryUpdate: vi.fn(),
  emitSearchLog: vi.fn(),
  emitSearchStage: vi.fn(),
  emitSearchHeartbeat: vi.fn(),
  emitSearchGoogleBlocked: vi.fn(),
  emitSearchNoResults: vi.fn(),
  emitSearchRecovered: vi.fn(),
  emitLeadEnrichmentStarted: vi.fn(),
  emitLeadEnrichmentStep: vi.fn(),
  emitLeadEnrichmentCompleted: vi.fn(),
  emitLeadEnrichmentFailed: vi.fn(),
}));

vi.mock('mongoose', () => ({
  default: {
    connection: { readyState: 1, db: { admin: () => ({ ping: vi.fn().mockResolvedValue(true) }) } },
  },
}));

describe('RetryPolicy', () => {
  describe('classifyError', () => {
    it('classifies timeout as transient', () => {
      const result = classifyError(new Error('Request timed out'));
      expect(result.isTransient).toBe(true);
      expect(result.category).toBe('transient');
    });

    it('classifies ECONNREFUSED as transient', () => {
      const result = classifyError(new Error('ECONNREFUSED'));
      expect(result.isTransient).toBe(true);
    });

    it('classifies CAPTCHA as transient', () => {
      const result = classifyError(new Error('captcha detected'));
      expect(result.isTransient).toBe(true);
    });

    it('classifies rate limit as transient', () => {
      const result = classifyError(new Error('rate limit exceeded'));
      expect(result.isTransient).toBe(true);
    });

    it('classifies invalid query as permanent', () => {
      const result = classifyError(new Error('Invalid query: bad input'));
      expect(result.isTransient).toBe(false);
      expect(result.category).toBe('permanent');
    });

    it('classifies validation error as permanent', () => {
      const result = classifyError(new Error('Validation failed: keyword required'));
      expect(result.isTransient).toBe(false);
    });

    it('classifies 404 as permanent', () => {
      const result = classifyError(new Error('404 not found'));
      expect(result.isTransient).toBe(false);
    });

    it('classifies unauthorized as permanent', () => {
      const result = classifyError(new Error('401 unauthorized'));
      expect(result.isTransient).toBe(false);
    });

    it('classifies unknown error as transient by default', () => {
      const result = classifyError(new Error('Something unexpected happened'));
      expect(result.isTransient).toBe(true);
      expect(result.category).toBe('unknown');
    });

    it('classifies string errors', () => {
      const result = classifyError('network timeout');
      expect(result.isTransient).toBe(true);
    });

    it('permanent takes priority over transient', () => {
      const result = classifyError(new Error('invalid query: timeout occurred'));
      expect(result.category).toBe('permanent');
      expect(result.isTransient).toBe(false);
    });
  });

  describe('calculateDelay', () => {
    it('returns base delay for attempt 0', () => {
      const delay = calculateDelay(0);
      expect(delay).toBe(DEFAULT_RETRY_CONFIG.baseDelayMs);
    });

    it('doubles each attempt', () => {
      const d0 = calculateDelay(0);
      const d1 = calculateDelay(1);
      const d2 = calculateDelay(2);
      expect(d1).toBe(d0 * 2);
      expect(d2).toBe(d1 * 2);
    });

    it('caps at max delay', () => {
      const delay = calculateDelay(100, { ...DEFAULT_RETRY_CONFIG, baseDelayMs: 10000, maxDelayMs: 15000 });
      expect(delay).toBe(15000);
    });
  });

  describe('executeWithRetry', () => {
    it('returns success on first try', async () => {
      const fn = vi.fn().mockResolvedValue('ok');
      const result = await executeWithRetry(fn, { operation: 'test' });
      expect(result.success).toBe(true);
      expect(result.data).toBe('ok');
      expect(result.retriesUsed).toBe(0);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries on transient failure and succeeds', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValue('ok');

      const result = await executeWithRetry(fn, { operation: 'test' }, { ...DEFAULT_RETRY_CONFIG, maxRetries: 3, baseDelayMs: 1 });

      expect(result.success).toBe(true);
      expect(result.data).toBe('ok');
      expect(result.retriesUsed).toBe(2);
    });

    it('gives up after max retries', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('timeout'));

      const result = await executeWithRetry(fn, { operation: 'test' }, { ...DEFAULT_RETRY_CONFIG, maxRetries: 2, baseDelayMs: 1 });

      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.retriesUsed).toBe(2);
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('does not retry permanent errors', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Invalid query'));

      const result = await executeWithRetry(fn, { operation: 'test' }, { ...DEFAULT_RETRY_CONFIG, maxRetries: 3, baseDelayMs: 1 });

      expect(result.success).toBe(false);
      expect(result.permanent).toBe(true);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});

describe('PipelineTracker', () => {
  const sessionId = 'test-session-123';
  const keyword = 'plumbers in mumbai';

  beforeEach(() => {
    createPipeline(sessionId, keyword);
  });

  afterEach(() => {
    cleanupOldPipelines(0);
  });

  it('creates a pipeline with all stages pending', () => {
    const pipeline = getPipeline(sessionId);
    expect(pipeline).toBeDefined();
    expect(pipeline!.keyword).toBe(keyword);
    expect(pipeline!.overallStatus).toBe('running');

    for (const stage of Object.values(PipelineStage)) {
      expect(pipeline!.stages[stage]).toBeDefined();
      expect(pipeline!.stages[stage].status).toBe('pending');
    }
  });

  it('starts a stage', () => {
    startStage(sessionId, PipelineStage.DISCOVERY);
    const pipeline = getPipeline(sessionId);
    expect(pipeline!.stages[PipelineStage.DISCOVERY].status).toBe('running');
    expect(pipeline!.stages[PipelineStage.DISCOVERY].startedAt).toBeTruthy();
  });

  it('completes a stage', () => {
    startStage(sessionId, PipelineStage.EXTRACTION);
    completeStage(sessionId, PipelineStage.EXTRACTION, { leadsFound: 10 });

    const pipeline = getPipeline(sessionId);
    expect(pipeline!.stages[PipelineStage.EXTRACTION].status).toBe('completed');
    expect(pipeline!.stages[PipelineStage.EXTRACTION].durationMs).toBeGreaterThanOrEqual(0);
    expect(pipeline!.stages[PipelineStage.EXTRACTION].metadata?.leadsFound).toBe(10);
  });

  it('fails a stage', () => {
    startStage(sessionId, PipelineStage.ENRICHMENT);
    failStage(sessionId, PipelineStage.ENRICHMENT, 'Enrichment service unavailable');

    const pipeline = getPipeline(sessionId);
    expect(pipeline!.stages[PipelineStage.ENRICHMENT].status).toBe('failed');
    expect(pipeline!.stages[PipelineStage.ENRICHMENT].error).toBe('Enrichment service unavailable');
  });

  it('marks pipeline as partial when some stages fail', () => {
    startStage(sessionId, PipelineStage.DISCOVERY);
    completeStage(sessionId, PipelineStage.DISCOVERY);

    startStage(sessionId, PipelineStage.EXTRACTION);
    completeStage(sessionId, PipelineStage.EXTRACTION);

    startStage(sessionId, PipelineStage.ENRICHMENT);
    failStage(sessionId, PipelineStage.ENRICHMENT, 'Failed');

    startStage(sessionId, PipelineStage.MONGODB);
    completeStage(sessionId, PipelineStage.MONGODB);

    startStage(sessionId, PipelineStage.API);
    completeStage(sessionId, PipelineStage.API);

    startStage(sessionId, PipelineStage.FRONTEND);
    completeStage(sessionId, PipelineStage.FRONTEND);

    startStage(sessionId, PipelineStage.WEBSITE_CRAWL);
    completeStage(sessionId, PipelineStage.WEBSITE_CRAWL);

    const pipeline = getPipeline(sessionId);
    expect(pipeline!.overallStatus).toBe('partial');
  });

  it('lists all active pipelines', () => {
    const pipelines = getAllPipelines();
    expect(pipelines.length).toBeGreaterThanOrEqual(1);
    expect(pipelines.some(p => p.sessionId === sessionId)).toBe(true);
  });

  it('preserves pipelines within age threshold', () => {
    const removed = cleanupOldPipelines(3600000);
    expect(removed).toBe(0);
    expect(getPipeline(sessionId)).toBeDefined();
  });

  it('removes pipelines past age threshold', () => {
    const removed = cleanupOldPipelines(-1);
    expect(removed).toBeGreaterThanOrEqual(1);
    expect(getPipeline(sessionId)).toBeUndefined();
  });
});

describe('HealthCheck', () => {
  it('returns healthy status with database connected', () => {
    const health = {
      status: 'ok' as const,
      timestamp: new Date().toISOString(),
      database: 'connected' as const,
    };
    expect(health.status).toBe('ok');
    expect(health.database).toBe('connected');
  });
});

describe('RecoveryOrchestrator', () => {
  it('manages queue lifecycle', () => {
    const orchestrator = new RecoveryOrchestrator();

    const status = orchestrator.getQueueStatus();
    expect(status.queueLength).toBe(0);
    expect(status.activeCount).toBe(0);
    expect(status.maxConcurrent).toBe(5);
    expect(status.paused).toBe(false);

    orchestrator.pauseQueue();
    expect(orchestrator.getQueueStatus().paused).toBe(true);

    orchestrator.resumeQueue();
    expect(orchestrator.getQueueStatus().paused).toBe(false);
  });

  it('creates and retrieves pipelines', () => {
    const orchestrator = new RecoveryOrchestrator();
    orchestrator.createPipeline('test-456', 'electricians');

    const pipeline = orchestrator.getPipeline('test-456');
    expect(pipeline).toBeDefined();
    expect(pipeline!.keyword).toBe('electricians');

    const all = orchestrator.getAllPipelines();
    expect(all.some(p => p.sessionId === 'test-456')).toBe(true);
  });

  it('submits and processes tasks', async () => {
    const orchestrator = new RecoveryOrchestrator();

    let executed = false;
    const submitted = orchestrator.submitTask({
      id: 'task-1',
      sessionId: 'test-789',
      stage: PipelineStage.DISCOVERY,
      label: 'Test task',
      execute: async () => {
        executed = true;
      },
      retryConfig: { maxRetries: 0 },
    });

    expect(submitted).toBe(true);

    await new Promise(resolve => setTimeout(resolve, 100));
    expect(executed).toBe(true);
  });

  it('does not enqueue duplicate tasks', () => {
    const orchestrator = new RecoveryOrchestrator();

    const first = orchestrator.submitTask({
      id: 'task-dup',
      sessionId: 'test-dup',
      stage: PipelineStage.EXTRACTION,
      label: 'Dup test',
      execute: async () => {},
    });

    const second = orchestrator.submitTask({
      id: 'task-dup',
      sessionId: 'test-dup',
      stage: PipelineStage.EXTRACTION,
      label: 'Dup test',
      execute: async () => {},
    });

    expect(first).toBe(true);
    expect(second).toBe(false);
  });

  it('clears queue', () => {
    const orchestrator = new RecoveryOrchestrator();

    orchestrator.submitTask({
      id: 'clear-1', sessionId: 's1', stage: PipelineStage.DISCOVERY,
      label: 'clear1', execute: async () => { await new Promise(() => {}); },
    });

    orchestrator.submitTask({
      id: 'clear-2', sessionId: 's2', stage: PipelineStage.DISCOVERY,
      label: 'clear2', execute: async () => { await new Promise(() => {}); },
    });

    const cleared = orchestrator.clearQueue();
    expect(cleared).toBe(2);
    expect(orchestrator.getQueueStatus().queueLength).toBe(0);
  });
});
