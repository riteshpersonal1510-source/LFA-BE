import { Router, Request, Response, NextFunction } from 'express';
import { leadController } from '../controllers/lead.controller';
import { searchRequestSchema } from '../validators/search.validator';
import { validate } from '../utils/validations';
import { asyncHandler } from '../utils/error-handler';
import { logger } from '../utils/logger';
import { SearchHistory } from '../models/SearchHistory';
import { Lead } from '../models/Lead';
import { Country } from '../models/Country';
import { APIResponse } from '../utils/api-response';
import { searchStatus } from '../services/search-status.service';
import { searchQueue } from '../services/search-queue.service';
import { DEFAULT_SEARCH_SOURCES } from '../services/scraper.service';
import { SearchState } from '../automation/search-state-machine';
import { buildLocationString } from '../utils/location-query-builder';

const router = Router();

async function createSearchHistoryRecord(data: {
  searchSessionId: string;
  keyword: string;
  state?: string;
  city?: string;
  area?: string;
  country?: string;
  sources: string[];
}): Promise<void> {
  try {
    await SearchHistory.create({
      searchSessionId: data.searchSessionId,
      keyword: data.keyword,
      state: data.state,
      city: data.city,
      area: data.area,
      country: data.country,
      sources: data.sources || [...DEFAULT_SEARCH_SOURCES],
      startedAt: new Date(),
      status: 'QUEUED',
      isRunning: true,
      searchState: SearchState.QUEUED,
      currentFound: 0,
      currentSaved: 0,
      currentDuplicates: 0,
      failedCount: 0,
      progress: 0,
      currentStage: 'QUEUED',
      lastHeartbeat: new Date(),
      lastUpdateTime: new Date(),
      maxProgressReached: 0,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('E11000')) {
      logger.warn({ searchSessionId: data.searchSessionId }, '[search] SearchHistory duplicate key, skipping create');
      return;
    }
    logger.error({ err: msg }, '[search] Failed to create SearchHistory');
    throw err;
  }
}

router.get(
  '/session/active',
  asyncHandler(async (_req: Request, res: Response) => {
    const session = await searchStatus.getActiveSession();
    if (!session) {
      return APIResponse.success(res, null, 'No active session');
    }
    return APIResponse.success(res, searchStatus.toApiResponse(session), 'Active session found');
  })
);

router.get(
  '/active-session',
  asyncHandler(async (_req: Request, res: Response) => {
    const session = await searchStatus.getActiveSession();
    if (!session) {
      return APIResponse.success(res, null, 'No active session');
    }
    return APIResponse.success(res, searchStatus.toApiResponse(session), 'Active session found');
  })
);

router.get(
  '/history/aggregated',
  asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page?.toString() || '1', 10);
    const limit = parseInt(req.query.limit?.toString() || '20', 10);
    const skip = (page - 1) * limit;

    const total = await SearchHistory.countDocuments();
    const records = await SearchHistory.find()
      .sort({ startedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const data = records.map((r, idx) => ({
      srNo: skip + idx + 1,
      searchSessionId: r.searchSessionId,
      keyword: r.keyword,
      state: r.state,
      city: r.city,
      area: r.area,
      sources: r.sources,
      totalLeads: r.totalLeads || r.currentSaved || 0,
      status: r.status,
      searchState: r.searchState,
      startedAt: r.startedAt,
      completedAt: r.completedAt,
      duration: r.duration || 0,
      progress: r.progress,
      currentFound: r.currentFound,
      currentSaved: r.currentSaved,
      currentDuplicates: r.currentDuplicates,
    }));

    return APIResponse.paginated(res, data, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }, 'Search history fetched');
  })
);

router.get(
  '/history/:sessionId',
  asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;

    const inMemory = await searchStatus.getProgressFromDB(sessionId);
    if (inMemory) {
      return APIResponse.success(res, searchStatus.toApiResponse(inMemory), 'Session found');
    }

    const record = await SearchHistory.findOne({ searchSessionId: sessionId }).lean();
    if (!record) {
      return APIResponse.error(res, 'Session not found', undefined, 404);
    }

    const totalLeads = await Lead.countDocuments({ searchSessionId: sessionId });

    return APIResponse.success(res, {
      searchSessionId: record.searchSessionId,
      sessionId: record.searchSessionId,
      keyword: record.keyword,
      searchState: record.searchState || 'IDLE',
      state: record.state,
      city: record.city,
      area: record.area,
      sources: record.sources,
      status: record.status,
      totalLeads,
      totalFound: record.totalFound || record.currentFound || 0,
      uniqueSaved: record.uniqueSaved || record.currentSaved || 0,
      duplicates: record.duplicatesRemoved || record.currentDuplicates || 0,
      currentFound: record.currentFound || 0,
      currentSaved: record.currentSaved || 0,
      currentDuplicates: record.currentDuplicates || 0,
      failedCount: record.failedCount || 0,
      progress: record.progress || 0,
      currentSource: record.currentSource || '',
      currentStage: record.currentStage || '',
      currentBusiness: record.currentBusiness || '',
      currentUrl: record.currentUrl || '',
      eta: record.eta || 0,
      totalProcessed: record.totalProcessed || 0,
      estimatedTotal: record.estimatedTotal || 0,
      sourceBreakdown: record.sourceBreakdown || {},
      logs: record.logs || [],
      startedAt: record.startedAt,
      completedAt: record.completedAt,
      stoppedAt: record.stoppedAt,
      error: record.error || record.failureReason,
      isRunning: record.isRunning,
      lastHeartbeat: record.lastHeartbeat,
    }, 'Session found');
  })
);

