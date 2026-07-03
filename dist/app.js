"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("express-async-errors");
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const compression_1 = __importDefault(require("compression"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const morgan_1 = __importDefault(require("morgan"));
const database_1 = require("./config/database");
const logger_1 = require("./utils/logger");
const http_1 = require("http");
const error_middleware_1 = require("./middlewares/error.middleware");
const not_found_middleware_1 = require("./middlewares/not-found.middleware");
const validation_middleware_1 = require("./middlewares/validation.middleware");
const timeout_middleware_1 = require("./middlewares/timeout.middleware");
const index_1 = __importDefault(require("./routes/index"));
const cron_scheduler_1 = require("./schedulers/cron.scheduler");
const auth_service_1 = require("./services/auth.service");
const socket_manager_1 = require("./modules/automation-monitor/socket-manager");
const path_1 = require("path");
const ai_processing_queue_service_1 = require("./services/ai-processing-queue.service");
const multi_source_1 = require("./multi-source");
const recovery_orchestrator_1 = require("./recovery/recovery-orchestrator");
const python_scraper_service_1 = require("./services/python-scraper.service");
const health_1 = require("./utils/health");
let isShuttingDown = false;
let crashCount = 0;
dotenv_1.default.config();
process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || '0';
function recordCrash(type, error) {
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
        const fs = require('fs');
        const crashLogPath = require('path').join(process.cwd(), '.crash-record');
        fs.writeFileSync(crashLogPath, JSON.stringify(crashRecord, null, 2), 'utf-8');
    }
    catch {
    }
    logger_1.logger.error(crashRecord, `[CRASH #${crashCount}] ${type}: ${error instanceof Error ? error.message : String(error)}`);
}
process.on('unhandledRejection', (reason) => {
    recordCrash('Unhandled Rejection', reason);
});
process.on('uncaughtException', (error) => {
    recordCrash('Uncaught Exception', error);
    logger_1.logger.info({}, '[CRASH] Attempting graceful recovery — server will continue running');
});
const app = (0, express_1.default)();
app.set('trust proxy', true);
const globalDiagnostics = {};
global.__diagnostics = globalDiagnostics;
function isNgrokDomain(origin) {
    return (origin.endsWith('.ngrok-free.app') ||
        origin.endsWith('.ngrok-free.dev') ||
        origin.endsWith('.ngrok.io') ||
        origin.includes('ngrok'));
}
function isNetlifyDomain(origin) {
    return origin.endsWith('.netlify.app');
}
function isLocalhost(origin) {
    return (origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.includes('[::1]'));
}
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) {
            return callback(null, true);
        }
        if (!isNetlifyDomain(origin) &&
            !isNgrokDomain(origin) &&
            !isLocalhost(origin)) {
            logger_1.logger.warn({ origin }, `[CORS] Unknown origin (ALLOWED): ${origin}`);
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
app.use((0, cors_1.default)(corsOptions));
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'unsafe-none' },
}));
app.use((0, compression_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((0, cookie_parser_1.default)());
morgan_1.default.token('origin', (req) => req.headers.origin || '-');
morgan_1.default.token('forwarded-for', (req) => req.headers['x-forwarded-for'] || '-');
morgan_1.default.token('real-ip', (req) => req.ip || '-');
const morganFormat = '[:date[iso]] ":method :url" :status :res[content-length] :response-time ms origin=:origin ip=:real-ip forwarded=:forwarded-for';
app.use((0, morgan_1.default)(morganFormat));
function detectNgrokFromHeaders(req) {
    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const proto = req.headers['x-forwarded-proto'] || 'https';
    if (host && (host.includes('ngrok') || host.includes('ngrok-free'))) {
        const url = `${proto}://${host}`;
        return url;
    }
    return null;
}
app.use((req, res, next) => {
    const start = Date.now();
    const ngrokFromHeaders = detectNgrokFromHeaders(req);
    if (ngrokFromHeaders) {
        const current = global.__ngrokUrl;
        if (current !== ngrokFromHeaders) {
            global.__ngrokUrl = ngrokFromHeaders;
            logger_1.logger.info({ ngrokUrl: ngrokFromHeaders }, '[NGROK] URL updated from incoming request');
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
            logger_1.logger.warn(diag, `[REQUEST] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
        }
        else {
            logger_1.logger.info(diag, `[REQUEST] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
        }
    });
    next();
});
const PORT = process.env.PORT || 5000;
const FRONTEND_BUILD_PATH = process.env.FRONTEND_BUILD_PATH || (0, path_1.join)(__dirname, '../../frontend/out');
if (process.env.NODE_ENV === 'production' && process.env.SERVE_FRONTEND !== 'false') {
    app.use(express_1.default.static(FRONTEND_BUILD_PATH));
    logger_1.logger.info({ path: FRONTEND_BUILD_PATH, env: process.env.NODE_ENV }, 'Serving frontend static build');
}
app.use('/uploads', express_1.default.static((0, path_1.join)(process.cwd(), 'uploads')));
app.use('/api/v1', (req, res, next) => {
    const start = Date.now();
    const originalEnd = res.end.bind(res);
    res.end = function (...args) {
        const duration = Date.now() - start;
        if (duration > 1000) {
            logger_1.logger.warn({ method: req.method, url: req.originalUrl, duration, status: res.statusCode }, `[PERF] Slow request: ${req.method} ${req.originalUrl} took ${duration}ms`);
        }
        return originalEnd(...args);
    };
    next();
});
app.use('/api/v1', (req, res, next) => {
    const isLongRunning = req.method === 'POST' && (req.path === '/search' || req.path.endsWith('/search'));
    if (isLongRunning) {
        return next();
    }
    return (0, timeout_middleware_1.requestTimeout)(29000)(req, res, next);
}, index_1.default);
app.get('/', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'Welcome to Lead Finder API',
        timestamp: new Date().toISOString(),
    });
});
app.get('/health', (_req, res) => {
    const dbState = mongoose_1.default.connection.readyState;
    let dbStatus = 'disconnected';
    if (dbState === 1)
        dbStatus = 'connected';
    else if (dbState === 2)
        dbStatus = 'connecting';
    else if (dbState === 3)
        dbStatus = 'disconnecting';
    const pwDiag = global.__playwrightDiagnostic;
    const playwrightStatus = pwDiag?.executableExists ? 'available' : 'unavailable';
    const socketStatus = (0, socket_manager_1.getSocketIO)() ? 'initialized' : 'not_initialized';
    res.status(200).json((0, health_1.buildBackendHealthPayload)({
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
app.get('/api/health', (_req, res) => {
    const dbState = mongoose_1.default.connection.readyState;
    let dbStatus = 'disconnected';
    if (dbState === 1)
        dbStatus = 'connected';
    else if (dbState === 2)
        dbStatus = 'connecting';
    else if (dbState === 3)
        dbStatus = 'disconnecting';
    const pwDiag = global.__playwrightDiagnostic;
    const playwrightStatus = pwDiag?.executableExists ? 'available' : 'unavailable';
    const socketStatus = (0, socket_manager_1.getSocketIO)() ? 'initialized' : 'not_initialized';
    const ngrokUrl = global.__ngrokUrl || process.env.NGROK_URL || '';
    const pythonScraperUrl = process.env.PYTHON_SCRAPER_URL || 'http://localhost:8001';
    res.status(200).json({
        ...(0, health_1.buildBackendHealthPayload)({
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
app.get('/api/debug/network', (req, res) => {
    const ngrokUrl = global.__ngrokUrl || process.env.NGROK_URL || '';
    const socketStatus = (0, socket_manager_1.getSocketIO)() ? 'initialized' : 'not_initialized';
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
            database: mongoose_1.default.connection.readyState === 1 ? 'connected' : 'disconnected',
            socket: socketStatus,
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            memory: process.memoryUsage(),
            timestamp: new Date().toISOString(),
        },
    });
});
app.get('/api/v1/routes', (_req, res) => {
    const routeList = [];
    const extractRoutes = (stack, basePath = '') => {
        stack.forEach((layer) => {
            if (layer.route) {
                const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase());
                methods.forEach(method => {
                    routeList.push({
                        method,
                        path: basePath + layer.route.path,
                    });
                });
            }
            else if (layer.name === 'router' && layer.handle.stack) {
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
    const frontendIndex = (0, path_1.join)(FRONTEND_BUILD_PATH, 'index.html');
    app.get('*', (req, res) => {
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
app.use(validation_middleware_1.validationErrorHandler);
app.use(not_found_middleware_1.notFoundMiddleware);
app.use(error_middleware_1.errorMiddleware);
async function discoverNgrokUrl() {
    if (process.env.NGROK_URL) {
        logger_1.logger.info({ ngrokUrl: process.env.NGROK_URL }, '[NGROK] Using configured URL from env');
        return process.env.NGROK_URL;
    }
    try {
        const response = await fetch('http://127.0.0.1:4040/api/tunnels');
        const data = await response.json();
        if (data.tunnels && data.tunnels.length > 0) {
            const httpsTunnel = data.tunnels.find(t => t.proto === 'https');
            const url = httpsTunnel?.public_url || data.tunnels[0].public_url;
            if (url) {
                logger_1.logger.info({ ngrokUrl: url }, '[NGROK] Auto-discovered URL from ngrok API');
                global.__ngrokUrl = url;
                return url;
            }
        }
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger_1.logger.debug({ err: msg }, '[NGROK] Could not discover URL from ngrok API (non-fatal)');
    }
    global.__ngrokUrl = null;
    return null;
}
async function collectPlaywrightDiagnostics() {
    const fs = await Promise.resolve().then(() => __importStar(require('fs')));
    const path = await Promise.resolve().then(() => __importStar(require('path')));
    const os = await Promise.resolve().then(() => __importStar(require('os')));
    const diag = {
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
        const { chromium } = await Promise.resolve().then(() => __importStar(require('playwright')));
        const pkg = JSON.parse(fs.readFileSync(require.resolve('playwright/package.json'), 'utf-8'));
        diag.playwrightInstalled = true;
        diag.playwrightVersion = pkg.version;
        diag.executablePath = chromium.executablePath();
        diag.executableExists = fs.existsSync(diag.executablePath);
        const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH;
        if (browsersPath === '0') {
            const pwCoreDir = path.dirname(require.resolve('playwright-core/package.json'));
            diag.cacheLocation = path.join(pwCoreDir, '.local-browsers');
        }
        else if (browsersPath) {
            diag.cacheLocation = browsersPath;
        }
        else {
            diag.cacheLocation = path.join(os.homedir(), '.cache', 'ms-playwright');
        }
        diag.cacheExists = fs.existsSync(diag.cacheLocation);
        const execDir = path.dirname(diag.executablePath);
        const chromiumDir = path.basename(path.dirname(execDir));
        diag.browserRevision = chromiumDir;
    }
    catch (importError) {
        const msg = importError instanceof Error ? importError.message : String(importError);
        diag.playwrightInstalled = false;
        diag.diagnosticsError = msg;
    }
    global.__playwrightDiagnostic = diag;
    Object.assign(globalDiagnostics, diag);
    return diag;
}
async function validatePlaywright() {
    const diag = await collectPlaywrightDiagnostics();
    if (!diag.playwrightInstalled) {
        logger_1.logger.warn({}, '[PLAYWRIGHT] Package not installed. Scraper jobs will fail.');
        return false;
    }
    if (!diag.executableExists) {
        logger_1.logger.warn({
            executablePath: diag.executablePath,
            cacheLocation: diag.cacheLocation,
            cacheExists: diag.cacheExists,
            cwd: diag.cwd,
            env: diag.env,
        }, '[PLAYWRIGHT] Browser executable not found. Scraper jobs will fail at runtime. ' +
            'Run: PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium');
        return false;
    }
    logger_1.logger.info({
        executable: diag.executablePath,
        revision: diag.browserRevision,
        playwrightVersion: diag.playwrightVersion,
        cacheLocation: diag.cacheLocation,
    }, '[PLAYWRIGHT] Chromium executable found');
    return true;
}
const startServer = async () => {
    try {
        await (0, database_1.connectDB)();
        await auth_service_1.authService.ensureAdmin();
        await cron_scheduler_1.cronScheduler.start();
        const PYTHON_SCRAPER_URL = process.env.PYTHON_SCRAPER_URL || 'http://localhost:8001';
        logger_1.logger.info({ pythonScraperUrl: PYTHON_SCRAPER_URL }, '[PYTHON_SCRAPER] Checking Python scraper service...');
        python_scraper_service_1.pythonScraperService.healthCheck().then((ok) => {
            if (ok) {
                logger_1.logger.info({ pythonScraperUrl: PYTHON_SCRAPER_URL }, '[PYTHON_SCRAPER] ✓ Python scraper service is reachable');
            }
            else {
                logger_1.logger.warn({ pythonScraperUrl: PYTHON_SCRAPER_URL }, '[PYTHON_SCRAPER] ✗ Python scraper service NOT reachable — scraping will fail until it starts. ' +
                    'Run: cd python-scraper && uvicorn main:app --host 0.0.0.0 --port 8001');
            }
        }).catch((err) => {
            logger_1.logger.warn({ err: String(err) }, '[PYTHON_SCRAPER] Health check threw');
        });
        validatePlaywright().then((available) => {
            if (available) {
                logger_1.logger.info({}, '[PLAYWRIGHT] Node.js Playwright is installed (used by Python service, not Node.js)');
            }
        });
        discoverNgrokUrl().then((url) => {
            if (url) {
                logger_1.logger.info({ ngrokUrl: url }, '[NGROK] URL discovered at startup');
            }
            else {
                logger_1.logger.info({}, '[NGROK] No ngrok URL discovered at startup — will detect from incoming requests');
            }
        });
        const httpServer = (0, http_1.createServer)(app);
        (0, socket_manager_1.initSocketManager)(httpServer);
        httpServer.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                logger_1.logger.fatal({ port: PORT }, `Port ${PORT} is already in use. Kill the existing process with: fuser -k ${PORT}/tcp`);
            }
            else {
                logger_1.logger.fatal({ err: error.message }, 'Server error');
            }
            process.exit(1);
        });
        httpServer.listen(Number(PORT), '0.0.0.0', () => {
            logger_1.logger.info(`Server started on port ${PORT}`);
            if (process.env.NODE_ENV === 'production') {
                const selfUrl = process.env.RENDER_EXTERNAL_URL || 'https://lfa-be.onrender.com';
                setInterval(() => {
                    fetch(`${selfUrl}/health`).catch(() => {
                    });
                }, 10 * 60 * 1000);
                logger_1.logger.info({ selfUrl }, '[KeepAlive] Render keep-alive ping started (every 10 min)');
            }
            logger_1.logger.info(`Environment: ${process.env.NODE_ENV}`);
            logger_1.logger.info(`API prefix: /api/v1`);
            logger_1.logger.info(`CORS: Accepting all origins (Netlify, ngrok, localhost)`);
            logger_1.logger.info(`Trusting proxy: true (for ngrok)`);
            const registered = [];
            const extract = (stack, base = '') => {
                stack.forEach((layer) => {
                    if (layer.route) {
                        Object.keys(layer.route.methods).forEach(m => {
                            registered.push({ method: m.toUpperCase(), path: base + layer.route.path });
                        });
                    }
                    else if (layer.name === 'router' && layer.handle.stack) {
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
            logger_1.logger.info('================================');
            logger_1.logger.info('REGISTERED ROUTES');
            logger_1.logger.info('=================');
            registered.forEach(r => logger_1.logger.info(`${r.method.padEnd(7)} ${r.path}`));
            logger_1.logger.info('=================');
            logger_1.logger.info(`Total: ${registered.length} routes`);
            logger_1.logger.info('================================');
        });
        setImmediate(async () => {
            try {
                const { areaQueue } = await Promise.resolve().then(() => __importStar(require('./core/scraper-engine/area-queue')));
                await areaQueue.recoverStuckSessions();
                logger_1.logger.info('[Startup] Area automation session recovery complete');
            }
            catch (error) {
                logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), '[Startup] Area automation recovery failed (non-blocking)');
            }
        });
        setImmediate(async () => {
            try {
                const { searchCleanup } = await Promise.resolve().then(() => __importStar(require('./services/search-queue.service')));
                await searchCleanup.startupCleanup();
            }
            catch (error) {
                logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), '[Startup] Search cleanup failed');
            }
        });
        setImmediate(async () => {
            try {
                const count = await ai_processing_queue_service_1.aiProcessingQueue.enqueueAllPendingLeads(50);
                logger_1.logger.info(`[Startup] Auto-enqueued ${count} existing leads for AI pipeline`);
            }
            catch (error) {
                logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), '[Startup] AI pipeline enqueue failed (non-blocking)');
            }
        });
        setImmediate(async () => {
            try {
                const { leadMigrationService } = await Promise.resolve().then(() => __importStar(require('./services/lead-migration.service')));
                const result = await leadMigrationService.migrateWebsiteDetectionFields(200);
                logger_1.logger.info({ result }, '[Startup] Website detection migration complete');
            }
            catch (error) {
                logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), '[Startup] Website detection migration failed (non-blocking)');
            }
        });
        setImmediate(async () => {
            try {
                const { User } = await Promise.resolve().then(() => __importStar(require('./models/User')));
                const bcrypt = await Promise.resolve().then(() => __importStar(require('bcryptjs')));
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
                    logger_1.logger.info(`[Startup] Seeded default administrator account: ${adminEmail}`);
                }
                else {
                    logger_1.logger.info(`[Startup] Default administrator account already exists.`);
                }
            }
            catch (error) {
                logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), '[Startup] Failed to seed admin account');
            }
        });
        multi_source_1.backgroundEnrichmentWorker.start();
        recovery_orchestrator_1.recoveryOrchestrator.start();
        const shutdown = async () => {
            if (isShuttingDown)
                return;
            isShuttingDown = true;
            logger_1.logger.info('Shutting down server...');
            try {
                multi_source_1.backgroundEnrichmentWorker.stop();
                recovery_orchestrator_1.recoveryOrchestrator.stop();
                await cron_scheduler_1.cronScheduler.stop();
                httpServer.close(() => {
                    logger_1.logger.info('HTTP server closed');
                });
                await (0, database_1.disconnectDB)();
                process.exit(0);
            }
            catch (error) {
                logger_1.logger.error({ err: error?.message || error }, 'Shutdown error');
                process.exit(1);
            }
        };
        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
    }
    catch (error) {
        logger_1.logger.error({ err: error?.message || error }, 'Failed to start server');
        process.exit(1);
    }
};
startServer();
exports.default = app;
//# sourceMappingURL=app.js.map