import { ScraperService, ScrapeOptions, DEFAULT_SEARCH_SOURCES } from './scraper.service';
import { searchStatus } from './search-status.service';
import { browserPool } from './browser-pool.service';
import { browserManager } from '../core/scraper-engine/browser-manager';
import { leadStorage } from '../core/scraper-engine/lead-storage';
import { SearchHistory, ISearchHistory } from '../models/SearchHistory';
import { SearchAnalytics } from '../models/SearchAnalytics';
import { Lead } from '../models/Lead';
import { logger } from '../utils/logger';
import { SearchState } from '../automation/search-state-machine';
import { FilterQuery } from 'mongoose';
import { buildLocationString } from '../utils/location-query-builder';
import { PipelineStage, createPipeline, startStage, completeStage, failStage } from '../recovery';
import { emitSearchHistoryUpdate } from '../modules/automation-monitor/socket-manager';
import type { SearchStatusData } from './search-status.service';

const TABLE_FLIP = '(╯°□°)╯︵ ┻━┻';

// Helper to emit partial-success history update without importing the full status service
function emitSearchHistoryUpdatePartial(sessionId: string, session: SearchStatusData, savedCount: number, errorMsg: string): void {
  const durationMs = Date.now() - new Date(session.startedAt).getTime();
  emitSearchHistoryUpdate(sessionId, {
    keyword: session.keyword,
    state: session.state,
    city: session.city,
    area: session.area,
    country: session.country,
    sources: session.sources,
    totalLeads: savedCount,
    businessesFound: session.leadsFound,
    businessesSaved: savedCount,
    duplicates: session.duplicatesRemoved,
    progress: session.progressPercentage,
    maxProgressReached: session.progressPercentage,
    startedAt: session.startedAt,
    completedAt: new Date().toISOString(),
    duration: Math.round(durationMs / 1000),
    status: 'PARTIAL_SUCCESS',
    failureReason: errorMsg,
    failureClassification: 'BACKEND_CRASH',
    searchSessionId: sessionId,
  });
}

interface QueuedSearch {
  sessionId: string;
  options: ScrapeOptions;
}

class SearchQueueService {
  private scraperService = new ScraperService();
  private activeSessions = new Set<string>();
  private stopRequested = new Map<string, boolean>();
  private queue: QueuedSearch[] = [];
  private sessionLocks = new Set<string>();
  private abortControllers = new Map<string, AbortController>();

  isRunning(sessionId: string): boolean {
    return this.activeSessions.has(sessionId);
  }

  isStopRequested(sessionId: string): boolean {
    return this.stopRequested.get(sessionId) === true;
  }

  async enqueue(sessionId: string, options: ScrapeOptions): Promise<void> {
    if (!this.activeSessions.has(sessionId)) {
      this.stopRequested.set(sessionId, false);
    }

    const queueDepth = this.queue.length;
    logger.info({
      sessionId,
      keyword: options.keyword,
      location: options.location,
      sources: options.sources,
      queueDepth,
    }, `[SEARCH_CREATED] Search created and enqueued for "${options.keyword}"`);

    searchStatus.setState(sessionId, SearchState.QUEUED);
    searchStatus.addLog(sessionId, 'Search queued', 'info');

    this.queue.push({ sessionId, options });
    this.processNext();
  }

  async stop(sessionId: string): Promise<void> {
    logger.info({ sessionId }, `[SEARCH_QUEUE] Stopping search ${sessionId}`);
    this.stopRequested.set(sessionId, true);

    const controller = this.abortControllers.get(sessionId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(sessionId);
    }

    await searchStatus.markStopped(sessionId);

    this.activeSessions.delete(sessionId);

    this.queue = this.queue.filter(j => j.sessionId !== sessionId);
    logger.info({ sessionId }, `[SEARCH_QUEUE] Search ${sessionId} stopped`);
  }

