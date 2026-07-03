import { scraperEngine } from './scraper-engine';
import { browserManager } from './browser-manager';
import { logger } from '../../utils/logger';
import { AreaJobModel, AreaSessionModel } from '../../automation/area-automation.model';
import type { IAreaJobDocument } from '../../automation/area-automation.model';
import type { AreaAutomationSourceResult } from '../../automation/area-automation.types';
import { monitorEngine } from '../../modules/automation-monitor/monitor-engine';
import { semanticSearchService } from '../../services/semantic-search.service';
import { SearchHistory } from '../../models/SearchHistory';

const DEFAULT_MAX_RETRIES = 2;
const JOB_TIMEOUT_MS = 45 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 5000;
const STALE_SESSION_MS = 5 * 60 * 1000;

export class AreaQueueCancelledError extends Error {
  constructor(message = 'Automation cancelled') {
    super(message);
    this.name = 'AreaQueueCancelledError';
  }
}

type StopMode = 'none' | 'pause';

interface ActiveJobContext {
  jobId: string;
  abortController: AbortController;
}

export class AreaQueue {
  private processingSessions: Set<string> = new Set();
  private activeJobBySession: Map<string, ActiveJobContext> = new Map();
  private stopModeBySession: Map<string, StopMode> = new Map();
  private heartbeatTimers: Map<string, ReturnType<typeof setInterval>> = new Map();

  async enqueueJobs(sessionId: string, jobs: Array<{
    businessType: string;
    state: string;
    city: string;
    area?: string;
    country?: string;
    sources: string[];
  }>): Promise<void> {
    const docs = jobs.map((job, index) => ({
      sessionId,
      businessType: job.businessType,
      state: job.state,
      city: job.city,
      area: job.area || '',
      country: job.country,
      sources: job.sources,
      status: 'pending' as const,
      progress: '',
      currentStage: '',
      totalLeads: 0,
      savedLeads: 0,
      duplicates: 0,
      rejected: 0,
      attempts: 0,
      sourceResults: [],
      startedAt: null,
      completedAt: null,
      failedReason: null,
      queuePosition: index + 1,
      totalJobs: jobs.length,
    }));

    await AreaJobModel.insertMany(docs);
    monitorEngine.onAutomationLog(sessionId, `${jobs.length} jobs generated`, 'info');
    logger.info({ sessionId, count: jobs.length }, 'AreaQueue: Jobs enqueued');
  }

