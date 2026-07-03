import {
  emitSearchStart, emitSearchProgress, emitLeadFound, emitSourceUpdate,
  emitSearchCompleted, emitSearchError, emitSearchTimeout, emitSearchGoogleBlocked, emitSearchNoResults, emitSearchRecovered,
  emitLeadSaved, emitDuplicateRemoved, emitSearchHistoryUpdate,
  emitSearchLog, emitSearchStage, emitSearchHeartbeat,
  emitSearchStopped,
} from '../modules/automation-monitor/socket-manager';
import { SearchHistory } from '../models/SearchHistory';
import { Lead } from '../models/Lead';
import { logger } from '../utils/logger';
import {
  SearchState, assertValidTransition, isTerminal,
  searchStateToLegacyStatus, searchStateToFinalStatus,
} from '../automation/search-state-machine';

export interface SearchLogEntry {
  timestamp: string;
  message: string;
  level: 'info' | 'warn' | 'error';
}

export interface SearchStatusData {
  sessionId: string;
  keyword: string;
  location: string;
  state?: string;
  city?: string;
  area?: string;
  country?: string;
  sources: string[];
  searchState: SearchState;
  status: 'running' | 'completed' | 'failed' | 'stopped';
  leadsFound: number;
  uniqueLeads: number;
  duplicatesRemoved: number;
  sourceBreakdown: Record<string, number>;
  keywordBreakdown: Record<string, number>;
  liveLeads: string[];
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: string;
  failedCount: number;
  progressPercentage: number;
  estimatedRemaining: number;
  currentSource: string;
  estimatedTotal: number;
  currentStage: string;
  currentBusiness: string;
  currentUrl: string;
  eta: number;
  totalProcessed: number;
  logs: SearchLogEntry[];
  lastHeartbeat?: string;
  createdBy?: string;
}

const MAX_LOGS = 200;
const THROTTLE_MS = 300;

class SearchStatusTracker {
  private sessions: Map<string, SearchStatusData> = new Map();
  private emitTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private persistTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private pendingUpdates = new Map<string, Record<string, unknown>>();

  private transitionState(sessionId: string, newState: SearchState): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const currentState = session.searchState;
    if (currentState === newState) return;

    assertValidTransition(currentState, newState);

    logger.info({
      sessionId,
      from: currentState,
      to: newState,
    }, `[STATE] Search ${sessionId}\n${currentState} → ${newState}`);

    session.searchState = newState;
    session.status = searchStateToLegacyStatus(newState);
    session.currentStage = newState;
    session.updatedAt = new Date().toISOString();

    emitSearchStage(sessionId, newState);