router.get(
  '/history',
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    return leadController.getSearchHistory(req, res, next);
  })
);

router.get(
  '/history/:sessionId/location-summary',
  asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;

    const summary = await Lead.aggregate([
      { $match: { searchSessionId: sessionId } },
      {
        $group: {
          _id: {
            state: '$searchedState',
            city: '$searchedCity',
            area: '$searchedArea',
          },
          totalLeads: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          state: { $ifNull: ['$_id.state', 'Unknown'] },
          city: { $ifNull: ['$_id.city', 'Unknown'] },
          area: { $ifNull: ['$_id.area', 'Unknown'] },
          totalLeads: 1,
        },
      },
      { $sort: { state: 1, city: 1, area: 1 } },
    ]);

    return APIResponse.success(res, summary, 'Location summary fetched');
  })
);

router.post(
  '/sessions/:sessionId/stop',
  asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    await searchQueue.stop(sessionId);
    return APIResponse.success(res, { sessionId, status: 'stopped' }, 'Search stopped');
  })
);

router.post(
  '/sessions/:sessionId/resume',
  asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    await searchQueue.resume(sessionId);
    return APIResponse.success(res, { sessionId, status: 'running' }, 'Search resumed');
  })
);

router.delete(
  '/history',
  asyncHandler(async (_req: Request, res: Response) => {
    await SearchHistory.deleteMany({});
    return APIResponse.success(res, null, 'Search history cleared');
  })
);

router.post(
  '/',
  validate(searchRequestSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const scrapeLimit = req.body.limit ?? 0;
    const maxResults = req.body.maxResults ?? 0;
    const { keyword, location, state, city, area, country, sources, businessType } = req.body;

    if (!keyword) {
      return APIResponse.error(res, 'Keyword is required', undefined, 400);
    }

    const sessionId = req.body.sessionId || searchStatus.generateSessionId();

    const locationString = buildLocationString({ area, city, state, country, location });

    if (country && country.trim() && !process.env.NODE_ENV?.includes('prod')) {
      const countryRecord = await Country.findOne({
        $or: [
          { name: { $regex: new RegExp(`^${country.trim()}$`, 'i') } },
          { slug: country.trim().toLowerCase() },
        ]
      }).lean();
      if (!countryRecord) {
        logger.warn({ country }, `[SEARCH] Country "${country}" not in MongoDB — proceeding anyway for global support`);
      }
    }

    logger.info({
      keyword,
      location: locationString,
      sources,
      limit: scrapeLimit,
      sessionId,
    }, '[search] Processing async request');

    const actualSources = Array.isArray(sources) && sources.length > 0 ? sources : [...DEFAULT_SEARCH_SOURCES];
    const exists = await SearchHistory.findOne({ searchSessionId: sessionId }).lean().catch(() => null);
    if (!exists) {
      await createSearchHistoryRecord({
        searchSessionId: sessionId,
        keyword,
        state,
        city,
        area,
        country,
        sources: actualSources,
      });
    }

    searchStatus.createSession(sessionId, {
      keyword,
      location: locationString,
      state,
      city,
      area,
      country,
      sources: actualSources,
    });

    searchStatus.addLog(sessionId, `Search queued for "${keyword}" in ${locationString || 'selected location'}`, 'info');

    await searchQueue.enqueue(sessionId, {
      keyword,
      location: locationString,
      sources: actualSources,
      limit: scrapeLimit,
      state,
      city,
      area,
      country,
      businessType: businessType || keyword,
      sessionId,
      semanticExpansion: req.body.semanticExpansion !== false,
      maxResults: maxResults || undefined,
    });

    return APIResponse.success(res, {
      sessionId,
      searchSessionId: sessionId,
      status: 'QUEUED',
      searchState: SearchState.QUEUED,
      keyword,
      location: locationString,
      state,
      city,
      area,
      country,
      sources: actualSources,
    }, 'Search started', 202);
  })
);

export default router;