  async startProcessing(sessionId: string): Promise<void> {
    if (this.processingSessions.has(sessionId)) {
      logger.warn({ sessionId }, 'AreaQueue: Session already processing');
      return;
    }

    const session = await AreaSessionModel.findById(sessionId).lean();
    if (!session) {
      logger.warn({ sessionId }, 'AreaQueue: Session not found');
      return;
    }

    if (session.status !== 'running') {
      await AreaSessionModel.findByIdAndUpdate(sessionId, {
        $set: { status: 'running', lastHeartbeat: new Date() },
      });
    }

    this.processingSessions.add(sessionId);
    this.stopModeBySession.set(sessionId, 'none');
    this.startHeartbeat(sessionId);

    monitorEngine.onAutomationStarted(sessionId);
    logger.info({ sessionId }, 'AreaQueue: Started processing');

    try {
      while (this.stopModeBySession.get(sessionId) === 'none') {
        const nextJob = await AreaJobModel.findOneAndUpdate(
          { sessionId, status: 'pending' },
          {
            $set: {
              status: 'running',
              startedAt: new Date(),
              progress: 'Starting...',
              currentStage: 'starting',
            },
            $inc: { attempts: 1 },
          },
          { sort: { queuePosition: 1 }, new: true }
        );

        if (!nextJob) {
          logger.info({ sessionId }, 'AreaQueue: No more pending jobs');
          break;
        }

        const jobContext: ActiveJobContext = {
          jobId: nextJob._id.toString(),
          abortController: new AbortController(),
        };
        this.activeJobBySession.set(sessionId, jobContext);

        await AreaSessionModel.updateOne(
          { _id: sessionId },
          {
            $inc: { runningJobs: 1 },
            $set: {
              currentJobId: nextJob._id.toString(),
              currentStage: 'starting',
              lastHeartbeat: new Date(),
            },
          }
        );

        logger.info({
          sessionId,
          jobId: nextJob._id,
          businessType: nextJob.businessType,
          area: nextJob.area,
          city: nextJob.city,
          queuePosition: nextJob.queuePosition,
          totalJobs: nextJob.totalJobs,
        }, 'AreaQueue: Processing job');

        await this.createSearchHistoryEntry(nextJob, session);

        monitorEngine.onJobStarted({
          _id: nextJob._id.toString(),
          sessionId: nextJob.sessionId,
          businessType: nextJob.businessType,
          state: nextJob.state,
          city: nextJob.city,
          area: nextJob.area,
          sources: nextJob.sources,
          queuePosition: nextJob.queuePosition,
          totalJobs: nextJob.totalJobs,
        });

        const sessionConfig = await AreaSessionModel.findById(sessionId).lean();
        const maxRetries = sessionConfig?.retryEnabled === false ? 0 : DEFAULT_MAX_RETRIES;
        let lastError: string | null = null;
        let success = false;
        let cancelled = false;

        for (let attempt = 0; attempt <= maxRetries && !success && !cancelled; attempt++) {
          if (this.stopModeBySession.get(sessionId) !== 'none') {
            cancelled = true;
            break;
          }

          if (attempt > 0) {
            logger.info({
              sessionId,
              jobId: nextJob._id,
              attempt,
              businessType: nextJob.businessType,
              area: nextJob.area,
            }, 'AreaQueue: Retrying job');
            monitorEngine.onAutomationLog(
              sessionId,
              `Retrying ${nextJob.city} / ${nextJob.area} (attempt ${attempt + 1})`,
              'warn'
            );
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          }

          try {
            await this.processJob(nextJob, sessionConfig, () => this.stopModeBySession.get(sessionId) !== 'none');
            success = true;
          } catch (error) {
            if (error instanceof AreaQueueCancelledError) {
              cancelled = true;
              break;
            }
            lastError = error instanceof Error ? error.message : 'Unknown error';
            logger.warn({
              err: lastError,
              sessionId,
              jobId: nextJob._id,
              attempt,
              businessType: nextJob.businessType,
              area: nextJob.area,
            }, 'AreaQueue: Attempt failed');
          }
        }

        if (cancelled) {
          await this.resetRunningJobToPending(nextJob._id.toString(), sessionId);
          break;
        }

        if (success) {
          if (this.stopModeBySession.get(sessionId) !== 'none') {
            await this.resetRunningJobToPending(nextJob._id.toString(), sessionId);
            break;
          }

          await AreaJobModel.findByIdAndUpdate(nextJob._id, {
            $set: {
              status: 'completed',
              completedAt: new Date(),
              currentStage: 'completed',
            },
          });
          await AreaSessionModel.updateOne(
            { _id: sessionId },
            { $inc: { completedJobs: 1, runningJobs: -1 } }
          );

          await this.updateSearchHistoryOnComplete(nextJob._id.toString());

          const jobDoc = await AreaJobModel.findById(nextJob._id).lean();
          monitorEngine.onJobCompleted({
            _id: nextJob._id.toString(),
            sessionId,
            area: nextJob.area,
            city: nextJob.city,
            businessType: nextJob.businessType,
            sources: nextJob.sources,
            totalLeads: jobDoc?.totalLeads || 0,
            sourceResults: (jobDoc?.sourceResults || []).map(sr => ({
              source: sr.source,
              totalStored: sr.totalStored,
            })),
          });
        } else {
          await AreaJobModel.findByIdAndUpdate(nextJob._id, {
            $set: {
              status: 'failed',
              completedAt: new Date(),
              progress: `Failed: ${lastError || 'Unknown error'}`,
              failedReason: lastError || 'Unknown error',
              currentStage: 'failed',
            },
          });
          await AreaSessionModel.updateOne(
            { _id: sessionId },
            { $inc: { failedJobs: 1, runningJobs: -1 } }
          );

          await this.updateSearchHistoryOnFailed(nextJob._id.toString(), lastError || 'Unknown error');

          monitorEngine.onJobFailed({
            _id: nextJob._id.toString(),
            sessionId,
            area: nextJob.area,
            city: nextJob.city,
            businessType: nextJob.businessType,
            error: lastError || 'Unknown error',
          });

          logger.error({
            err: lastError,
            sessionId,
            jobId: nextJob._id,
            businessType: nextJob.businessType,
            area: nextJob.area,
          }, 'AreaQueue: Job failed after retries');
        }

        this.activeJobBySession.delete(sessionId);
        await this.syncSessionCounters(sessionId);
        await monitorEngine.emitSessionProgress(sessionId);
      }

      const stopMode = this.stopModeBySession.get(sessionId);
      if (stopMode === 'pause') {
        await this.finalizePausedSession(sessionId);
      } else if (stopMode === 'none') {
        await this.finalizeCompletedSession(sessionId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Queue processing error';
      logger.error({ err: message, sessionId }, 'AreaQueue: Processing error');
      await AreaSessionModel.findByIdAndUpdate(sessionId, {
        $set: { status: 'failed', completedAt: new Date(), lastHeartbeat: new Date() },
      });
      monitorEngine.onSessionFailed(sessionId, message);
    } finally {
      this.stopHeartbeat(sessionId);
      this.processingSessions.delete(sessionId);
      this.activeJobBySession.delete(sessionId);
      this.stopModeBySession.delete(sessionId);
      logger.info({ sessionId }, 'AreaQueue: Processing finished');
    }
  }

  private async processJob(
    job: IAreaJobDocument,
    session: {
      maxLeads?: number;
      retryEnabled?: boolean;
      dedupEnabled?: boolean;
    } | null,
    isCancelled: () => boolean
  ): Promise<void> {
    const { sessionId, businessType, state, city, country, sources } = job;
    const area = job.area || '';
    const locationStr = [city, state, country].filter(Boolean).join(', ');
    const jobId = job._id.toString();
    const maxLeads = session?.maxLeads !== undefined && session.maxLeads > 0 ? session.maxLeads : 0;

    if (isCancelled()) {
      throw new AreaQueueCancelledError();
    }

    logger.info({
      action: 'area_scrape_started',
      sessionId,
      businessType,
      city,
    }, 'AreaQueue: Job started');

    await AreaJobModel.findByIdAndUpdate(job._id, {
      $set: {
        progress: `Scraping ${businessType} in ${city}...`,
        currentStage: 'launching-browser',
      },
    });

    monitorEngine.onJobProgress({
      _id: jobId,
      sessionId,
      area: area || undefined,
      city: job.city,
      progress: `Starting ${city}...`,
      currentStage: 'launching-browser',
    });

    const expanded = semanticSearchService.expandWithAIFallback(businessType, sources, state, city, area);
    const expandedKeywords = expanded.expandedKeywords.map(ek => ek.keyword);
    const semanticKeywordValue = expandedKeywords.length > 1 ? expandedKeywords.join(', ') : undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Job timed out after ${JOB_TIMEOUT_MS / 60000} minutes`)), JOB_TIMEOUT_MS);
    });

    const scrapePromise = scraperEngine.scrapeMultiSource({
      keyword: businessType,
      location: locationStr,
      sources,
      limit: maxLeads > 0 ? maxLeads : Number.MAX_SAFE_INTEGER,
      state,
      city,
      area: area || undefined,
      country,
      businessType,
      sessionId,
      skipSearchTracking: true,
      semanticExpansion: expandedKeywords.length > 1,
      semanticKeyword: semanticKeywordValue,
      automationSessionId: sessionId,
      automationJobId: jobId,
      dedupEnabled: session?.dedupEnabled !== false,
      isCancelled,
      onStageChange: async (stage: string, message: string) => {
        if (isCancelled()) return;
        await AreaJobModel.findByIdAndUpdate(job._id, {
          $set: { currentStage: stage, progress: message },
        });
        await AreaSessionModel.updateOne(
          { _id: sessionId },
          { $set: { currentStage: stage, lastHeartbeat: new Date() } }
        );
        monitorEngine.onJobProgress({
          _id: jobId,
          sessionId,
          area: area || undefined,
          city: job.city,
          progress: message,
          currentStage: stage,
        });
      },
      onLeadSaved: async (saved: number, duplicates: number, rejected: number) => {
        await AreaJobModel.findByIdAndUpdate(job._id, {
          $inc: {
            savedLeads: saved,
            duplicates,
            rejected,
            totalLeads: saved,
          },
        });
        await AreaSessionModel.updateOne(
          { _id: sessionId },
          {
            $inc: {
              savedLeads: saved,
              duplicates,
              rejected,
              totalLeads: saved,
            },
            $set: { lastHeartbeat: new Date() },
          }
        );
        await monitorEngine.emitSessionProgress(sessionId);
      },
    });

    const result = await Promise.race([scrapePromise, timeoutPromise]);

    if (isCancelled()) {
      throw new AreaQueueCancelledError();
    }

    const sourceResults: AreaAutomationSourceResult[] = [];
    let totalStored = 0;

    for (const sr of result.sourceResults) {
      sourceResults.push({
        source: sr.source,
        totalStored: sr.totalStored,
        totalExtracted: sr.totalExtracted,
        totalDuplicates: sr.totalDuplicates,
        success: sr.success,
      });
      totalStored += sr.totalStored;
    }

    const allSourcesFailed = result.sourceResults.length > 0 && result.sourceResults.every(sr => !sr.success);
    if (!result.success && totalStored === 0 && allSourcesFailed) {
      throw new Error(result.message || 'All sources failed');
    }

    await AreaJobModel.findByIdAndUpdate(job._id, {
      $set: {
        totalLeads: totalStored,
        sourceResults,
        progress: `Completed - ${totalStored} leads from ${sources.length} source(s)`,
        currentStage: 'completed',
      },
    });

    monitorEngine.onJobProgress({
      _id: jobId,
      sessionId,
      area: area || undefined,
      city: job.city,
      progress: `Completed - ${totalStored} leads from ${sources.length} source(s)`,
      totalLeads: totalStored,
      sourceResults: sourceResults.map(sr => ({
        source: sr.source,
        totalStored: sr.totalStored,
      })),
    });

    logger.info({
      action: 'area_scrape_completed',
      sessionId,
      businessType,
      city,
      totalStored,
      sources: sources.length,
    }, 'AreaQueue: Job processing done');
  }

  async pauseProcessing(sessionId: string): Promise<void> {
    this.stopModeBySession.set(sessionId, 'pause');
    await this.abortActiveJob(sessionId);
    logger.info({ sessionId }, 'AreaQueue: Pause requested');
  }

  async stopProcessing(sessionId?: string): Promise<void> {
    if (sessionId) {
      this.stopModeBySession.set(sessionId, 'pause');
      await this.abortActiveJob(sessionId);
      logger.info({ sessionId }, 'AreaQueue: Stop requested');
      return;
    }

    const sessionIds = Array.from(this.processingSessions);
    for (const sid of sessionIds) {
      this.stopModeBySession.set(sid, 'pause');
      await this.abortActiveJob(sid);
    }
    logger.info('AreaQueue: Stop requested for all sessions');
  }

  private async abortActiveJob(sessionId: string): Promise<void> {
    const active = this.activeJobBySession.get(sessionId);
    if (active) {
      active.abortController.abort();
    }
    await browserManager.releaseAllActive().catch(() => undefined);
  }

  private async resetRunningJobToPending(jobId: string, sessionId: string): Promise<void> {
    await AreaJobModel.findByIdAndUpdate(jobId, {
      $set: {
        status: 'pending',
        progress: 'Paused - will resume',
        currentStage: 'paused',
        startedAt: null,
      },
    });
    await AreaSessionModel.updateOne(
      { _id: sessionId },
      {
        $inc: { runningJobs: -1 },
        $set: {
          currentJobId: null,
          currentStage: 'paused',
          lastHeartbeat: new Date(),
        },
      }
    );
  }

  private async finalizePausedSession(sessionId: string): Promise<void> {
    await AreaSessionModel.findByIdAndUpdate(sessionId, {
      $set: {
        status: 'paused',
        pausedAt: new Date(),
        runningJobs: 0,
        currentJobId: null,
        currentStage: 'paused',
        lastHeartbeat: new Date(),
      },
    });
    await this.syncSessionCounters(sessionId);
    monitorEngine.onSessionStopped(sessionId);
    logger.info({ sessionId }, 'AreaQueue: Automation paused');
  }

  private async finalizeCompletedSession(sessionId: string): Promise<void> {
    await this.syncSessionCounters(sessionId);

    const [completedJobs, failedJobs, pendingJobs, runningJobs] = await Promise.all([
      AreaJobModel.countDocuments({ sessionId, status: 'completed' }),
      AreaJobModel.countDocuments({ sessionId, status: 'failed' }),
      AreaJobModel.countDocuments({ sessionId, status: 'pending' }),
      AreaJobModel.countDocuments({ sessionId, status: 'running' }),
    ]);

    if (pendingJobs > 0 || runningJobs > 0) {
      return;
    }

    const status = failedJobs > 0 && completedJobs === 0 ? 'failed' : 'completed';

    await AreaSessionModel.findByIdAndUpdate(sessionId, {
      $set: {
        status,
        completedAt: new Date(),
        runningJobs: 0,
        currentJobId: null,
        currentStage: status,
        lastHeartbeat: new Date(),
      },
    });

    if (status === 'failed') {
      monitorEngine.onSessionFailed(sessionId, 'All jobs failed');
    } else {
      monitorEngine.onSessionCompleted(sessionId);
    }

    logger.info({ sessionId, status, completedJobs, failedJobs }, 'AreaQueue: Session finalized');
  }

  async syncSessionCounters(sessionId: string): Promise<void> {
    const [completedJobs, failedJobs, runningJobs, skippedJobs, pendingJobs, leadAgg] = await Promise.all([
      AreaJobModel.countDocuments({ sessionId, status: 'completed' }),
      AreaJobModel.countDocuments({ sessionId, status: 'failed' }),
      AreaJobModel.countDocuments({ sessionId, status: 'running' }),
      AreaJobModel.countDocuments({ sessionId, status: 'skipped' }),
      AreaJobModel.countDocuments({ sessionId, status: 'pending' }),
      AreaJobModel.aggregate([
        { $match: { sessionId, status: 'completed' } },
        {
          $group: {
            _id: null,
            totalLeads: { $sum: '$totalLeads' },
            savedLeads: { $sum: '$savedLeads' },
            duplicates: { $sum: '$duplicates' },
            rejected: { $sum: '$rejected' },
          },
        },
      ]),
    ]);

    const totals = leadAgg[0] || { totalLeads: 0, savedLeads: 0, duplicates: 0, rejected: 0 };

    await AreaSessionModel.findByIdAndUpdate(sessionId, {
      $set: {
        completedJobs,
        failedJobs,
        runningJobs,
        skippedJobs,
        totalLeads: totals.totalLeads || 0,
        savedLeads: totals.savedLeads || 0,
        duplicates: totals.duplicates || 0,
        rejected: totals.rejected || 0,
        lastHeartbeat: new Date(),
      },
    });

    logger.debug({
      sessionId,
      completedJobs,
      failedJobs,
      runningJobs,
      skippedJobs,
      pendingJobs,
    }, 'AreaQueue: Session counters synced');
  }

  async recoverStuckSessions(): Promise<void> {
    const runningSessions = await AreaSessionModel.find({ status: 'running' }).lean();

    for (const session of runningSessions) {
      const sessionId = session._id;

      if (this.processingSessions.has(sessionId)) {
        continue;
      }

      const staleHeartbeat = session.lastHeartbeat || session.startedAt;
      const ageMs = staleHeartbeat ? Date.now() - new Date(staleHeartbeat).getTime() : STALE_SESSION_MS + 1;

      await AreaJobModel.updateMany(
        { sessionId, status: 'running' },
        {
          $set: {
            status: 'pending',
            progress: 'Recovered after restart',
            currentStage: 'pending',
            startedAt: null,
          },
        }
      );

      await AreaSessionModel.findByIdAndUpdate(sessionId, {
        $set: {
          runningJobs: 0,
          currentJobId: null,
          currentStage: 'recovering',
          lastHeartbeat: new Date(),
        },
      });

      if (ageMs > STALE_SESSION_MS) {
        const pendingCount = await AreaJobModel.countDocuments({ sessionId, status: 'pending' });
        if (pendingCount === 0) {
          await this.syncSessionCounters(sessionId);
          await this.finalizeCompletedSession(sessionId);
          continue;
        }
      }

      monitorEngine.onAutomationLog(sessionId, 'Session recovered after server restart', 'info');

      setImmediate(() => {
        this.startProcessing(sessionId).catch((err) => {
          logger.error({
            err: err instanceof Error ? err.message : String(err),
            sessionId,
          }, 'AreaQueue: Recovery processing failed');
        });
      });
    }
  }

  private async createSearchHistoryEntry(job: IAreaJobDocument, _session: Record<string, unknown> | null): Promise<void> {
    const searchSessionId = `${job.sessionId}_${job._id.toString()}`;
    try {
      const existing = await SearchHistory.findOne({ searchSessionId });
      if (existing) return;
      await SearchHistory.create({
        searchSessionId,
        keyword: job.businessType,
        state: job.state,
        city: job.city,
        country: job.country,
        sources: job.sources,
        status: 'RUNNING',
        startedAt: new Date(),
        isRunning: true,
        searchState: 'SCRAPING',
        estimatedTotal: job.totalJobs,
        totalLeads: 0,
        businessesFound: 0,
        businessesSaved: 0,
        duplicates: 0,
        rejected: 0,
        duration: 0,
        progress: 0,
        currentStage: 'starting',
        currentSource: job.sources[0] || 'google-maps',
        sourceBreakdown: {},
        logs: [{
          timestamp: new Date(),
          message: `Started scraping ${job.businessType} in ${job.city}, ${job.state}`,
          level: 'info',
        }],
      });
    } catch (err) {
      logger.warn({ err: err instanceof Error ? err.message : String(err), searchSessionId }, 'AreaQueue: Failed to create SearchHistory');
    }
  }

  private async updateSearchHistoryOnComplete(jobId: string): Promise<void> {
    try {
      const jobDoc = await AreaJobModel.findById(jobId).lean();
      if (!jobDoc) return;
      const searchSessionId = `${jobDoc.sessionId}_${jobId}`;
      const totalFound = jobDoc.totalLeads + jobDoc.duplicates + jobDoc.rejected;
      await SearchHistory.updateOne(
        { searchSessionId },
        {
          $set: {
            status: 'COMPLETED',
            completedAt: new Date(),
            isRunning: false,
            searchState: 'COMPLETED',
            totalLeads: jobDoc.totalLeads || 0,
            businessesFound: totalFound,
            businessesSaved: jobDoc.savedLeads || 0,
            duplicates: jobDoc.duplicates || 0,
            rejected: jobDoc.rejected || 0,
            progress: 100,
            duration: jobDoc.startedAt ? Date.now() - new Date(jobDoc.startedAt).getTime() : 0,
          },
          $push: {
            logs: {
              timestamp: new Date(),
              message: `Completed: ${jobDoc.totalLeads} leads saved`,
              level: 'info',
            },
          },
        }
      );
    } catch (err) {
      logger.warn({ err: err instanceof Error ? err.message : String(err), jobId }, 'AreaQueue: Failed to update SearchHistory on complete');
    }
  }

  private async updateSearchHistoryOnFailed(jobId: string, reason: string): Promise<void> {
    try {
      const jobDoc = await AreaJobModel.findById(jobId).lean();
      if (!jobDoc) return;
      const searchSessionId = `${jobDoc.sessionId}_${jobId}`;
      await SearchHistory.updateOne(
        { searchSessionId },
        {
          $set: {
            status: 'FAILED',
            completedAt: new Date(),
            isRunning: false,
            searchState: 'FAILED',
            failureReason: reason,
            failureClassification: 'UNKNOWN',
            progress: 0,
            error: reason,
            duration: jobDoc.startedAt ? Date.now() - new Date(jobDoc.startedAt).getTime() : 0,
          },
          $push: {
            logs: {
              timestamp: new Date(),
              message: `Failed: ${reason}`,
              level: 'error',
            },
          },
        }
      );
    } catch (err) {
      logger.warn({ err: err instanceof Error ? err.message : String(err), jobId }, 'AreaQueue: Failed to update SearchHistory on failed');
    }
  }

  private startHeartbeat(sessionId: string): void {
    this.stopHeartbeat(sessionId);
    const timer = setInterval(async () => {
      try {
        await AreaSessionModel.updateOne(
          { _id: sessionId },
          { $set: { lastHeartbeat: new Date() } }
        );
      } catch {
        // non-blocking
      }
    }, HEARTBEAT_INTERVAL_MS);
    this.heartbeatTimers.set(sessionId, timer);
  }

  private stopHeartbeat(sessionId: string): void {
    const timer = this.heartbeatTimers.get(sessionId);
    if (timer) {
      clearInterval(timer);
      this.heartbeatTimers.delete(sessionId);
    }
  }

  isProcessing(sessionId?: string): boolean {
    if (sessionId) return this.processingSessions.has(sessionId);
    return this.processingSessions.size > 0;
  }

  getActiveJobId(sessionId: string): string | null {
    return this.activeJobBySession.get(sessionId)?.jobId || null;
  }

  async getStatus(): Promise<{
    sessionsProcessing: number;
    sessions: Array<{ sessionId: string; activeJobId: string | null }>;
  }> {
    const sessions = Array.from(this.processingSessions).map(sessionId => ({
      sessionId,
      activeJobId: this.activeJobBySession.get(sessionId)?.jobId || null,
    }));
    return { sessionsProcessing: this.processingSessions.size, sessions };
  }
}

export const areaQueue = new AreaQueue();
