import 'express-async-errors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { connectDB, disconnectDB } from './config/database';
import { logger } from './utils/logger';
import { createServer } from 'http';
import { errorMiddleware } from './middlewares/error.middleware';
import { notFoundMiddleware } from './middlewares/not-found.middleware';
import { validationErrorHandler } from './middlewares/validation.middleware';
import { requestTimeout } from './middlewares/timeout.middleware';
import routes from './routes/index';
import { cronScheduler } from './schedulers/cron.scheduler';
import { authService } from './services/auth.service';
import { initSocketManager, getSocketIO } from './modules/automation-monitor/socket-manager';
import { join } from 'path';
import { aiProcessingQueue } from './services/ai-processing-queue.service';
import { backgroundEnrichmentWorker } from './multi-source';
import { recoveryOrchestrator } from './recovery/recovery-orchestrator';
import { pythonScraperService } from './services/python-scraper.service';
import { buildBackendHealthPayload } from './utils/health';

let isShuttingDown = false;
let crashCount = 0;

dotenv.config();

process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || '0';

function recordCrash(type: string, error: unknown): void {
  crashCount++;
  const now = new Date().toISOString();
  const mem = process.memoryUsage();
  const crashRecord = {
    type,
    timestamp: now,
    crashCount,
    uptime: process.uptime(),
    memory: {
      rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(mem.external / 1024 / 1024)}MB`,
    },
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    env: process.env.NODE_ENV || 'development',
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 10).join('\n'),
    } : String(error),
  };

  try {
    const fs = require('fs') as typeof import('fs');
    const crashLogPath = require('path').join(process.cwd(), '.crash-record');
    fs.writeFileSync(crashLogPath, JSON.stringify(crashRecord, null, 2), 'utf-8');
  } catch {
    // crash record file write is best-effort
  }

  logger.error(crashRecord, `[CRASH #${crashCount}] ${type}: ${error instanceof Error ? error.message : String(error)}`);
}

process.on('unhandledRejection', (reason: unknown) => {
  recordCrash('Unhandled Rejection', reason);
});

process.on('uncaughtException', (error: Error) => {
  recordCrash('Uncaught Exception', error);
  logger.info({}, '[CRASH] Attempting graceful recovery — server will continue running');
});

const app = express();

// ----------------------------------------------------------------
// 1. PROXY TRUST — MUST be first for ngrok forwarded headers
// ----------------------------------------------------------------
app.set('trust proxy', true);

// ----------------------------------------------------------------
// 2. GLOBAL DIAGNOSTICS STORAGE
// ----------------------------------------------------------------
const globalDiagnostics: Record<string, unknown> = {};
(global as any).__diagnostics = globalDiagnostics;

// ----------------------------------------------------------------
// 3. SINGLE GLOBAL CORS MIDDLEWARE (before everything else)
// ----------------------------------------------------------------
function isNgrokDomain(origin: string): boolean {
  return (
    origin.endsWith('.ngrok-free.app') ||
    origin.endsWith('.ngrok-free.dev') ||
    origin.endsWith('.ngrok.io') ||
    origin.includes('ngrok')
  );
}

function isNetlifyDomain(origin: string): boolean {
  return origin.endsWith('.netlify.app');
}

function isLocalhost(origin: string): boolean {
  return (
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    origin.includes('[::1]')
  );
}

const corsOptions: cors.CorsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) {
      return callback(null, true);
    }

    if (
      !isNetlifyDomain(origin) &&
      !isNgrokDomain(origin) &&
      !isLocalhost(origin)
    ) {
      logger.warn({ origin }, `[CORS] Unknown origin (ALLOWED): ${origin}`);
    }

    callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'ngrok-skip-browser-warning',
    'X-Requested-With',
    'X-CSRF-Token',
    'Cache-Control',
    'Pragma',
  ],
  exposedHeaders: [
    'Authorization',
    'X-Request-Id',
    'Content-Disposition',
  ],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400,
};

app.use(cors(corsOptions));