  async resume(sessionId: string): Promise<void> {
    const record = await SearchHistory.findOne({ searchSessionId: sessionId }).lean();
    if (!record) {
      logger.error({ sessionId }, `[SEARCH_QUEUE] ${TABLE_FLIP} Cannot resume - session not found`);
      return;
    }

    if (record.status !== 'STOPPED') {
      logger.warn({ sessionId, status: record.status }, `[SEARCH_QUEUE] Cannot resume - not in stopped state`);
      return;
    }

    logger.info({ sessionId }, `[SEARCH_QUEUE] Resuming search ${sessionId}`);
    this.stopRequested.set(sessionId, false);

    await SearchHistory.updateOne(
      { searchSessionId: sessionId },
      { $set: { status: 'running', isRunning: true, stoppedAt: null, searchState: SearchState.QUEUED } }
    );

    const locationString = buildLocationString({
      area: record.area,
      city: record.city,
      state: record.state,
      country: record.country,
    });

    const resumeSources = Array.isArray(record.sources) && record.sources.length > 0
      ? record.sources
      : [...DEFAULT_SEARCH_SOURCES];

    searchStatus.restoreFromDB(record);
    searchStatus.setState(sessionId, SearchState.QUEUED);
    searchStatus.addLog(sessionId, 'Search resumed', 'info');

    await this.enqueue(sessionId, {
      keyword: record.keyword,
      location: locationString,
      sources: resumeSources,
      limit: 0,
      state: record.state,
      city: record.city,
      area: record.area,
      country: record.country,
      businessType: record.keyword,
      sessionId,
    });
  }

  private async processNext(): Promise<void> {
    while (this.queue.length > 0) {
      const job = this.queue.shift();
      if (!job) break;

      if (this.isStopRequested(job.sessionId)) {
        searchStatus.addLog(job.sessionId, 'Search was stopped while queued', 'warn');
        continue;
      }

      if (this.sessionLocks.has(job.sessionId)) {
        searchStatus.addLog(job.sessionId, 'Search already running, skipping', 'warn');
        continue;
      }

      this.executeJob(job).catch(err => {
        logger.error({ sessionId: job.sessionId, err }, '[SEARCH_QUEUE] executeJob threw');
      });
    }
  }