    if (isTerminal(newState)) {
      session.completedAt = session.completedAt || new Date().toISOString();
      session.progressPercentage = newState === SearchState.COMPLETED ? 100 : session.progressPercentage;
    }
  }

  private async persistSearchState(sessionId: string, updates: Record<string, unknown> = {}): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    try {
      const finalStatus = searchStateToFinalStatus(session.searchState);
      await SearchHistory.updateOne(
        { searchSessionId: sessionId },
        {
          $set: {
            searchState: session.searchState,
            status: finalStatus,
            isRunning: !isTerminal(session.searchState),
            totalFound: session.leadsFound,
            uniqueSaved: session.uniqueLeads,
            duplicates: session.duplicatesRemoved,
            duplicatesRemoved: session.duplicatesRemoved,
            progress: session.progressPercentage,
            currentFound: session.leadsFound,
            currentSaved: session.uniqueLeads,
            currentDuplicates: session.duplicatesRemoved,
            estimatedTotal: session.estimatedTotal,
            currentSource: session.currentSource,
            currentStage: session.currentStage,
            currentBusiness: session.currentBusiness,
            currentUrl: session.currentUrl,
            eta: session.eta,
            totalProcessed: session.totalProcessed,
            failedCount: session.failedCount,
            error: session.error,
            sourceBreakdown: session.sourceBreakdown,
            lastHeartbeat: new Date(),
            lastUpdateTime: new Date(),
            ...updates,
          },
        }
      );
    } catch (err) {
      logger.error({ err: err instanceof Error ? err.message : String(err) }, 'SearchStatusTracker: Failed to persist state');
    }
  }

  private throttledEmit(sessionId: string): void {
    if (this.emitTimers.has(sessionId)) return;
    this.emitTimers.set(sessionId, setTimeout(() => {
      this.emitTimers.delete(sessionId);
      this.emitProgress(sessionId);
    }, THROTTLE_MS));
  }

  private throttledPersist(sessionId: string): void {
    if (this.persistTimers.has(sessionId)) return;
    this.persistTimers.set(sessionId, setTimeout(() => {
      this.persistTimers.delete(sessionId);
      this.persistSearchState(sessionId).catch(() => {});
    }, THROTTLE_MS));
  }

  createSession(sessionId: string, data: Partial<SearchStatusData>): SearchStatusData {
    const existing = this.sessions.get(sessionId);
    if (existing) {
      if (data.keyword) existing.keyword = data.keyword;
      if (data.location) existing.location = data.location;
      return existing;
    }

    const session: SearchStatusData = {
      sessionId,
      keyword: data.keyword || '',
      location: data.location || '',
      state: data.state,
      city: data.city,
      area: data.area,
      country: data.country,
      sources: data.sources || ['google-maps'],
      searchState: SearchState.CREATING_SESSION,
      status: 'running',
      leadsFound: 0,
      uniqueLeads: 0,
      duplicatesRemoved: 0,
      sourceBreakdown: {},
      keywordBreakdown: {},
      liveLeads: [],
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      failedCount: 0,
      progressPercentage: 0,
      estimatedRemaining: 0,
      currentSource: data.sources && data.sources.length > 0 ? data.sources[0] : '',
      estimatedTotal: 0,
      currentStage: 'CREATING_SESSION',
      currentBusiness: '',
      currentUrl: '',
      eta: 0,
      totalProcessed: 0,
      logs: [],
      createdBy: data.createdBy,
    };
    this.sessions.set(sessionId, session);

    emitSearchStart(sessionId, {
      keyword: session.keyword,
      location: session.location,
      state: session.state,
      city: session.city,
      area: session.area,
      sources: session.sources,
    });

    SearchHistory.findOneAndUpdate(
      { searchSessionId: sessionId },
      {
        $setOnInsert: {
          searchSessionId: sessionId,
          keyword: session.keyword,
          state: session.state,
          city: session.city,
          area: session.area,
          sources: session.sources,
          startedAt: new Date(session.startedAt),
          searchState: SearchState.CREATING_SESSION,
          status: 'running',
          isRunning: true,
          progress: 0,
          currentFound: 0,
          currentSaved: 0,
          currentDuplicates: 0,
          failedCount: 0,
          estimatedTotal: 0,
          currentSource: '',
          currentStage: 'CREATING_SESSION',
          createdBy: session.createdBy || undefined,
        },
      },
      { upsert: true }
    ).catch(err => {
      logger.error({ err: err instanceof Error ? err.message : String(err) }, 'SearchStatusTracker: Failed to upsert search history');
    });

    this.transitionState(sessionId, SearchState.QUEUED);
    this.persistSearchState(sessionId).catch(() => {});

    return session;
  }

  restoreFromDB(record: {
    searchSessionId: string;
    keyword?: string;
    state?: string;
    city?: string;
    area?: string;
    sources?: string[];
    status?: string;
    searchState?: string;
    currentFound?: number;
    totalFound?: number;
    currentSaved?: number;
    uniqueSaved?: number;
    currentDuplicates?: number;
    duplicatesRemoved?: number;
    failedCount?: number;
    progress?: number;
    currentSource?: string;
    currentStage?: string;
    currentBusiness?: string;
    currentUrl?: string;
    eta?: number;
    totalProcessed?: number;
    estimatedTotal?: number;
    sourceBreakdown?: Record<string, number>;
    startedAt?: Date;
    lastHeartbeat?: Date;
    logs?: Array<{ timestamp?: Date; message: string; level: 'info' | 'warn' | 'error' }>;
  }): SearchStatusData {
    const existing = this.sessions.get(record.searchSessionId);
    if (existing) return existing;

    const restoredState = Object.values(SearchState).includes(record.searchState as SearchState)
      ? (record.searchState as SearchState)
      : SearchState.QUEUED;

    const session: SearchStatusData = {
      sessionId: record.searchSessionId,
      keyword: record.keyword || '',
      location: [record.area, record.city, record.state].filter(Boolean).join(', '),
      state: record.state,
      city: record.city,
      area: record.area,
      sources: record.sources || [],
      searchState: restoredState,
      status: (record.status as SearchStatusData['status']) || 'running',
      leadsFound: record.currentFound || record.totalFound || 0,
      uniqueLeads: record.currentSaved || record.uniqueSaved || 0,
      duplicatesRemoved: record.currentDuplicates || record.duplicatesRemoved || 0,
      sourceBreakdown: record.sourceBreakdown || {},
      keywordBreakdown: {},
      liveLeads: [],
      startedAt: record.startedAt?.toISOString() || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      failedCount: record.failedCount || 0,
      progressPercentage: record.progress || 0,
      estimatedRemaining: 0,
      currentSource: record.currentSource || '',
      estimatedTotal: record.estimatedTotal || 0,
      currentStage: record.currentStage || '',
      currentBusiness: record.currentBusiness || '',
      currentUrl: record.currentUrl || '',
      eta: record.eta || 0,
      totalProcessed: record.totalProcessed || 0,
      logs: (record.logs || []).map(l => ({
        timestamp: l.timestamp?.toISOString() || new Date().toISOString(),
        message: l.message,
        level: l.level,
      })),
      lastHeartbeat: record.lastHeartbeat?.toISOString(),
    };
    this.sessions.set(session.sessionId, session);
    return session;
  }

  addLog(sessionId: string, message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const session = this.sessions.get(sessionId);
    const entry: SearchLogEntry = {
      timestamp: new Date().toISOString(),
      message,
      level,
    };
    if (session) {
      session.logs.push(entry);
      if (session.logs.length > MAX_LOGS) {
        session.logs = session.logs.slice(-MAX_LOGS);
      }
      session.updatedAt = new Date().toISOString();
    }
    emitSearchLog(sessionId, entry);
    SearchHistory.updateOne(
      { searchSessionId: sessionId },
      {
        $push: { logs: { $each: [entry], $slice: -MAX_LOGS } },
        $set: { lastHeartbeat: new Date() },
      }
    ).catch(() => {});
  }

  updateStage(sessionId: string, stage: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.currentStage = stage;
      session.updatedAt = new Date().toISOString();
    }
    emitSearchStage(sessionId, stage);
    SearchHistory.updateOne(
      { searchSessionId: sessionId },
      { $set: { currentStage: stage, lastHeartbeat: new Date() } }
    ).catch(() => {});
    this.emitProgress(sessionId);
  }

  setState(sessionId: string, newState: SearchState): void {
    this.transitionState(sessionId, newState);
    this.emitProgress(sessionId);
    this.persistSearchState(sessionId).catch(() => {});
  }

  updateCurrentBusiness(sessionId: string, business: string, url?: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.currentBusiness = business;
      if (url) session.currentUrl = url;
      session.updatedAt = new Date().toISOString();
    }
    SearchHistory.updateOne(
      { searchSessionId: sessionId },
      { $set: { currentBusiness: business, currentUrl: url || '', lastHeartbeat: new Date() } }
    ).catch(() => {});
    this.emitProgress(sessionId);
  }

  heartbeat(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    const now = new Date().toISOString();
    if (session) {
      session.lastHeartbeat = now;
      session.updatedAt = now;
    }
    emitSearchHeartbeat(sessionId, { timestamp: now });
    SearchHistory.updateOne(
      { searchSessionId: sessionId },
      { $set: { lastHeartbeat: new Date() } }
    ).catch(() => {});
  }

  incrementFound(sessionId: string, count = 1): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.leadsFound += count;
      session.updatedAt = new Date().toISOString();
      this.recalculatePercentage(session);
      this.throttledEmit(sessionId);
      this.throttledPersist(sessionId);
    }
  }

  incrementSaved(sessionId: string, count = 1): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.uniqueLeads += count;
      session.totalProcessed = session.uniqueLeads + session.duplicatesRemoved + session.failedCount;
      session.updatedAt = new Date().toISOString();
      this.recalculatePercentage(session);
      emitLeadSaved(sessionId, { totalSaved: session.uniqueLeads });
      this.throttledEmit(sessionId);
      this.throttledPersist(sessionId);
    }
  }

  incrementDuplicates(sessionId: string, count = 1): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.duplicatesRemoved += count;
      session.totalProcessed = session.uniqueLeads + session.duplicatesRemoved + session.failedCount;
      session.updatedAt = new Date().toISOString();
      this.recalculatePercentage(session);
      emitDuplicateRemoved(sessionId, { totalDuplicates: session.duplicatesRemoved });
      this.throttledEmit(sessionId);
      this.throttledPersist(sessionId);
    }
  }

  incrementFailed(sessionId: string, count = 1): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.failedCount += count;
      session.totalProcessed = session.uniqueLeads + session.duplicatesRemoved + session.failedCount;
      session.updatedAt = new Date().toISOString();
      this.recalculatePercentage(session);
      this.throttledEmit(sessionId);
      this.throttledPersist(sessionId);
    }
  }

  updateLeadsFound(sessionId: string, count: number): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.leadsFound = count;
      session.updatedAt = new Date().toISOString();
      this.recalculatePercentage(session);
      this.emitProgress(sessionId);
      this.persistSearchState(sessionId).catch(() => {});
    }
  }

  updateEstimatedTotal(sessionId: string, total: number): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.estimatedTotal = total;
      this.recalculatePercentage(session);
      this.persistSearchState(sessionId).catch(() => {});
    }
  }

  updateCurrentSource(sessionId: string, source: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.currentSource = source;
      session.updatedAt = new Date().toISOString();
      this.emitProgress(sessionId);
      this.persistSearchState(sessionId).catch(() => {});
    }
  }

  private recalculatePercentage(session: SearchStatusData): void {
    if (session.leadsFound === 0) {
      session.progressPercentage = session.estimatedTotal > 0
        ? Math.min(10, Math.round((session.totalProcessed / session.estimatedTotal) * 100))
        : 0;
      session.estimatedRemaining = session.estimatedTotal;
      session.eta = 0;
    } else {
      const processed = session.uniqueLeads + session.duplicatesRemoved + session.failedCount;
      session.totalProcessed = processed;
      session.progressPercentage = Math.min(99, Math.round((processed / session.leadsFound) * 100));
      session.estimatedRemaining = Math.max(0, session.leadsFound - processed);

      const elapsedMs = Date.now() - new Date(session.startedAt).getTime();
      if (processed > 0) {
        const avgPerLead = elapsedMs / processed;
        session.eta = Math.round((session.estimatedRemaining * avgPerLead) / 1000);
      }
    }
  }

  private emitProgress(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    emitSearchProgress(sessionId, {
      foundCount: session.leadsFound,
      savedCount: session.uniqueLeads,
      duplicateCount: session.duplicatesRemoved,
      failedCount: session.failedCount,
      progress: session.progressPercentage,
      currentSource: session.currentSource,
      currentLead: session.currentBusiness || session.liveLeads[session.liveLeads.length - 1] || '',
      currentStage: session.searchState,
      currentUrl: session.currentUrl,
      eta: session.eta,
      totalProcessed: session.totalProcessed,
      updatedAt: new Date().toISOString(),
    });
  }

  updateUniqueLeads(sessionId: string, count: number): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.uniqueLeads = count;
      session.updatedAt = new Date().toISOString();
      this.recalculatePercentage(session);
      this.persistSearchState(sessionId).catch(() => {});
    }
  }

  updateDuplicatesRemoved(sessionId: string, count: number): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.duplicatesRemoved = count;
      session.updatedAt = new Date().toISOString();
      this.recalculatePercentage(session);
      this.persistSearchState(sessionId).catch(() => {});
    }
  }

  updateSourceBreakdown(sessionId: string, source: string, count: number): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.sourceBreakdown[source] = count;
      session.updatedAt = new Date().toISOString();
      emitSourceUpdate(sessionId, { source, count, status: 'completed' });
      this.emitProgress(sessionId);
      this.persistSearchState(sessionId).catch(() => {});
    }
  }

  updateKeywordBreakdown(sessionId: string, keyword: string, count: number): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.keywordBreakdown[keyword] = count;
      session.updatedAt = new Date().toISOString();
    }
  }

  addLiveLead(sessionId: string, businessName: string, source = ''): void {
    const session = this.sessions.get(sessionId);
    if (session && !session.liveLeads.includes(businessName)) {
      session.liveLeads.push(businessName);
      if (session.liveLeads.length > 50) {
        session.liveLeads = session.liveLeads.slice(-50);
      }
      session.updatedAt = new Date().toISOString();
      emitLeadFound(sessionId, {
        businessName,
        source,
        totalLeads: session.leadsFound,
      });
    }
  }

  async markCompleted(
    sessionId: string,
    completedSources: string[] = [],
    failedSources: string[] = []
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    this.clearThrottleTimers(sessionId);

    this.transitionState(sessionId, SearchState.SAVING_LEADS);
    this.transitionState(sessionId, SearchState.COMPLETED);

    session.progressPercentage = 100;
    session.estimatedRemaining = 0;
    session.eta = 0;
    session.completedAt = new Date().toISOString();
    session.updatedAt = new Date().toISOString();

    this.addLog(sessionId, 'Search completed successfully', 'info');
    this.emitProgress(sessionId);

    const totalLeads = await Lead.countDocuments({ searchSessionId: sessionId });
    const durationMs = Date.now() - new Date(session.startedAt).getTime();

    emitSearchCompleted(sessionId, {
      keyword: session.keyword,
      location: session.location,
      totalLeads: session.leadsFound,
      uniqueLeads: session.uniqueLeads,
      duplicatesRemoved: session.duplicatesRemoved,
      failedCount: session.failedCount,
      sourceBreakdown: { ...session.sourceBreakdown },
      durationMs,
      state: session.state,
      city: session.city,
      area: session.area,
      sources: session.sources,
      status: 'completed',
      progress: 100,
      finishedAt: session.completedAt,
    });

    await this.persistSearchState(sessionId, {
      completedAt: new Date(session.completedAt),
      duration: durationMs,
      completedSources,
      failedSources,
      totalLeads,
      status: 'COMPLETED',
      businessesFound: session.leadsFound,
      businessesSaved: session.uniqueLeads,
      duplicates: session.duplicatesRemoved,
      maxProgressReached: 100,
    });

    await this.emitHistoryUpdate(session);
  }

  private classifyError(error: string): 'PLAYWRIGHT_CRASH' | 'GOOGLE_BLOCKED' | 'BROWSER_CLOSED' | 'NETWORK_TIMEOUT' | 'USER_STOPPED' | 'BACKEND_CRASH' | 'SOCKET_DISCONNECT' | 'NO_RESULTS_FOUND' | 'AUTH_EXPIRED' | 'UNKNOWN' {
    const msg = error.toLowerCase();
    if (msg.includes('playwright') || msg.includes('browser') || msg.includes('target page')) return 'PLAYWRIGHT_CRASH';
    if (msg.includes('blocked') || msg.includes('captcha') || msg.includes('sign_in') || msg.includes('sign in') || msg.includes('consent') || msg.includes('unusual traffic') || msg.includes('rate_limit')) return 'GOOGLE_BLOCKED';
    if (msg.includes('closed') || msg.includes('disconnected')) return 'BROWSER_CLOSED';
    if (msg.includes('timeout') || msg.includes('timed out')) return 'NETWORK_TIMEOUT';
    if (msg.includes('user stopped') || msg.includes('stopped by user')) return 'USER_STOPPED';
    if (msg.includes('crash') || msg.includes('exception') || msg.includes('backend')) return 'BACKEND_CRASH';
    if (msg.includes('socket') || msg.includes('ws')) return 'SOCKET_DISCONNECT';
    if (msg.includes('no results') || msg.includes('not found')) return 'NO_RESULTS_FOUND';
    if (msg.includes('auth') || msg.includes('unauthorized') || msg.includes('401')) return 'AUTH_EXPIRED';
    return 'UNKNOWN';
  }

  async captureErrorMetadata(
    sessionId: string,
    error: string,
    stack?: string,
    browserError?: string,
    googleMapsError?: string,
    playwrightError?: string,
    networkError?: string
  ): Promise<void> {
    try {
      // Background workers do not have an active HTTP request context.
      // Trying to access require('express').request properties here causes TypeErrors.
      const userAgent = 'background-worker';
      const ipAddress = 'internal';

      await SearchHistory.updateOne(
        { searchSessionId: sessionId },
        {
          $set: {
            errorMetadata: {
              errorName: error?.split(':')[0] || 'Error',
              errorMessage: error || 'Unknown error',
              errorStack: stack ? stack.substring(0, 2000) : undefined,
              browserError: browserError?.substring(0, 500),
              googleMapsError: googleMapsError?.substring(0, 500),
              playwrightError: playwrightError?.substring(0, 500),
              networkError: networkError?.substring(0, 500),
              userAgent,
              ipAddress,
              browserType: userAgent?.includes('Chrome') ? 'Chrome' : userAgent?.includes('Firefox') ? 'Firefox' : 'Unknown',
              deviceType: userAgent?.includes('Mobile') ? 'Mobile' : 'Desktop',
            },
            lastUpdateTime: new Date(),
          },
        }
      );
    } catch (err) {
      logger.error({ err }, 'Failed to capture error metadata');
    }
  }

  async markFailed(sessionId: string, error: string, failedSources: string[] = [], errorStack?: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (isTerminal(session.searchState)) return;

    this.clearThrottleTimers(sessionId);

    this.transitionState(sessionId, SearchState.FAILED);

    session.error = error;
    session.completedAt = new Date().toISOString();
    session.updatedAt = new Date().toISOString();

    this.addLog(sessionId, `Search failed: ${error}`, 'error');

    emitSearchError(sessionId, { error });

    const failureClassification = this.classifyError(error);
    const durationMs = Date.now() - new Date(session.startedAt).getTime();

    await this.captureErrorMetadata(sessionId, error, errorStack);

    await this.persistSearchState(sessionId, {
      completedAt: new Date(session.completedAt),
      duration: durationMs,
      failedSources,
      failureReason: error,
      failureClassification,
      status: 'FAILED',
      maxProgressReached: Math.max(session.progressPercentage || 0, session.progressPercentage || 0),
    });

    await this.emitHistoryUpdate(session);
  }

  async markTimeout(sessionId: string, error: string, failedSources: string[] = [], errorStack?: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (isTerminal(session.searchState)) return;

    this.clearThrottleTimers(sessionId);

    this.transitionState(sessionId, SearchState.TIMEOUT);

    session.error = error;
    session.completedAt = new Date().toISOString();
    session.updatedAt = new Date().toISOString();

    this.addLog(sessionId, `Search timed out: ${error}`, 'error');

    emitSearchTimeout(sessionId, { error });

    const durationMs = Date.now() - new Date(session.startedAt).getTime();

    await this.captureErrorMetadata(sessionId, error, errorStack, undefined, undefined, undefined, 'Network timeout');

    await this.persistSearchState(sessionId, {
      completedAt: new Date(session.completedAt),
      duration: durationMs,
      failedSources,
      failureReason: error,
      failureClassification: 'NETWORK_TIMEOUT',
      status: 'TIMEOUT',
      maxProgressReached: Math.max(session.progressPercentage || 0, session.progressPercentage || 0),
    });

    await this.emitHistoryUpdate(session);
  }

  async markGoogleBlocked(sessionId: string, error: string, failedSources: string[] = [], errorStack?: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (isTerminal(session.searchState)) return;

    this.clearThrottleTimers(sessionId);

    this.transitionState(sessionId, SearchState.GOOGLE_BLOCKED);

    session.error = error;
    session.completedAt = new Date().toISOString();
    session.updatedAt = new Date().toISOString();

    this.addLog(sessionId, `Search blocked by Google: ${error}`, 'error');

    emitSearchGoogleBlocked(sessionId, { error });

    const durationMs = Date.now() - new Date(session.startedAt).getTime();

    await this.captureErrorMetadata(sessionId, error, errorStack, undefined, 'Google Maps blocked request', undefined);

    await this.persistSearchState(sessionId, {
      completedAt: new Date(session.completedAt),
      duration: durationMs,
      failedSources,
      failureReason: error,
      failureClassification: 'GOOGLE_BLOCKED',
      status: 'FAILED',
      maxProgressReached: Math.max(session.progressPercentage || 0, session.progressPercentage || 0),
    });

    await this.emitHistoryUpdate(session);
  }

  async markNoResults(sessionId: string, message: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (isTerminal(session.searchState)) return;

    this.clearThrottleTimers(sessionId);

    this.transitionState(sessionId, SearchState.NO_RESULTS);

    session.completedAt = new Date().toISOString();
    session.updatedAt = new Date().toISOString();

    this.addLog(sessionId, `No results: ${message}`, 'warn');

    emitSearchNoResults(sessionId, { message });

    const durationMs = Date.now() - new Date(session.startedAt).getTime();

    await this.persistSearchState(sessionId, {
      completedAt: new Date(session.completedAt),
      duration: durationMs,
      failureReason: message,
      failureClassification: 'NO_RESULTS_FOUND',
      status: 'NO_RESULTS',
      businessesFound: 0,
      businessesSaved: 0,
    });

    await this.emitHistoryUpdate(session);
  }

  async markStopped(sessionId: string): Promise<void> {
    let session = this.sessions.get(sessionId);

    if (!session) {
      const record = await SearchHistory.findOne({ searchSessionId: sessionId }).lean();
      if (!record) return;
      session = this.restoreFromDB(record);
    }

    if (isTerminal(session.searchState)) return;

    session.searchState = SearchState.STOPPED;
    session.status = 'stopped';
    session.currentStage = SearchState.STOPPED;
    session.completedAt = new Date().toISOString();
    session.updatedAt = new Date().toISOString();

    this.addLog(sessionId, 'Search stopped by user', 'warn');

    emitSearchStopped(sessionId);

    const durationMs = Date.now() - new Date(session.startedAt).getTime();

    try {
      await SearchHistory.updateOne(
        { searchSessionId: sessionId },
        {
          $set: {
            searchState: SearchState.STOPPED,
            status: 'STOPPED',
            isRunning: false,
            currentStage: SearchState.STOPPED,
            completedAt: new Date(session.completedAt),
            stoppedAt: new Date(),
            duration: durationMs,
            lastHeartbeat: new Date(),
            lastUpdateTime: new Date(),
            maxProgressReached: session.progressPercentage || 0,
            businessesFound: session.leadsFound || 0,
            businessesSaved: session.uniqueLeads || 0,
            duplicates: session.duplicatesRemoved || 0,
            failureClassification: 'USER_STOPPED',
            failureReason: 'Search stopped by user',
          },
        }
      );
    } catch (err) {
      logger.error({ err: err instanceof Error ? err.message : String(err), sessionId }, 'markStopped: Failed to persist');
    }

    this.emitHistoryUpdate(session).catch(() => {});
  }

  private async emitHistoryUpdate(session: SearchStatusData): Promise<void> {
    try {
      const totalLeads = await Lead.countDocuments({ searchSessionId: session.sessionId });
      const dbRecord = await SearchHistory.findOne({ searchSessionId: session.sessionId })
        .select('failureReason failureClassification errorMetadata duration businessesFound businessesSaved duplicates maxProgressReached status')
        .lean();

      const durationMs = session.completedAt
        ? new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()
        : 0;

      emitSearchHistoryUpdate(session.sessionId, {
        keyword: session.keyword,
        state: session.state,
        city: session.city,
        area: session.area,
        country: session.country,
        sources: session.sources,
        totalLeads,
        businessesFound: dbRecord?.businessesFound ?? session.leadsFound,
        businessesSaved: dbRecord?.businessesSaved ?? session.uniqueLeads,
        duplicates: dbRecord?.duplicates ?? session.duplicatesRemoved,
        progress: session.progressPercentage,
        maxProgressReached: dbRecord?.maxProgressReached ?? session.progressPercentage,
        startedAt: session.startedAt,
        completedAt: session.completedAt || new Date().toISOString(),
        duration: Math.round(durationMs / 1000),
        status: searchStateToFinalStatus(session.searchState),
        failureReason: dbRecord?.failureReason || session.error || '',
        failureClassification: dbRecord?.failureClassification,
        searchSessionId: session.sessionId,
      });
    } catch {
    }
  }

  getProgress(sessionId: string): SearchStatusData | null {
    return this.sessions.get(sessionId) || null;
  }

  async getProgressFromDB(sessionId: string): Promise<SearchStatusData | null> {
    const inMemory = this.sessions.get(sessionId);
    if (inMemory) return inMemory;

    const record = await SearchHistory.findOne({ searchSessionId: sessionId }).lean();
    if (!record) return null;

    return this.restoreFromDB(record);
  }

  toApiResponse(session: SearchStatusData): Record<string, unknown> {
    return {
      sessionId: session.sessionId,
      searchSessionId: session.sessionId,
      keyword: session.keyword,
      location: session.location,
      state: session.state,
      city: session.city,
      area: session.area,
      sources: session.sources,
      searchState: session.searchState,
      status: session.status,
      leadsFound: session.leadsFound,
      uniqueLeads: session.uniqueLeads,
      duplicatesRemoved: session.duplicatesRemoved,
      foundCount: session.leadsFound,
      savedCount: session.uniqueLeads,
      duplicateCount: session.duplicatesRemoved,
      failedCount: session.failedCount,
      progress: session.progressPercentage,
      progressPercentage: session.progressPercentage,
      currentSource: session.currentSource,
      currentLead: session.currentBusiness,
      currentStage: session.currentStage,
      searchStage: session.searchState,
      currentBusiness: session.currentBusiness,
      currentUrl: session.currentUrl,
      eta: session.eta,
      totalProcessed: session.totalProcessed,
      estimatedTotal: session.estimatedTotal,
      estimatedRemaining: session.estimatedRemaining,
      sourceBreakdown: session.sourceBreakdown,
      keywordBreakdown: session.keywordBreakdown,
      liveLeads: session.liveLeads,
      logs: session.logs,
      startedAt: session.startedAt,
      updatedAt: session.updatedAt,
      completedAt: session.completedAt,
      error: session.error,
      lastHeartbeat: session.lastHeartbeat,
    };
  }

  async getActiveSession(): Promise<SearchStatusData | null> {
    const active = await SearchHistory.findOne(
      { status: 'running', isRunning: true },
      {},
      { sort: { startedAt: -1 } }
    ).lean();

    if (!active) return null;

    const session = this.sessions.get(active.searchSessionId);
    if (session) return session;

    const restored = this.restoreFromDB(active);

    emitSearchRecovered(restored.sessionId, {
      keyword: restored.keyword,
      location: restored.location,
      state: restored.state,
      city: restored.city,
      area: restored.area,
      sources: restored.sources,
      leadsFound: restored.leadsFound,
      uniqueLeads: restored.uniqueLeads,
      duplicatesRemoved: restored.duplicatesRemoved,
      failedCount: restored.failedCount,
      progressPercentage: restored.progressPercentage,
      elapsedMs: Date.now() - new Date(restored.startedAt).getTime(),
    });

    return restored;
  }

  private clearThrottleTimers(sessionId: string): void {
    const t1 = this.emitTimers.get(sessionId);
    if (t1) { clearTimeout(t1); this.emitTimers.delete(sessionId); }
    const t2 = this.persistTimers.get(sessionId);
    if (t2) { clearTimeout(t2); this.persistTimers.delete(sessionId); }
    this.pendingUpdates.delete(sessionId);
  }

  cleanupOldSessions(maxAgeMs = 3600000): void {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - new Date(session.startedAt).getTime() > maxAgeMs) {
        this.clearThrottleTimers(id);
        this.sessions.delete(id);
      }
    }
  }

  cleanupAll(): void {
    for (const id of this.sessions.keys()) {
      this.clearThrottleTimers(id);
    }
    this.sessions.clear();
  }

  generateSessionId(): string {
    return `search_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
}

export const searchStatus = new SearchStatusTracker();
