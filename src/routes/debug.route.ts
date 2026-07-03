import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { SearchHistory } from '../models/SearchHistory';
import { Lead } from '../models/Lead';
import { SearchAnalytics } from '../models/SearchAnalytics';
import { searchStatus } from '../services/search-status.service';
import { searchQueue } from '../services/search-queue.service';
import { browserManager } from '../core/scraper-engine/browser-manager';
import { browserPool } from '../services/browser-pool.service';
import { perfMonitor } from '../utils/perf-monitor';
import { scraperEngine } from '../core/scraper-engine/scraper-engine';
import { logger } from '../utils/logger';
import { APIResponse } from '../utils/api-response';
import jwt from 'jsonwebtoken';

const router = Router();

router.get('/network', (_req: Request, res: Response) => {
  const ngrokUrl = (global as any).__ngrokUrl || process.env.NGROK_URL || '';
  const socketStatus = (global as any).__io ? 'initialized' : 'not_initialized';

  res.status(200).json({
    success: true,
    data: {
      backend: 'running',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      port: process.env.PORT || 5000,
      ngrokUrl,
      currentOrigin: _req.headers.origin || null,
      currentHost: _req.headers.host || null,
      forwardedHost: _req.headers['x-forwarded-host'] || null,
      forwardedProto: _req.headers['x-forwarded-proto'] || null,
      ip: _req.ip || _req.socket.remoteAddress || null,
      frontendUrl: process.env.FRONTEND_URL || null,
      netlifyUrl: process.env.NETLIFY_URL || null,
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      socket: socketStatus,
      nodeVersion: process.version,
      platform: process.platform,
      timestamp: new Date().toISOString(),
    },
  });
});

router.get('/auth', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const hasAuth = !!authHeader;
  const authPrefix = authHeader ? authHeader.substring(0, 25) : 'none';
  const cookies = req.cookies || {};
  const hasCookie = !!cookies.accessToken;

  let tokenPayload: Record<string, unknown> | null = null;
  let tokenError: string | null = null;
  let tokenExpiresAt: string | null = null;

  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : cookies.accessToken || null;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-do-not-use') as Record<string, unknown>;
      tokenPayload = {
        userId: decoded.userId,
        role: decoded.role,
        iat: decoded.iat,
        exp: decoded.exp,
      };
      if (decoded.exp) {
        tokenExpiresAt = new Date((decoded.exp as number) * 1000).toISOString();
      }
    } catch (err: unknown) {
      tokenError = err instanceof Error ? err.message : String(err);
    }
  }

  res.status(200).json({
    success: true,
    data: {
      authenticated: hasAuth || hasCookie,
      method: hasAuth ? 'bearer' : hasCookie ? 'cookie' : 'none',
      hasAuthHeader: hasAuth,
      authPrefix,
      hasCookie,
      token: token ? {
        present: true,
        prefix: `${token.substring(0, 15)}...${token.substring(token.length - 5)}`,
        length: token.length,
        decoded: tokenPayload,
        error: tokenError,
        expiresAt: tokenExpiresAt,
      } : { present: false },
      jwtSecretConfigured: !!process.env.JWT_SECRET,
      jwtSecretLength: (process.env.JWT_SECRET || '').length,
    },
  });
});

router.get('/request', (req: Request, res: Response) => {
  const headers: Record<string, string> = {};
  const sensitiveHeaders = ['authorization', 'cookie', 'set-cookie'];
  for (const [key, value] of Object.entries(req.headers)) {
    if (sensitiveHeaders.includes(key.toLowerCase())) {
      headers[key] = `[present: ${value ? String(value).length : 0} chars]`;
    } else {
      headers[key] = String(value || '');
    }
  }

  res.status(200).json({
    success: true,
    data: {
      method: req.method,
      path: req.path,
      originalUrl: req.originalUrl,
      baseUrl: req.baseUrl,
      ip: req.ip,
      ips: req.ips,
      hostname: req.hostname,
      protocol: req.protocol,
      secure: req.secure,
      subdomains: req.subdomains,
      headers,
      cookies: req.cookies || {},
      query: req.query,
      params: req.params,
      body: req.body ? { keys: Object.keys(req.body), contentType: typeof req.body } : null,
      trusted: req.app.get('trust proxy'),
      env: process.env.NODE_ENV,
      ngrokUrl: (global as any).__ngrokUrl || null,
    },
  });
});