// ----------------------------------------------------------------
// 4. HELMET (after CORS, with safe defaults for cross-origin)
// ----------------------------------------------------------------
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'unsafe-none' },
}));

// ----------------------------------------------------------------
// 5. PARSERS
// ----------------------------------------------------------------
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ----------------------------------------------------------------
// 6. REQUEST DIAGNOSTICS & LOGGING
// ----------------------------------------------------------------
morgan.token('origin', (req: Request) => req.headers.origin || '-');
morgan.token('forwarded-for', (req: Request) => (req.headers['x-forwarded-for'] as string) || '-');
morgan.token('real-ip', (req: Request) => req.ip || '-');
const morganFormat = '[:date[iso]] ":method :url" :status :res[content-length] :response-time ms origin=:origin ip=:real-ip forwarded=:forwarded-for';
app.use(morgan(morganFormat));

function detectNgrokFromHeaders(req: Request): string | null {
  const host = req.headers['x-forwarded-host'] as string || req.headers.host as string || '';
  const proto = req.headers['x-forwarded-proto'] as string || 'https';

  if (host && (host.includes('ngrok') || host.includes('ngrok-free'))) {
    const url = `${proto}://${host}`;
    return url;
  }
  return null;
}

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  const ngrokFromHeaders = detectNgrokFromHeaders(req);
  if (ngrokFromHeaders) {
    const current = (global as any).__ngrokUrl;
    if (current !== ngrokFromHeaders) {
      (global as any).__ngrokUrl = ngrokFromHeaders;
      logger.info({ ngrokUrl: ngrokFromHeaders }, '[NGROK] URL updated from incoming request');
    }
  }

  res.on('finish', () => {
    const duration = Date.now() - start;

    const authHeader = req.headers.authorization;
    const hasAuth = !!authHeader;
    const authPrefix = authHeader ? authHeader.substring(0, 20) : 'none';

    const diag = {
      origin: req.headers.origin || '-',
      host: req.headers.host || '-',
      'x-forwarded-host': req.headers['x-forwarded-host'] || '-',
      'x-forwarded-proto': req.headers['x-forwarded-proto'] || '-',
      ip: req.ip || req.socket.remoteAddress || '-',
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      hasAuth,
      authPrefix: authPrefix === 'none' ? 'none' : `${authPrefix}...`,
      userAgent: (req.headers['user-agent'] || '-').substring(0, 80),
    };

    if (res.statusCode >= 400) {
      logger.warn(diag, `[REQUEST] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    } else {
      logger.info(diag, `[REQUEST] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

const PORT = process.env.PORT || 5000;

// ----------------------------------------------------------------
// 7. STATIC FILES
// ----------------------------------------------------------------
const FRONTEND_BUILD_PATH = process.env.FRONTEND_BUILD_PATH || join(__dirname, '../../frontend/out');
if (process.env.NODE_ENV === 'production' && process.env.SERVE_FRONTEND !== 'false') {
  app.use(express.static(FRONTEND_BUILD_PATH));
  logger.info({ path: FRONTEND_BUILD_PATH, env: process.env.NODE_ENV }, 'Serving frontend static build');
}

app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

// ----------------------------------------------------------------
// 8. PERF MONITORING FOR /api/v1
// ----------------------------------------------------------------
app.use('/api/v1', (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const originalEnd = res.end.bind(res);
  res.end = function (this: Response, ...args: any[]) {
    const duration = Date.now() - start;
    if (duration > 1000) {
      logger.warn({ method: req.method, url: req.originalUrl, duration, status: res.statusCode }, `[PERF] Slow request: ${req.method} ${req.originalUrl} took ${duration}ms`);
    }
    return originalEnd(...args);
  } as any;
  next();
});

app.use('/api/v1', (req: Request, res: Response, next: NextFunction) => {
  const isLongRunning =
    req.method === 'POST' && (req.path === '/search' || req.path.endsWith('/search'));
  if (isLongRunning) {
    return next();
  }
  return requestTimeout(29000)(req, res, next);
}, routes);

// ----------------------------------------------------------------
// 9. PUBLIC ENDPOINTS (no auth required)
// ----------------------------------------------------------------
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Lead Finder API',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (_req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState;
  let dbStatus = 'disconnected';
  if (dbState === 1) dbStatus = 'connected';
  else if (dbState === 2) dbStatus = 'connecting';
  else if (dbState === 3) dbStatus = 'disconnecting';

  const pwDiag = (global as any).__playwrightDiagnostic;
  const playwrightStatus = pwDiag?.executableExists ? 'available' : 'unavailable';
  const socketStatus = getSocketIO() ? 'initialized' : 'not_initialized';

  res.status(200).json(buildBackendHealthPayload({
    databaseStatus: dbStatus,
    socketStatus,
    playwrightStatus,
    uptime: process.uptime(),
    port: Number(PORT),
    environment: process.env.NODE_ENV || 'development',
    pythonScraperUrl: process.env.PYTHON_SCRAPER_URL || 'http://localhost:8001',
    version: process.env.APP_VERSION || '1.0.0',
  }));
});

app.get('/api/health', (_req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState;
  let dbStatus = 'disconnected';
  if (dbState === 1) dbStatus = 'connected';
  else if (dbState === 2) dbStatus = 'connecting';
  else if (dbState === 3) dbStatus = 'disconnecting';

  const pwDiag = (global as any).__playwrightDiagnostic;
  const playwrightStatus = pwDiag?.executableExists ? 'available' : 'unavailable';
  const socketStatus = getSocketIO() ? 'initialized' : 'not_initialized';

  const ngrokUrl = (global as any).__ngrokUrl || process.env.NGROK_URL || '';
  const pythonScraperUrl = process.env.PYTHON_SCRAPER_URL || 'http://localhost:8001';

  res.status(200).json({
    ...buildBackendHealthPayload({
      databaseStatus: dbStatus,
      socketStatus,
      playwrightStatus,
      uptime: process.uptime(),
      port: Number(PORT),
      environment: process.env.NODE_ENV || 'development',
      pythonScraperUrl,
      version: process.env.APP_VERSION || '1.0.0',
    }),
    ngrokUrl,
  });
});

app.get('/api/debug/network', (req: Request, res: Response) => {
  const ngrokUrl = (global as any).__ngrokUrl || process.env.NGROK_URL || '';
  const socketStatus = getSocketIO() ? 'initialized' : 'not_initialized';

  res.status(200).json({
    success: true,
    data: {
      backend: 'running',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      port: PORT,
      ngrokUrl,
      currentOrigin: req.headers.origin || null,
      currentHost: req.headers.host || null,
      forwardedHost: req.headers['x-forwarded-host'] || null,
      forwardedProto: req.headers['x-forwarded-proto'] || null,
      ip: req.ip || req.socket.remoteAddress || null,
      frontendUrl: process.env.FRONTEND_URL || null,
      netlifyUrl: process.env.NETLIFY_URL || null,
      clientUrl: process.env.CLIENT_URL || null,
      corsOrigins: process.env.CORS_ORIGINS || null,
      socketOrigin: process.env.SOCKET_ORIGIN || null,
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      socket: socketStatus,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    },
  });
});

app.get('/api/v1/routes', (_req: Request, res: Response) => {
  const routeList: { method: string; path: string }[] = [];
  const extractRoutes = (stack: any[], basePath: string = '') => {
    stack.forEach((layer: any) => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase());
        methods.forEach(method => {
          routeList.push({
            method,
            path: basePath + layer.route.path,
          });
        });
      } else if (layer.name === 'router' && layer.handle.stack) {
        const routerPath = layer.regexp.source
          .replace('\\/?(?=\\/|$)', '')
          .replace(/\\\//g, '/')
          .replace(/\^/g, '')
          .replace(/\?/g, '');
        extractRoutes(layer.handle.stack, routerPath);
      }
    });
  };
  extractRoutes(app._router.stack);
  routeList.sort((a, b) => a.path.localeCompare(b.path));
  res.status(200).json({
    success: true,
    count: routeList.length,
    routes: routeList,
  });
});