  private async executeJob(job: QueuedSearch): Promise<void> {
    const { sessionId, options } = job;
    if (this.activeSessions.has(sessionId)) return;

    if (this.sessionLocks.has(sessionId)) {
      logger.warn({ sessionId }, `[SEARCH_QUEUE] Session already locked, skipping`);
      return;
    }

    this.sessionLocks.add(sessionId);
    const jobStartTime = Date.now();

    try {
      this.activeSessions.add(sessionId);
      this.stopRequested.set(sessionId, false);

      const abortController = new AbortController();
      this.abortControllers.set(sessionId, abortController);

      logger.info({ sessionId, keyword: options.keyword }, `[SEARCH_QUEUE] [WORKER_STARTED] executeJob for "${options.keyword}"`);

      searchStatus.setState(sessionId, SearchState.STARTING_BROWSER);
      searchStatus.addLog(sessionId, '[PLAYWRIGHT_START] Starting browser...', 'info');

      createPipeline(sessionId, options.keyword);
      startStage(sessionId, PipelineStage.EXTRACTION);

      if (this.isStopRequested(sessionId)) return;

      searchStatus.setState(sessionId, SearchState.BROWSER_READY);
      searchStatus.addLog(sessionId, '[BROWSER_LAUNCHED] Browser ready', 'info');

      if (this.isStopRequested(sessionId)) return;

      searchStatus.setState(sessionId, SearchState.SEARCHING_GOOGLE_MAPS);
      searchStatus.addLog(sessionId, '[GOOGLE_MAPS_OPENED] Searching Google Maps...', 'info');

      const optionsWithCancel = {
        ...options,
        skipSearchTracking: true,
        isCancelled: () => this.isStopRequested(sessionId) || abortController.signal.aborted,
      };

      logger.info({ sessionId }, `[SEARCH_QUEUE] Calling scraperService.scrapeBusinesses()`);

      const result = await this.scraperService.scrapeBusinesses(optionsWithCancel);

      const elapsed = Date.now() - jobStartTime;
      logger.info({
        sessionId,
        elapsed,
        success: result.success,
        stored: result.totalStored,
        extracted: result.totalExtracted,
        message: result.message,
        errors: result.errors?.length || 0,
      }, `[SEARCH_QUEUE] scrapeBusinesses returned after ${elapsed}ms: "${result.message}"`);

      if (result.errors && result.errors.length > 0) {
        for (const err of result.errors) {
          logger.error({ source: err.source, error: err.error }, `[SEARCH_QUEUE] Source error: [${err.source}] ${err.error}`);
          searchStatus.addLog(sessionId, `[${err.source}] ${err.error}`, 'error');
        }
      }

      if (this.isStopRequested(sessionId)) return;

      searchStatus.setState(sessionId, SearchState.SCRAPING_RESULTS);
      searchStatus.addLog(sessionId, `[RESULTS_FOUND] Scraping complete. ${result.totalExtracted} found, ${result.totalStored} saved`, 'info');

      completeStage(sessionId, PipelineStage.EXTRACTION);
      startStage(sessionId, PipelineStage.MONGODB);

      if (this.isStopRequested(sessionId)) return;

      searchStatus.setState(sessionId, SearchState.PROCESSING_RESULTS);
      searchStatus.addLog(sessionId, `Found: ${result.totalExtracted}, Saved: ${result.totalStored}, Duplicates: ${result.totalDuplicates}`, 'info');

      if (!result.success && result.totalStored === 0) {
        const failureMessage = result.errors && result.errors.length > 0
          ? result.errors.map(e => `[${e.source}] ${e.error}`).join('; ')
          : result.message || 'Scraping returned no results';
        const isNoResults = result.errors && result.errors.some(e => e.error?.includes('NO_RESULTS')) || failureMessage.includes('No results found');

        if (isNoResults) {
          logger.info({ sessionId, message: failureMessage }, `[SEARCH_QUEUE] No results found`);
          searchStatus.addLog(sessionId, `[NO_RESULTS] ${failureMessage}`, 'warn');
          failStage(sessionId, PipelineStage.EXTRACTION, failureMessage);
          await searchStatus.markNoResults(sessionId, failureMessage);
          return;
        }

        logger.error({ sessionId, error: failureMessage }, `[SEARCH_QUEUE] ${TABLE_FLIP} Search failed: ${failureMessage}`);
        searchStatus.addLog(sessionId, `[SEARCH_FAILED] ${failureMessage}`, 'error');

        const normalizedFailureMessage = failureMessage.toLowerCase();
        const isTimeout = normalizedFailureMessage.includes('timed out') || normalizedFailureMessage.includes('timeout');
        const isBlocked = normalizedFailureMessage.includes('blocked') || normalizedFailureMessage.includes('captcha') || normalizedFailureMessage.includes('sign_in') || normalizedFailureMessage.includes('sign in') || normalizedFailureMessage.includes('consent');

        if (isBlocked) {
          await searchStatus.markGoogleBlocked(sessionId, failureMessage);
        } else if (isTimeout) {
          await searchStatus.markTimeout(sessionId, failureMessage);
        } else {
          await searchStatus.markFailed(sessionId, failureMessage);
        }
        failStage(sessionId, PipelineStage.EXTRACTION, failureMessage);
        return;
      }

      if (this.isStopRequested(sessionId)) return;

      searchStatus.setState(sessionId, SearchState.SAVING_LEADS);
      searchStatus.addLog(sessionId, '[LEAD_SAVED] Finalizing lead storage...', 'info');

      const completedSources = Object.keys(result.results).filter(s => result.results[s].totalStored > 0);
      const failedSources = Object.keys(result.results).filter(s => result.results[s].totalStored === 0);

      logger.info({ sessionId, stored: result.totalStored, elapsed }, `[SEARCH_QUEUE] [SEARCH_COMPLETED] Job completed in ${elapsed}ms`);

      await searchStatus.markCompleted(sessionId, completedSources, failedSources);

      completeStage(sessionId, PipelineStage.MONGODB);

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      const elapsed = Date.now() - jobStartTime;

      if (this.isStopRequested(sessionId) || (error instanceof Error && error.name === 'AbortError')) {
        logger.info({ sessionId, elapsed }, `[SEARCH_QUEUE] Search stopped after ${elapsed}ms`);
        return;
      }

      const normalizedMessage = message.toLowerCase();
      const isTimeout = normalizedMessage.includes('timed out') || normalizedMessage.includes('timeout');
      const isBlocked = normalizedMessage.includes('blocked') || normalizedMessage.includes('captcha') || normalizedMessage.includes('sign in') || normalizedMessage.includes('sign_in') || normalizedMessage.includes('consent') || normalizedMessage.includes('rate_limit') || normalizedMessage.includes('unusual traffic');

      logger.error({ sessionId, err: message, elapsed }, `[SEARCH_QUEUE] ${TABLE_FLIP} Job failed with exception after ${elapsed}ms: ${message}`);
      searchStatus.addLog(sessionId, `[SEARCH_FAILED] ${message}`, 'error');

      // Check if any leads were already saved (partial success)
      const savedCount = (await SearchHistory.findOne({ searchSessionId: sessionId }).lean())?.currentSaved || 0;

      if (savedCount > 0 && !isBlocked && !isTimeout) {
        // Partial success: some leads saved before failure
        const durationMs = elapsed;
        const session = searchStatus.getProgress(sessionId);
        if (session) {
          await SearchHistory.updateOne(
            { searchSessionId: sessionId },
            {
              $set: {
                status: 'PARTIAL_SUCCESS',
                searchState: 'PARTIAL_SUCCESS',
                isRunning: false,
                completedAt: new Date(),
                duration: durationMs,
                failureReason: `Partial completion: saved ${savedCount} leads before failure. Error: ${message}`,
                failureClassification: 'BACKEND_CRASH',
                maxProgressReached: session.progressPercentage || 0,
                lastUpdateTime: new Date(),
              },
            }
          );
          await searchStatus.captureErrorMetadata(sessionId, message, errorStack);
          searchStatus.addLog(sessionId, `[PARTIAL_SUCCESS] ${savedCount} leads saved before failure`, 'warn');
          // Emit history update for partial success
          emitSearchHistoryUpdatePartial(sessionId, session, savedCount, message);
        }
        failStage(sessionId, PipelineStage.EXTRACTION, message);
      } else if (isBlocked) {
        await searchStatus.markGoogleBlocked(sessionId, message, [], errorStack);
      } else if (isTimeout) {
        await searchStatus.markTimeout(sessionId, message, [], errorStack);
      } else {
        await searchStatus.markFailed(sessionId, message, [], errorStack);
      }
      failStage(sessionId, PipelineStage.EXTRACTION, message);

    } finally {
      this.activeSessions.delete(sessionId);
      this.stopRequested.delete(sessionId);
      this.abortControllers.delete(sessionId);
      this.sessionLocks.delete(sessionId);
    }
  }