router.get('/playwright', async (_req: Request, res: Response) => {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');

  const result: Record<string, unknown> = {
    installed: false,
    executablePath: null,
    executableExists: false,
    launchSuccess: false,
    playwrightVersion: null,
    browserVersion: null,
    browserRevision: null,
    cacheLocation: null,
    cacheExists: false,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    cwd: process.cwd(),
    homeDir: os.homedir(),
    env: {
      PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH || '(not set)',
      HOME: process.env.HOME || '(not set)',
      NODE_ENV: process.env.NODE_ENV || '(not set)',
    },
    filesystem: {} as Record<string, unknown>,
  };

  const prevDiag = (global as any).__playwrightDiagnostic;

  try {
    const pw = require('playwright');
    const pkg = JSON.parse(fs.readFileSync(
      require.resolve('playwright/package.json'), 'utf-8'
    ));
    result.installed = true;
    result.playwrightVersion = pkg.version;

    const browserPath = pw.chromium.executablePath();
    result.executablePath = browserPath;
    result.executableExists = fs.existsSync(browserPath);

    const execDir = path.dirname(browserPath);
    const chromiumDir = path.basename(path.dirname(execDir));
    result.browserRevision = chromiumDir;

    const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH;
    if (browsersPath === '0') {
      const pwCoreDir = path.dirname(require.resolve('playwright-core/package.json'));
      result.cacheLocation = path.join(pwCoreDir, '.local-browsers');
    } else if (browsersPath) {
      result.cacheLocation = browsersPath;
    } else {
      result.cacheLocation = path.join(os.homedir(), '.cache', 'ms-playwright');
    }
    result.cacheExists = fs.existsSync(result.cacheLocation);

    result.filesystem = {
      cwdContents: fs.readdirSync(process.cwd()).slice(0, 30),
      executableDirExists: fs.existsSync(path.dirname(browserPath)),
      executableDirContents: fs.existsSync(path.dirname(browserPath))
        ? fs.readdirSync(path.dirname(browserPath)).slice(0, 20)
        : [],
      cacheDirContents: result.cacheExists
        ? fs.readdirSync(result.cacheLocation).slice(0, 20)
        : [],
    };

    logger.info({
      executablePath: browserPath,
      executableExists: result.executableExists,
      cwd: process.cwd(),
      browsersPath: process.env.PLAYWRIGHT_BROWSERS_PATH || '(not set)',
    }, '[DEBUG] Playwright diagnostics collected');

    try {
      const browser = await pw.chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer',
        ],
        timeout: 30000,
      });
      result.launchSuccess = true;
      result.browserVersion = await browser.version().catch(() => 'unknown');
      await browser.close();
    } catch (launchErr: unknown) {
      const msg = launchErr instanceof Error ? launchErr.message : String(launchErr);
      result.launchSuccess = false;
      result.launchError = msg;
      logger.error({
        err: msg,
        executablePath: browserPath,
        executableExists: result.executableExists,
        cacheLocation: result.cacheLocation,
        cacheExists: result.cacheExists,
        cwd: process.cwd(),
        envPlaywrightPath: process.env.PLAYWRIGHT_BROWSERS_PATH || '(not set)',
      }, '[DEBUG] Playwright launch attempt failed');
    }
  } catch (importErr: unknown) {
    const msg = importErr instanceof Error ? importErr.message : String(importErr);
    result.installed = false;
    result.error = msg;
  }

  result.startupDiagnostic = prevDiag || null;

  return APIResponse.success(res, result, 'Playwright diagnostic');
});

router.get('/browsers', async (_req: Request, res: Response) => {
  const status = browserManager.getStatus();
  return APIResponse.success(res, status, 'Browser pool status');
});