if (process.env.NODE_ENV === 'production' && process.env.SERVE_FRONTEND !== 'false') {
  const frontendIndex = join(FRONTEND_BUILD_PATH, 'index.html');
  app.get('*', (req: Request, res: Response) => {
    if (req.path.startsWith('/api/')) {
      res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
      return;
    }
    res.sendFile(frontendIndex, (err) => {
      if (err) {
        res.status(404).json({ success: false, message: 'Not found' });
      }
    });
  });
}

// ----------------------------------------------------------------
// 10. ERROR HANDLING (VALIDATION → 404 → GLOBAL)
// ----------------------------------------------------------------
app.use(validationErrorHandler);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

// ----------------------------------------------------------------
// 11. NGROK URL AUTO-DISCOVERY
// ----------------------------------------------------------------
async function discoverNgrokUrl(): Promise<string | null> {
  if (process.env.NGROK_URL) {
    logger.info({ ngrokUrl: process.env.NGROK_URL }, '[NGROK] Using configured URL from env');
    return process.env.NGROK_URL;
  }

  try {
    const response = await fetch('http://127.0.0.1:4040/api/tunnels');
    const data = await response.json() as { tunnels: Array<{ public_url: string; proto: string; config: { addr: string } }> };
    if (data.tunnels && data.tunnels.length > 0) {
      const httpsTunnel = data.tunnels.find(t => t.proto === 'https');
      const url = httpsTunnel?.public_url || data.tunnels[0].public_url;
      if (url) {
        logger.info({ ngrokUrl: url }, '[NGROK] Auto-discovered URL from ngrok API');
        (global as any).__ngrokUrl = url;
        return url;
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.debug({ err: msg }, '[NGROK] Could not discover URL from ngrok API (non-fatal)');
  }

  (global as any).__ngrokUrl = null;
  return null;
}

async function collectPlaywrightDiagnostics(): Promise<Record<string, unknown>> {
  const fs = await import('fs');
  const path = await import('path');
  const os = await import('os');

  const diag: Record<string, unknown> = {
    playwrightInstalled: false,
    executablePath: null,
    executableExists: false,
    playwrightVersion: null,
    launchSuccess: false,
    launchError: null,
    browserVersion: null,
    browserRevision: null,
    cacheLocation: null,
    cwd: process.cwd(),
    homeDir: os.homedir(),
    platform: process.platform,
    arch: process.arch,
    env: {
      PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH || '(not set)',
      HOME: process.env.HOME || '(not set)',
      NODE_ENV: process.env.NODE_ENV || '(not set)',
    },
  };

  try {
    const { chromium } = await import('playwright');
    const pkg = JSON.parse(fs.readFileSync(
      require.resolve('playwright/package.json'), 'utf-8'
    ));
    diag.playwrightInstalled = true;
    diag.playwrightVersion = pkg.version;

    diag.executablePath = chromium.executablePath();
    diag.executableExists = fs.existsSync(diag.executablePath as string);

    const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH;
    if (browsersPath === '0') {
      const pwCoreDir = path.dirname(require.resolve('playwright-core/package.json'));
      diag.cacheLocation = path.join(pwCoreDir, '.local-browsers');
    } else if (browsersPath) {
      diag.cacheLocation = browsersPath;
    } else {
      diag.cacheLocation = path.join(os.homedir(), '.cache', 'ms-playwright');
    }
    diag.cacheExists = fs.existsSync(diag.cacheLocation as string);

    const execDir = path.dirname(diag.executablePath as string);
    const chromiumDir = path.basename(path.dirname(execDir));
    diag.browserRevision = chromiumDir;
  } catch (importError: unknown) {
    const msg = importError instanceof Error ? importError.message : String(importError);
    diag.playwrightInstalled = false;
    diag.diagnosticsError = msg;
  }

  (global as any).__playwrightDiagnostic = diag;
  Object.assign(globalDiagnostics, diag);
  return diag;
}

async function validatePlaywright(): Promise<boolean> {
  const diag = await collectPlaywrightDiagnostics();

  if (!diag.playwrightInstalled) {
    logger.warn({}, '[PLAYWRIGHT] Package not installed. Scraper jobs will fail.');
    return false;
  }

  if (!diag.executableExists) {
    logger.warn({
      executablePath: diag.executablePath,
      cacheLocation: diag.cacheLocation,
      cacheExists: diag.cacheExists,
      cwd: diag.cwd,
      env: diag.env,
    }, '[PLAYWRIGHT] Browser executable not found. Scraper jobs will fail at runtime. ' +
      'Run: PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium');
    return false;
  }

  logger.info({
    executable: diag.executablePath,
    revision: diag.browserRevision,
    playwrightVersion: diag.playwrightVersion,
    cacheLocation: diag.cacheLocation,
  }, '[PLAYWRIGHT] Chromium executable found');

  return true;
}

const startServer = async (): Promise<void> => {
  try {
    await connectDB();
    await authService.ensureAdmin();
    await cronScheduler.start();

    // Node.js no longer runs Playwright — validate Python scraper is reachable instead
    const PYTHON_SCRAPER_URL = process.env.PYTHON_SCRAPER_URL || 'http://localhost:8001';
    logger.info({ pythonScraperUrl: PYTHON_SCRAPER_URL }, '[PYTHON_SCRAPER] Checking Python scraper service...');
    pythonScraperService.healthCheck().then((ok) => {
      if (ok) {
        logger.info({ pythonScraperUrl: PYTHON_SCRAPER_URL }, '[PYTHON_SCRAPER] ✓ Python scraper service is reachable');
      } else {
        logger.warn(
          { pythonScraperUrl: PYTHON_SCRAPER_URL },
          '[PYTHON_SCRAPER] ✗ Python scraper service NOT reachable — scraping will fail until it starts. ' +
          'Run: cd python-scraper && uvicorn main:app --host 0.0.0.0 --port 8001'
        );
      }
    }).catch((err) => {
      logger.warn({ err: String(err) }, '[PYTHON_SCRAPER] Health check threw');
    });

    validatePlaywright().then((available) => {
      if (available) {
        logger.info({}, '[PLAYWRIGHT] Node.js Playwright is installed (used by Python service, not Node.js)');
      }
    });

    discoverNgrokUrl().then((url) => {
      if (url) {
        logger.info({ ngrokUrl: url }, '[NGROK] URL discovered at startup');
      } else {
        logger.info({}, '[NGROK] No ngrok URL discovered at startup — will detect from incoming requests');
      }
    });

    const httpServer = createServer(app);
    initSocketManager(httpServer);

    httpServer.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        logger.fatal({ port: PORT }, `Port ${PORT} is already in use. Kill the existing process with: fuser -k ${PORT}/tcp`);
      } else {
        logger.fatal({ err: error.message }, 'Server error');
      }
      process.exit(1);
    });

    httpServer.listen(Number(PORT), '0.0.0.0', () => {
      logger.info(`Server started on port ${PORT}`);

      // ----------------------------------------------------------------
      // Keep-alive: Render free tier spins down after 15 min of inactivity.
      // Ping /health every 10 min to prevent that.
      // ----------------------------------------------------------------
      if (process.env.NODE_ENV === 'production') {
        const selfUrl = process.env.RENDER_EXTERNAL_URL || 'https://lfa-be.onrender.com';
        setInterval(() => {
          fetch(`${selfUrl}/health`).catch(() => {
            // Non-fatal — just a best-effort keep-alive
          });
        }, 10 * 60 * 1000); // every 10 minutes
        logger.info({ selfUrl }, '[KeepAlive] Render keep-alive ping started (every 10 min)');
      }

      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`API prefix: /api/v1`);
      logger.info(`CORS: Accepting all origins (Netlify, ngrok, localhost)`);
      logger.info(`Trusting proxy: true (for ngrok)`);

      const registered: { method: string; path: string }[] = [];
      const extract = (stack: any[], base: string = '') => {
        stack.forEach((layer: any) => {
          if (layer.route) {
            Object.keys(layer.route.methods).forEach(m => {
              registered.push({ method: m.toUpperCase(), path: base + layer.route.path });
            });
          } else if (layer.name === 'router' && layer.handle.stack) {
            const p = layer.regexp.source
              .replace('\\/?(?=\\/|$)', '')
              .replace(/\\\//g, '/')
              .replace(/\^/g, '')
              .replace(/\?/g, '');
            extract(layer.handle.stack, p);
          }
        });
      };
      extract(app._router.stack);
      registered.sort((a, b) => a.path.localeCompare(b.path));

      logger.info('================================');
      logger.info('REGISTERED ROUTES');
      logger.info('=================');
      registered.forEach(r => logger.info(`${r.method.padEnd(7)} ${r.path}`));
      logger.info('=================');
      logger.info(`Total: ${registered.length} routes`);
      logger.info('================================');
    });

    setImmediate(async () => {
      try {
        const { areaQueue } = await import('./core/scraper-engine/area-queue');
        await areaQueue.recoverStuckSessions();
        logger.info('[Startup] Area automation session recovery complete');
      } catch (error) {
        logger.error(error instanceof Error ? error : new Error(String(error)), '[Startup] Area automation recovery failed (non-blocking)');
      }
    });

    setImmediate(async () => {
      try {
        const { searchCleanup } = await import('./services/search-queue.service');
        await searchCleanup.startupCleanup();
      } catch (error) {
        logger.error(error instanceof Error ? error : new Error(String(error)), '[Startup] Search cleanup failed');
      }
    });

    setImmediate(async () => {
      try {
        const count = await aiProcessingQueue.enqueueAllPendingLeads(50);
        logger.info(`[Startup] Auto-enqueued ${count} existing leads for AI pipeline`);
      } catch (error) {
        logger.error(error instanceof Error ? error : new Error(String(error)), '[Startup] AI pipeline enqueue failed (non-blocking)');
      }
    });

    setImmediate(async () => {
      try {
        const { leadMigrationService } = await import('./services/lead-migration.service');
        const result = await leadMigrationService.migrateWebsiteDetectionFields(200);
        logger.info({ result }, '[Startup] Website detection migration complete');
      } catch (error) {
        logger.error(error instanceof Error ? error : new Error(String(error)), '[Startup] Website detection migration failed (non-blocking)');
      }
    });

    setImmediate(async () => {
      try {
        const { User } = await import('./models/User');
        const bcrypt = await import('bcryptjs');
        const adminEmail = 'info@optimatrix.com';
        const existingAdmin = await User.findOne({ email: adminEmail });
        
        if (!existingAdmin) {
          const hashedPassword = await bcrypt.hash('OptiMatrix@2026', 10);
          await User.create({
            email: adminEmail,
            password: hashedPassword,
            name: 'Administrator',
            role: 'admin'
          });
          logger.info(`[Startup] Seeded default administrator account: ${adminEmail}`);
        } else {
          logger.info(`[Startup] Default administrator account already exists.`);
        }
      } catch (error) {
        logger.error(error instanceof Error ? error : new Error(String(error)), '[Startup] Failed to seed admin account');
      }
    });

    backgroundEnrichmentWorker.start();
    recoveryOrchestrator.start();

    const shutdown = async (): Promise<void> => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      logger.info('Shutting down server...');
      try {
        backgroundEnrichmentWorker.stop();
        recoveryOrchestrator.stop();
        await cronScheduler.stop();
        httpServer.close(() => {
          logger.info('HTTP server closed');
        });
        await disconnectDB();
        process.exit(0);
      } catch (error: any) {
        logger.error({ err: error?.message || error }, 'Shutdown error');
        process.exit(1);
      }
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error: any) {
    logger.error({ err: error?.message || error }, 'Failed to start server');
    process.exit(1);
  }
};

startServer();

export default app;