  reset(): void {
    for (const controller of this.abortControllers.values()) {
      try { controller.abort(); } catch {}
    }

    this.activeSessions.clear();
    this.stopRequested.clear();
    this.sessionLocks.clear();
    this.abortControllers.clear();
    this.queue = [];
  }

  async recoverStuckSessions(): Promise<void> {
    const stuck = await SearchHistory.find({
      status: 'running',
      isRunning: true,
    }).lean();

    for (const record of stuck) {
      const sessionId = record.searchSessionId;
      if (this.activeSessions.has(sessionId)) continue;

      const lastHeartbeat = record.lastHeartbeat || record.updatedAt || record.startedAt;
      const ageMs = Date.now() - new Date(lastHeartbeat).getTime();

      if (ageMs < 120000) {
        logger.info({ sessionId }, `[SEARCH_QUEUE] Recovering active session after restart`);
        searchStatus.restoreFromDB(record);
        searchStatus.setState(sessionId, SearchState.QUEUED);
        searchStatus.addLog(sessionId, 'Session recovered after server restart', 'info');

        const locationString = buildLocationString({
          area: record.area,
          city: record.city,
          state: record.state,
          country: record.country,
        });

        await this.enqueue(sessionId, {
          keyword: record.keyword,
          location: locationString,
          sources: Array.isArray(record.sources) && record.sources.length > 0
            ? record.sources
            : [...DEFAULT_SEARCH_SOURCES],
          limit: 0,
          state: record.state,
          city: record.city,
          area: record.area,
          country: record.country,
          businessType: record.keyword,
          sessionId,
        });
      } else {
        logger.warn({ sessionId, ageMs }, `[SEARCH_QUEUE] Marking stale session as failed`);
        await searchStatus.markFailed(sessionId, 'Session timed out after server restart');
      }
    }
  }
}

