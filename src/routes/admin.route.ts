import { Router, Request, Response } from 'express';
import { searchCleanup } from '../services/search-queue.service';
import { logger } from '../utils/logger';
import { APIResponse } from '../utils/api-response';

const router = Router();

router.post('/search/reset', async (req: Request, res: Response) => {
  const deleteCompleted = req.query.completed === 'true';
  logger.info({ deleteCompleted }, '[ADMIN] Search queue reset requested');

  try {
    const summary = await searchCleanup.resetAll(deleteCompleted);

    logger.info({
      sessionsRemoved: summary.sessionsRemoved,
      analyticsRemoved: summary.analyticsRemoved,
      queueReset: summary.queueReset,
      browserPoolRecreated: summary.browserPoolRecreated,
      orphanLeads: summary.orphanLeads,
      errors: summary.errors.length,
    }, '[ADMIN] Search queue reset completed');

    return APIResponse.success(res, summary, 'Search queue reset completed');
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error({ err: msg }, '[ADMIN] Search queue reset failed');
    return APIResponse.error(res, 'Reset failed: ' + msg, undefined, 500);
  }
});

router.get('/search/status', async (_req: Request, res: Response) => {
  const { searchQueue } = await import('../services/search-queue.service');
  const { searchStatus } = await import('../services/search-status.service');
  const { browserPool } = await import('../services/browser-pool.service');
  const { browserManager } = await import('../core/scraper-engine/browser-manager');

  const queueStatus = {
    activeSessions: (searchQueue as any).activeSessions?.size || 0,
    pendingQueue: (searchQueue as any).queue?.length || 0,
    lockedSessions: (searchQueue as any).sessionLocks?.size || 0,
    abortControllers: (searchQueue as any).abortControllers?.size || 0,
  };

  const statusStatus = {
    inMemorySessions: (searchStatus as any).sessions?.size || 0,
    emitTimers: (searchStatus as any).emitTimers?.size || 0,
    persistTimers: (searchStatus as any).persistTimers?.size || 0,
  };

  const browserPoolStatus = browserPool.getStatus();
  const browserManagerStatus = browserManager.getStatus();

  return APIResponse.success(res, {
    queue: queueStatus,
    status: statusStatus,
    browserPool: browserPoolStatus,
    browserManager: browserManagerStatus,
  }, 'Search system status');
});

export default router;