"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongoose_1 = __importDefault(require("mongoose"));
const SearchHistory_1 = require("../models/SearchHistory");
const Lead_1 = require("../models/Lead");
const SearchAnalytics_1 = require("../models/SearchAnalytics");
const search_status_service_1 = require("../services/search-status.service");
const search_queue_service_1 = require("../services/search-queue.service");
const browser_manager_1 = require("../core/scraper-engine/browser-manager");
const browser_pool_service_1 = require("../services/browser-pool.service");
const perf_monitor_1 = require("../utils/perf-monitor");
const scraper_engine_1 = require("../core/scraper-engine/scraper-engine");
const logger_1 = require("../utils/logger");
const api_response_1 = require("../utils/api-response");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const router = (0, express_1.Router)();
router.get('/network', (_req, res) => {
    const ngrokUrl = global.__ngrokUrl || process.env.NGROK_URL || '';
    const socketStatus = global.__io ? 'initialized' : 'not_initialized';
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
            database: mongoose_1.default.connection.readyState === 1 ? 'connected' : 'disconnected',
            socket: socketStatus,
            nodeVersion: process.version,
            platform: process.platform,
            timestamp: new Date().toISOString(),
        },
    });
});
router.get('/auth', (req, res) => {
    const authHeader = req.headers.authorization;
    const hasAuth = !!authHeader;
    const authPrefix = authHeader ? authHeader.substring(0, 25) : 'none';
    const cookies = req.cookies || {};
    const hasCookie = !!cookies.accessToken;
    let tokenPayload = null;
    let tokenError = null;
    let tokenExpiresAt = null;
    const token = authHeader?.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : cookies.accessToken || null;
    if (token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'fallback-secret-do-not-use');
            tokenPayload = {
                userId: decoded.userId,
                role: decoded.role,
                iat: decoded.iat,
                exp: decoded.exp,
            };
            if (decoded.exp) {
                tokenExpiresAt = new Date(decoded.exp * 1000).toISOString();
            }
        }
        catch (err) {
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
router.get('/request', (req, res) => {
    const headers = {};
    const sensitiveHeaders = ['authorization', 'cookie', 'set-cookie'];
    for (const [key, value] of Object.entries(req.headers)) {
        if (sensitiveHeaders.includes(key.toLowerCase())) {
            headers[key] = `[present: ${value ? String(value).length : 0} chars]`;
        }
        else {
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
            ngrokUrl: global.__ngrokUrl || null,
        },
    });
});
router.get('/playwright', async (_req, res) => {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    const result = {
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
        filesystem: {},
    };
    const prevDiag = global.__playwrightDiagnostic;
    try {
        const pw = require('playwright');
        const pkg = JSON.parse(fs.readFileSync(require.resolve('playwright/package.json'), 'utf-8'));
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
        }
        else if (browsersPath) {
            result.cacheLocation = browsersPath;
        }
        else {
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
        logger_1.logger.info({
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
        }
        catch (launchErr) {
            const msg = launchErr instanceof Error ? launchErr.message : String(launchErr);
            result.launchSuccess = false;
            result.launchError = msg;
            logger_1.logger.error({
                err: msg,
                executablePath: browserPath,
                executableExists: result.executableExists,
                cacheLocation: result.cacheLocation,
                cacheExists: result.cacheExists,
                cwd: process.cwd(),
                envPlaywrightPath: process.env.PLAYWRIGHT_BROWSERS_PATH || '(not set)',
            }, '[DEBUG] Playwright launch attempt failed');
        }
    }
    catch (importErr) {
        const msg = importErr instanceof Error ? importErr.message : String(importErr);
        result.installed = false;
        result.error = msg;
    }
    result.startupDiagnostic = prevDiag || null;
    return api_response_1.APIResponse.success(res, result, 'Playwright diagnostic');
});
router.get('/browsers', async (_req, res) => {
    const status = browser_manager_1.browserManager.getStatus();
    return api_response_1.APIResponse.success(res, status, 'Browser pool status');
});
router.get('/search/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    const inMemory = search_status_service_1.searchStatus.getProgress(sessionId);
    const dbRecord = await SearchHistory_1.SearchHistory.findOne({ searchSessionId: sessionId }).lean();
    const leadCount = await Lead_1.Lead.countDocuments({ searchSessionId: sessionId });
    const sampleLeads = await Lead_1.Lead.find({ searchSessionId: sessionId }).limit(3).lean();
    const isQueued = search_queue_service_1.searchQueue.isRunning(sessionId);
    const timeline = [];
    if (inMemory) {
        timeline.push({
            state: inMemory.searchState,
            timestamp: inMemory.updatedAt,
        });
    }
    if (dbRecord?.logs) {
        for (const log of dbRecord.logs) {
            timeline.push({
                state: log.message,
                timestamp: log.timestamp?.toISOString() || '',
            });
        }
    }
    return api_response_1.APIResponse.success(res, {
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
        browserPoolStatus: browser_manager_1.browserManager.getStatus(),
    }, 'Search diagnostic');
});
router.get('/health', async (_req, res) => {
    const mongoState = mongoose_1.default.connection.readyState;
    const mongoStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    const queueSize = search_queue_service_1.searchQueue.queue?.length || 0;
    const activeSessions = search_queue_service_1.searchQueue.activeSessions?.size || 0;
    const browserStatus = browser_manager_1.browserManager.getStatus();
    const poolStatus = browser_pool_service_1.browserPool.getStatus();
    const allHealthy = mongoState === 1 && activeSessions >= 0;
    return api_response_1.APIResponse.success(res, {
        status: allHealthy ? 'healthy' : 'degraded',
        mongodb: {
            state: mongoStates[mongoState] || 'unknown',
            ready: mongoState === 1,
        },
        searchQueue: {
            pendingJobs: queueSize,
            activeSessions,
            lockedSessions: search_queue_service_1.searchQueue.sessionLocks?.size || 0,
            running: activeSessions > 0,
        },
        browserManager: browserStatus,
        browserPool: poolStatus,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString(),
    }, 'System health');
});
router.get('/search', async (_req, res) => {
    const sessions = search_status_service_1.searchStatus.sessions;
    const inMemorySessions = [];
    if (sessions) {
        for (const [id, session] of sessions) {
            inMemorySessions.push({
                sessionId: id,
                searchState: session.searchState,
                status: session.status,
                leadsFound: session.leadsFound,
                uniqueLeads: session.uniqueLeads,
                duplicatesRemoved: session.duplicatesRemoved,
            });
        }
    }
    const recentDB = await SearchHistory_1.SearchHistory.find()
        .sort({ startedAt: -1 })
        .limit(10)
        .lean()
        .catch(() => []);
    return api_response_1.APIResponse.success(res, {
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
        historyCount: await SearchHistory_1.SearchHistory.countDocuments().catch(() => -1),
        analyticsCount: await SearchAnalytics_1.SearchAnalytics.countDocuments().catch(() => -1),
    }, 'Search system status');
});
router.get('/queue', async (_req, res) => {
    const queue = search_queue_service_1.searchQueue;
    const status = search_status_service_1.searchStatus;
    return api_response_1.APIResponse.success(res, {
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
        browser: scraper_engine_1.scraperEngine.getBrowserStatus(),
        pool: browser_pool_service_1.browserPool.getStatus(),
    }, 'Queue status');
});
router.get('/perf', async (_req, res) => {
    const stats = perf_monitor_1.perfMonitor.getAllStats();
    const recentEntries = perf_monitor_1.perfMonitor.getRecent(20);
    return api_response_1.APIResponse.success(res, { stats, recentEntries }, 'Performance stats');
});
exports.default = router;
//# sourceMappingURL=debug.route.js.map