export const searchQueue = new SearchQueueService();

export interface CleanupSummary {
  sessionsRemoved: number;
  analyticsRemoved: number;
  queueReset: boolean;
  inMemoryCleared: boolean;
  browserPoolRecreated: boolean;
  scraperBrowserReset: boolean;
  workersStopped: boolean;
  leadCacheCleared: boolean;
  orphanLeads: number;
  errors: string[];
}

class SearchCleanupService {
  async resetAll(deleteCompleted = false): Promise<CleanupSummary> {
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

    try {
      searchStatus.cleanupAll();
      summary.inMemoryCleared = true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      summary.errors.push(`inMemoryClear: ${msg}`);
    }

    try {
      searchQueue.reset();
      summary.queueReset = true;
      summary.workersStopped = true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      summary.errors.push(`queueReset: ${msg}`);
    }

    try {
      await browserPool.reset();
      summary.browserPoolRecreated = true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      summary.errors.push(`browserPoolReset: ${msg}`);
    }

    try {
      await browserManager.reset();
      summary.scraperBrowserReset = true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      summary.errors.push(`scraperBrowserReset: ${msg}`);
    }

    try {
      leadStorage.clearSessionCache();
      summary.leadCacheCleared = true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      summary.errors.push(`leadCacheClear: ${msg}`);
    }

    try {
      const staleStates = [
        SearchState.QUEUED,
        SearchState.STARTING_BROWSER,
        SearchState.BROWSER_READY,
        SearchState.SEARCHING_GOOGLE_MAPS,
        SearchState.SCRAPING_RESULTS,
        SearchState.PROCESSING_RESULTS,
        SearchState.SAVING_LEADS,
        SearchState.FAILED,
        SearchState.STOPPED,
      ];

      const filter: FilterQuery<ISearchHistory> = deleteCompleted
        ? {}
        : {
            $or: [
              { searchState: { $in: staleStates } },
              { status: { $ne: 'completed' } },
            ],
          };
      const deleteResult = await SearchHistory.deleteMany(filter);
      summary.sessionsRemoved = deleteResult.deletedCount;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      summary.errors.push(`sessionDelete: ${msg}`);
    }

    try {
      const analyticsResult = await SearchAnalytics.deleteMany({});
      summary.analyticsRemoved = analyticsResult.deletedCount;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      summary.errors.push(`analyticsDelete: ${msg}`);
    }

    try {
      const activeIds = await SearchHistory.distinct('searchSessionId');
      summary.orphanLeads = await Lead.countDocuments({
        searchSessionId: { $nin: activeIds },
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      summary.errors.push(`orphanCheck: ${msg}`);
    }

    return summary;
  }

  async startupCleanup(): Promise<void> {
    const summary = await this.resetAll(false);

    logger.info('====================================');
    logger.info('Search Queue Cleanup');
    logger.info('====================');
    logger.info(`Removed Sessions: ${summary.sessionsRemoved}`);
    logger.info(`Removed Jobs: ${summary.queueReset ? 'All queued jobs cleared' : 'Failed'}`);
    logger.info(`Removed Locks: ${summary.workersStopped ? 'All locks released' : 'Failed'}`);
    logger.info(`Removed Analytics: ${summary.analyticsRemoved}`);
    logger.info(`Browser Pool: ${summary.browserPoolRecreated ? 'Recreated' : 'Failed'}`);
    logger.info(`Scraper Browser: ${summary.scraperBrowserReset ? 'Reset' : 'Failed'}`);
    logger.info(`Lead Cache: ${summary.leadCacheCleared ? 'Cleared' : 'Failed'}`);
    logger.info(`In-Memory State: ${summary.inMemoryCleared ? 'Cleared' : 'Failed'}`);
    if (summary.errors.length > 0) {
      logger.warn(`Cleanup Errors: ${summary.errors.join(', ')}`);
    }
    logger.info('Cleanup Completed Successfully');
    logger.info('==============================');
  }
}

export const searchCleanup = new SearchCleanupService();