router.get('/search/:sessionId', async (req: Request, res: Response) => {
  const { sessionId } = req.params;

  const inMemory = searchStatus.getProgress(sessionId);
  const dbRecord = await SearchHistory.findOne({ searchSessionId: sessionId }).lean();
  const leadCount = await Lead.countDocuments({ searchSessionId: sessionId });
  const sampleLeads = await Lead.find({ searchSessionId: sessionId }).limit(3).lean();

  const isQueued = searchQueue.isRunning(sessionId);

  const timeline: Array<{ state: string; timestamp: string }> = [];
  if (inMemory) {
    timeline.push({
      state: inMemory.searchState,
      timestamp: inMemory.updatedAt,
    });
  }
  if (dbRecord?.logs) {
    for (const log of (dbRecord.logs as Array<{ timestamp?: Date; message: string; level: string }>)) {
      timeline.push({
        state: log.message,
        timestamp: log.timestamp?.toISOString() || '',
      });
    }
  }

  return APIResponse.success(res, {
    sessionId,
    inMemory: inMemory ? {
      searchState: inMemory.searchState,
      status: inMemory.status,
      leadsFound: inMemory.leadsFound,
      uniqueLeads: inMemory.uniqueLeads,
      duplicatesRemoved: inMemory.duplicatesRemoved,
      failedCount: inMemory.failedCount,
      currentSource: inMemory.currentSource,
      currentStage: inMemory.currentStage,
      startedAt: inMemory.startedAt,
      updatedAt: inMemory.updatedAt,
      completedAt: inMemory.completedAt,
      error: inMemory.error,
    } : null,
    dbRecord: dbRecord ? {
      searchState: dbRecord.searchState,
      status: dbRecord.status,
      isRunning: dbRecord.isRunning,
      currentFound: dbRecord.currentFound,
      currentSaved: dbRecord.currentSaved,
      currentDuplicates: dbRecord.currentDuplicates,
      failedCount: dbRecord.failedCount,
      progress: dbRecord.progress,
      error: dbRecord.error,
      failureReason: dbRecord.failureReason,
      startedAt: dbRecord.startedAt,
      completedAt: dbRecord.completedAt,
      duration: dbRecord.duration,
    } : null,
    leadCount,
    sampleLeads: sampleLeads.map(l => ({
      companyName: l.companyName,
      phone: l.phone,
      website: l.website,
      source: l.source,
    })),
    queueActive: isQueued,
    browserPoolStatus: browserManager.getStatus(),
  }, 'Search diagnostic');
});

router.get('/health', async (_req: Request, res: Response) => {
  const mongoState = mongoose.connection.readyState;
  const mongoStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const queueSize = (searchQueue as any).queue?.length || 0;
  const activeSessions = (searchQueue as any).activeSessions?.size || 0;

  const browserStatus = browserManager.getStatus();
  const poolStatus = browserPool.getStatus();

  const allHealthy = mongoState === 1 && activeSessions >= 0;

  return APIResponse.success(res, {
    status: allHealthy ? 'healthy' : 'degraded',
    mongodb: {
      state: mongoStates[mongoState] || 'unknown',
      ready: mongoState === 1,
    },
    searchQueue: {
      pendingJobs: queueSize,
      activeSessions,
      lockedSessions: (searchQueue as any).sessionLocks?.size || 0,
      running: activeSessions > 0,
    },
    browserManager: browserStatus,
    browserPool: poolStatus,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  }, 'System health');
});

router.get('/search', async (_req: Request, res: Response) => {
  const sessions = (searchStatus as any).sessions;
  const inMemorySessions: Record<string, unknown>[] = [];
  if (sessions) {
    for (const [id, session] of sessions) {
      inMemorySessions.push({
        sessionId: id,
        searchState: (session as any).searchState,
        status: (session as any).status,
        leadsFound: (session as any).leadsFound,
        uniqueLeads: (session as any).uniqueLeads,
        duplicatesRemoved: (session as any).duplicatesRemoved,
      });
    }
  }

  const recentDB = await SearchHistory.find()
    .sort({ startedAt: -1 })
    .limit(10)
    .lean()
    .catch(() => []);

  return APIResponse.success(res, {
    inMemory: {
      count: inMemorySessions.length,
      sessions: inMemorySessions,
    },
    db: {
      recentCount: recentDB.length,
      recent: recentDB.map(r => ({
        searchSessionId: r.searchSessionId,
        keyword: r.keyword,
        status: r.status,
        searchState: r.searchState,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        progress: r.progress,
        currentSaved: r.currentSaved,
      })),
    },
    historyCount: await SearchHistory.countDocuments().catch(() => -1),
    analyticsCount: await SearchAnalytics.countDocuments().catch(() => -1),
  }, 'Search system status');
});

router.get('/queue', async (_req: Request, res: Response) => {
  const queue = (searchQueue as any);
  const status = (searchStatus as any);

  return APIResponse.success(res, {
    queue: {
      pendingJobs: queue?.queue?.length || 0,
      activeSessionsCount: queue?.activeSessions?.size || 0,
      stopRequestedCount: queue?.stopRequested?.size || 0,
      lockedSessionsCount: queue?.sessionLocks?.size || 0,
      abortControllersCount: queue?.abortControllers?.size || 0,
    },
    state: {
      inMemorySessionsCount: status?.sessions?.size || 0,
      emitTimersCount: status?.emitTimers?.size || 0,
      persistTimersCount: status?.persistTimers?.size || 0,
    },
    browser: scraperEngine.getBrowserStatus(),
    pool: browserPool.getStatus(),
  }, 'Queue status');
});

router.get('/perf', async (_req: Request, res: Response) => {
  const stats = perfMonitor.getAllStats();
  const recentEntries = perfMonitor.getRecent(20);
  return APIResponse.success(res, { stats, recentEntries }, 'Performance stats');
});

export default router;
