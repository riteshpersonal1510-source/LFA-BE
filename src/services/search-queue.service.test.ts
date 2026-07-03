import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../models/SearchHistory', () => ({
  SearchHistory: {
    deleteMany: vi.fn().mockResolvedValue({ deletedCount: 5 }),
    countDocuments: vi.fn().mockResolvedValue(10),
    distinct: vi.fn().mockResolvedValue([]),
    find: vi.fn().mockReturnValue({ sort: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) }) }),
    findOne: vi.fn(),
    updateOne: vi.fn(),
  },
}));

vi.mock('../models/SearchAnalytics', () => ({
  SearchAnalytics: {
    deleteMany: vi.fn().mockResolvedValue({ deletedCount: 3 }),
    countDocuments: vi.fn().mockResolvedValue(5),
  },
}));

vi.mock('../models/Lead', () => ({
  Lead: {
    deleteMany: vi.fn().mockResolvedValue({ deletedCount: 0 }),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock('./search-status.service', () => ({
  searchStatus: {
    cleanupAll: vi.fn(),
    getAllSessions: vi.fn().mockReturnValue([]),
  },
}));

vi.mock('./browser-pool.service', () => ({
  browserPool: {
    reset: vi.fn().mockResolvedValue(undefined),
    getStatus: vi.fn().mockReturnValue({ isActive: false }),
  },
}));

vi.mock('../core/scraper-engine/browser-manager', () => ({
  browserManager: {
    reset: vi.fn().mockResolvedValue(undefined),
    getStatus: vi.fn().mockReturnValue({ isActive: false }),
  },
}));

vi.mock('../core/scraper-engine/lead-storage', () => ({
  leadStorage: {
    clearSessionCache: vi.fn(),
  },
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { searchQueue, searchCleanup, CleanupSummary } from './search-queue.service';
import { DEFAULT_SEARCH_SOURCES } from './scraper.service';

describe('SearchCleanupService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a valid CleanupSummary after resetAll', async () => {
    const summary = await searchCleanup.resetAll(false);
    expect(summary).toBeDefined();
    expect(summary.sessionsRemoved).toBeGreaterThanOrEqual(0);
    expect(summary.analyticsRemoved).toBeGreaterThanOrEqual(0);
    expect(summary.queueReset).toBe(true);
    expect(summary.inMemoryCleared).toBe(true);
    expect(summary.browserPoolRecreated).toBe(true);
    expect(summary.scraperBrowserReset).toBe(true);
    expect(summary.leadCacheCleared).toBe(true);
    expect(summary.workersStopped).toBe(true);
    expect(Array.isArray(summary.errors)).toBe(true);
    expect(summary.errors.length).toBe(0);
  });

  it('handles errors gracefully and reports them', async () => {
    const { searchStatus } = await import('./search-status.service');
    (searchStatus.cleanupAll as any).mockImplementationOnce(() => {
      throw new Error('cleanup failed');
    });

    const summary = await searchCleanup.resetAll(false);
    expect(summary.inMemoryCleared).toBe(false);
    expect(summary.errors.length).toBeGreaterThanOrEqual(1);
    expect(summary.errors[0]).toContain('cleanup failed');
  });
});

describe('CleanupSummary interface', () => {
  it('has all required fields', () => {
    const summary: CleanupSummary = {
      sessionsRemoved: 0,
      analyticsRemoved: 0,
      queueReset: false,
      inMemoryCleared: false,
      browserPoolRecreated: false,
      scraperBrowserReset: false,
      workersStopped: false,
      leadCacheCleared: false,
      orphanLeads: 0,
      errors: [],
    };
    expect(summary.sessionsRemoved).toBe(0);
    expect(summary.scraperBrowserReset).toBe(false);
    expect(summary.leadCacheCleared).toBe(false);
  });
});

describe('SearchQueue', () => {
  beforeEach(() => {
    searchQueue.reset();
  });

  it('starts with empty queue', () => {
    expect((searchQueue as any).queue.length).toBe(0);
    expect((searchQueue as any).activeSessions.size).toBe(0);
  });

  it('reset clears all state', () => {
    (searchQueue as any).queue.push({ sessionId: 'test', options: {} as any });
    (searchQueue as any).activeSessions.add('test');
    (searchQueue as any).stopRequested.set('test', true);
    (searchQueue as any).sessionLocks.add('test');
    (searchQueue as any).abortControllers.set('test', new AbortController());

    searchQueue.reset();

    expect((searchQueue as any).queue.length).toBe(0);
    expect((searchQueue as any).activeSessions.size).toBe(0);
    expect((searchQueue as any).stopRequested.size).toBe(0);
    expect((searchQueue as any).sessionLocks.size).toBe(0);
    expect((searchQueue as any).abortControllers.size).toBe(0);
  });

  it('resume defaults to DEFAULT_SEARCH_SOURCES when persisted sources are empty', async () => {
    const mockRecord = {
      searchSessionId: 'resume-session',
      keyword: 'test',
      state: 'State',
      city: 'City',
      area: 'Area',
      country: 'Country',
      sources: [],
      status: 'stopped',
      searchState: 'STOPPED',
    };

    const findOneMock = (require('../models/SearchHistory').SearchHistory.findOne as any);
    findOneMock.mockResolvedValue(mockRecord);

    const enqueueSpy = vi.spyOn(searchQueue, 'enqueue').mockResolvedValue(undefined);

    await searchQueue.resume('resume-session');

    expect(enqueueSpy).toHaveBeenCalledWith('resume-session', expect.objectContaining({
      sources: DEFAULT_SEARCH_SOURCES,
      keyword: 'test',
    }));

    enqueueSpy.mockRestore();
  });

  it('recoverStuckSessions re-enqueues with DEFAULT_SEARCH_SOURCES when sources are missing', async () => {
    const mockRecord = [{
      searchSessionId: 'stuck-session',
      keyword: 'test',
      state: 'State',
      city: 'City',
      area: 'Area',
      country: 'Country',
      sources: undefined,
      status: 'running',
      isRunning: true,
      lastHeartbeat: new Date(),
    }];

    const findMock = (require('../models/SearchHistory').SearchHistory.find as any);
    findMock.mockResolvedValue(mockRecord);

    const enqueueSpy = vi.spyOn(searchQueue, 'enqueue').mockResolvedValue(undefined);

    await searchQueue.recoverStuckSessions();

    expect(enqueueSpy).toHaveBeenCalledWith('stuck-session', expect.objectContaining({
      sources: DEFAULT_SEARCH_SOURCES,
      keyword: 'test',
    }));

    enqueueSpy.mockRestore();
  });

  it('isRunning reflects active sessions', () => {
    expect(searchQueue.isRunning('nonexistent')).toBe(false);
    (searchQueue as any).activeSessions.add('test-session');
    expect(searchQueue.isRunning('test-session')).toBe(true);
  });

  it('isStopRequested reflects stop state', () => {
    expect(searchQueue.isStopRequested('nonexistent')).toBe(false);
    (searchQueue as any).stopRequested.set('test-session', true);
    expect(searchQueue.isStopRequested('test-session')).toBe(true);
  });
});
