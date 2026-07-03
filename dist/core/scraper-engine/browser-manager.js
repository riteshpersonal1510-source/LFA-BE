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
exports.browserManager = exports.BrowserManager = void 0;
const playwright_1 = require("playwright");
const logger_1 = require("../../utils/logger");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const PERSISTENT_PROFILE_DIR = path_1.default.resolve(process.cwd(), '.gm-user-data');
const CHROMIUM_ARGS = [
    '--disable-blink-features=AutomationControlled',
    '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
    '--disable-gpu', '--disable-software-rasterizer',
    '--disable-accelerated-2d-canvas', '--disable-extensions',
    '--window-size=1920,1080',
    '--disable-features=IsolateOrigins,site-per-process',
    '--disable-session-crashed-bubble', '--disable-crash-reporter',
    '--disable-background-networking', '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows', '--disable-breakpad',
    '--disable-component-extensions-with-background-pages',
    '--mute-audio', '--no-default-browser-check',
    '--no-first-run', '--disable-field-trial-config',
    '--disable-client-side-phishing-detection', '--disable-component-update',
    '--disable-sync', '--disable-default-apps',
    '--disable-notifications', '--disable-popup-blocking',
];
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
];
function buildStealthScript(langs) {
    const langsJson = JSON.stringify(langs);
    return `
Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
Object.defineProperty(navigator, 'plugins', { get: () => [] });
Object.defineProperty(navigator, 'languages', { get: () => ${langsJson} });
Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 });
if (navigator.permissions) {
  var _oq = navigator.permissions.query.bind(navigator.permissions);
  navigator.permissions.query = function(p) {
    if (p && p.name === 'notifications') return Promise.resolve({ state: 'denied', onchange: null });
    return _oq(p);
  };
}
window.chrome = window.chrome || {};
window.chrome.runtime = window.chrome.runtime || {};
['connect','sendMessage','getBackgroundPage','getManifest','getURL','reload','restart'].forEach(function(m) {
  if (!window.chrome.runtime[m]) window.chrome.runtime[m] = function() {};
});
['onMessage','onConnect','onDisconnect','onInstalled','onStartup'].forEach(function(e) {
  if (!window.chrome.runtime[e]) window.chrome.runtime[e] = { addListener: function() {}, removeListener: function() {}, hasListeners: function() { return false; } };
});
window.chrome.app = window.chrome.app || { isInstalled: false };
window.chrome.loadTimes = window.chrome.loadTimes || function() {};
window.chrome.csi = window.chrome.csi || function() {};
`;
}
const BLOCKED_RESOURCE_TYPES = new Set([
    'image', 'media', 'font', 'imageset', 'beacon', 'csp_report', 'ping',
]);
const BLOCKED_DOMAINS = [
    'google-analytics.com', 'googletagmanager.com', 'facebook.net',
    'doubleclick.net', 'cdn.cookie-script.com', 'cdn.userway.org',
    'hotjar.com', 'clarity.ms', 'bat.bing.com', 'adservice.google.com',
    'pagead2.googlesyndication.com', 'fundingchoicesmessages.google.com',
    'mc.yandex.ru', 'www.googleadservices.com',
];
const BROWSER_IDLE_TIMEOUT_MS = 600000;
const PAGE_TIMEOUT_MS = 60000;
const BROWSER_LAUNCH_TIMEOUT_MS = 30000;
const CLEANUP_INTERVAL_MS = 60000;
const MAX_CONTEXTS = 10;
const MAX_PAGES_PER_CONTEXT = 20;
const MAX_TOTAL_PAGES = 40;
const countryLocationMap = {
    india: { lat: 23.0225, lng: 72.5714, tz: 'Asia/Kolkata', locale: 'en-IN', lang: 'en-IN,en-GB;q=0.9,en;q=0.8' },
    'united states': { lat: 40.7128, lng: -74.006, tz: 'America/New_York', locale: 'en-US', lang: 'en-US,en;q=0.9' },
    'united kingdom': { lat: 51.5074, lng: -0.1278, tz: 'Europe/London', locale: 'en-GB', lang: 'en-GB,en;q=0.9' },
    australia: { lat: -33.8688, lng: 151.2093, tz: 'Australia/Sydney', locale: 'en-AU', lang: 'en-AU,en;q=0.9' },
    canada: { lat: 43.6532, lng: -79.3832, tz: 'America/Toronto', locale: 'en-CA', lang: 'en-CA,en;q=0.9' },
    germany: { lat: 52.52, lng: 13.405, tz: 'Europe/Berlin', locale: 'de-DE', lang: 'de-DE,de;q=0.9,en;q=0.8' },
    france: { lat: 48.8566, lng: 2.3522, tz: 'Europe/Paris', locale: 'fr-FR', lang: 'fr-FR,fr;q=0.9,en;q=0.8' },
    italy: { lat: 41.9028, lng: 12.4964, tz: 'Europe/Rome', locale: 'it-IT', lang: 'it-IT,it;q=0.9,en;q=0.8' },
    spain: { lat: 40.4168, lng: -3.7038, tz: 'Europe/Madrid', locale: 'es-ES', lang: 'es-ES,es;q=0.9,en;q=0.8' },
    japan: { lat: 35.6762, lng: 139.6503, tz: 'Asia/Tokyo', locale: 'ja-JP', lang: 'ja-JP,ja;q=0.9,en;q=0.8' },
    singapore: { lat: 1.3521, lng: 103.8198, tz: 'Asia/Singapore', locale: 'en-SG', lang: 'en-SG,en;q=0.9,zh;q=0.8' },
    uae: { lat: 25.2048, lng: 55.2708, tz: 'Asia/Dubai', locale: 'en-AE', lang: 'en-AE,en;q=0.9,ar;q=0.8' },
    'saudi arabia': { lat: 24.7136, lng: 46.6753, tz: 'Asia/Riyadh', locale: 'ar-SA', lang: 'ar-SA,ar;q=0.9,en;q=0.8' },
    'south africa': { lat: -26.2041, lng: 28.0473, tz: 'Africa/Johannesburg', locale: 'en-ZA', lang: 'en-ZA,en;q=0.9' },
    brazil: { lat: -23.5505, lng: -46.6333, tz: 'America/Sao_Paulo', locale: 'pt-BR', lang: 'pt-BR,pt;q=0.9,en;q=0.8' },
    mexico: { lat: 19.4326, lng: -99.1332, tz: 'America/Mexico_City', locale: 'es-MX', lang: 'es-MX,es;q=0.9,en;q=0.8' },
    'new zealand': { lat: -36.8485, lng: 174.7633, tz: 'Pacific/Auckland', locale: 'en-NZ', lang: 'en-NZ,en;q=0.9' },
    thailand: { lat: 13.7563, lng: 100.5018, tz: 'Asia/Bangkok', locale: 'th-TH', lang: 'th-TH,th;q=0.9,en;q=0.8' },
    malaysia: { lat: 3.139, lng: 101.6869, tz: 'Asia/Kuala_Lumpur', locale: 'ms-MY', lang: 'ms-MY,ms;q=0.9,en;q=0.8' },
    indonesia: { lat: -6.2088, lng: 106.8456, tz: 'Asia/Jakarta', locale: 'id-ID', lang: 'id-ID,id;q=0.9,en;q=0.8' },
    philippines: { lat: 14.5995, lng: 120.9842, tz: 'Asia/Manila', locale: 'en-PH', lang: 'en-PH,en;q=0.9,fil;q=0.8' },
    vietnam: { lat: 10.8231, lng: 106.6297, tz: 'Asia/Ho_Chi_Minh', locale: 'vi-VN', lang: 'vi-VN,vi;q=0.9,en;q=0.8' },
    turkey: { lat: 41.0082, lng: 28.9784, tz: 'Europe/Istanbul', locale: 'tr-TR', lang: 'tr-TR,tr;q=0.9,en;q=0.8' },
    netherlands: { lat: 52.3676, lng: 4.9041, tz: 'Europe/Amsterdam', locale: 'nl-NL', lang: 'nl-NL,nl;q=0.9,en;q=0.8' },
    switzerland: { lat: 47.3769, lng: 8.5417, tz: 'Europe/Zurich', locale: 'de-CH', lang: 'de-CH,de;q=0.9,fr;q=0.8,en;q=0.8' },
    portugal: { lat: 38.7223, lng: -9.1393, tz: 'Europe/Lisbon', locale: 'pt-PT', lang: 'pt-PT,pt;q=0.9,en;q=0.8' },
    sweden: { lat: 59.3293, lng: 18.0686, tz: 'Europe/Stockholm', locale: 'sv-SE', lang: 'sv-SE,sv;q=0.9,en;q=0.8' },
    norway: { lat: 59.9139, lng: 10.7522, tz: 'Europe/Oslo', locale: 'nb-NO', lang: 'nb-NO,nb;q=0.9,en;q=0.8' },
    denmark: { lat: 55.6761, lng: 12.5683, tz: 'Europe/Copenhagen', locale: 'da-DK', lang: 'da-DK,da;q=0.9,en;q=0.8' },
    finland: { lat: 60.1699, lng: 24.9384, tz: 'Europe/Helsinki', locale: 'fi-FI', lang: 'fi-FI,fi;q=0.9,en;q=0.8' },
    poland: { lat: 52.2297, lng: 21.0122, tz: 'Europe/Warsaw', locale: 'pl-PL', lang: 'pl-PL,pl;q=0.9,en;q=0.8' },
    austria: { lat: 48.2082, lng: 16.3738, tz: 'Europe/Vienna', locale: 'de-AT', lang: 'de-AT,de;q=0.9,en;q=0.8' },
    belgium: { lat: 50.8503, lng: 4.3517, tz: 'Europe/Brussels', locale: 'nl-BE', lang: 'nl-BE,nl;q=0.9,fr;q=0.8,en;q=0.8' },
    ireland: { lat: 53.3498, lng: -6.2603, tz: 'Europe/Dublin', locale: 'en-IE', lang: 'en-IE,en;q=0.9' },
    'south korea': { lat: 37.5665, lng: 126.978, tz: 'Asia/Seoul', locale: 'ko-KR', lang: 'ko-KR,ko;q=0.9,en;q=0.8' },
    china: { lat: 39.9042, lng: 116.4074, tz: 'Asia/Shanghai', locale: 'zh-CN', lang: 'zh-CN,zh;q=0.9,en;q=0.8' },
    russia: { lat: 55.7558, lng: 37.6173, tz: 'Europe/Moscow', locale: 'ru-RU', lang: 'ru-RU,ru;q=0.9,en;q=0.8' },
    argentina: { lat: -34.6037, lng: -58.3816, tz: 'America/Buenos_Aires', locale: 'es-AR', lang: 'es-AR,es;q=0.9,en;q=0.8' },
    chile: { lat: -33.4489, lng: -70.6693, tz: 'America/Santiago', locale: 'es-CL', lang: 'es-CL,es;q=0.9,en;q=0.8' },
    colombia: { lat: 4.711, lng: -74.0721, tz: 'America/Bogota', locale: 'es-CO', lang: 'es-CO,es;q=0.9,en;q=0.8' },
    egypt: { lat: 30.0444, lng: 31.2357, tz: 'Africa/Cairo', locale: 'ar-EG', lang: 'ar-EG,ar;q=0.9,en;q=0.8' },
    nigeria: { lat: 6.5244, lng: 3.3792, tz: 'Africa/Lagos', locale: 'en-NG', lang: 'en-NG,en;q=0.9' },
    kenya: { lat: -1.2921, lng: 36.8219, tz: 'Africa/Nairobi', locale: 'en-KE', lang: 'en-KE,en;q=0.9,sw;q=0.8' },
    bangladesh: { lat: 23.8103, lng: 90.4125, tz: 'Asia/Dhaka', locale: 'bn-BD', lang: 'bn-BD,bn;q=0.9,en;q=0.8' },
    pakistan: { lat: 24.8607, lng: 67.0011, tz: 'Asia/Karachi', locale: 'en-PK', lang: 'en-PK,en;q=0.9,ur;q=0.8' },
    nepal: { lat: 27.7172, lng: 85.324, tz: 'Asia/Kathmandu', locale: 'ne-NP', lang: 'ne-NP,ne;q=0.9,en;q=0.8' },
    'sri lanka': { lat: 6.9271, lng: 79.8612, tz: 'Asia/Colombo', locale: 'si-LK', lang: 'si-LK,si;q=0.9,en;q=0.8' },
    dubai: { lat: 25.2048, lng: 55.2708, tz: 'Asia/Dubai', locale: 'en-AE', lang: 'en-AE,en;q=0.9,ar;q=0.8' },
    'united arab emirates': { lat: 25.2048, lng: 55.2708, tz: 'Asia/Dubai', locale: 'en-AE', lang: 'en-AE,en;q=0.9,ar;q=0.8' },
    uk: { lat: 51.5074, lng: -0.1278, tz: 'Europe/London', locale: 'en-GB', lang: 'en-GB,en;q=0.9' },
    usa: { lat: 40.7128, lng: -74.006, tz: 'America/New_York', locale: 'en-US', lang: 'en-US,en;q=0.9' },
};
const countryAliases = {
    uk: 'united kingdom',
    usa: 'united states',
    us: 'united states',
    uae: 'uae',
    dubai: 'uae',
    'united arab emirates': 'uae',
    emirates: 'uae',
};
function resolveCountryProfile(country) {
    const key = country.toLowerCase().trim();
    const mapped = countryAliases[key] || key;
    return countryLocationMap[mapped] || countryLocationMap[key];
}
class BrowserManager {
    constructor() {
        this.browser = null;
        this.contexts = [];
        this.pageOwner = new Map();
        this.pageDiagnostics = new WeakMap();
        this.cleanupTimer = null;
        this.totalPagesCreated = 0;
        this.totalPagesClosed = 0;
        this.browserCrashes = 0;
        this.userAgentIndex = 0;
        this.launchAttempts = 0;
        this.maxLaunchAttempts = 5;
        this.lastLaunchAttemptTime = 0;
        this.backoffResetWindowMs = 120000;
        this.lockQueue = [];
        this.locked = false;
        this.startCleanupTimer();
        logger_1.logger.info({ maxContexts: MAX_CONTEXTS, maxPagesPerContext: MAX_PAGES_PER_CONTEXT, maxTotalPages: MAX_TOTAL_PAGES }, 'BrowserManager: Initialized');
    }
    async lock() {
        if (!this.locked) {
            this.locked = true;
            return () => this.unlock();
        }
        return new Promise(resolve => {
            this.lockQueue.push(() => {
                this.locked = true;
                resolve(() => this.unlock());
            });
        });
    }
    unlock() {
        if (this.lockQueue.length > 0) {
            const next = this.lockQueue.shift();
            next();
        }
        else {
            this.locked = false;
        }
    }
    async acquire(sourceName, _browserType) {
        const unlock = await this.lock();
        try {
            const browser = await this.ensureBrowserLocked();
            const ctx = await this.findOrCreateContextLocked();
            const page = await ctx.context.newPage();
            page.setDefaultTimeout(PAGE_TIMEOUT_MS);
            page.setDefaultNavigationTimeout(PAGE_TIMEOUT_MS);
            await this.setupPage(page);
            ctx.pages.add(page);
            this.pageOwner.set(page, ctx);
            ctx.lastUsed = Date.now();
            this.totalPagesCreated++;
            logger_1.logger.debug({
                source: sourceName, activePages: this.totalPagesCreated - this.totalPagesClosed,
                contextPages: ctx.pages.size, totalContexts: this.contexts.length,
            }, 'BrowserManager: Page acquired');
            return { page, browser, context: ctx.context };
        }
        finally {
            unlock();
        }
    }
    async acquireForCountry(sourceName, country) {
        const loc = resolveCountryProfile(country) || { lat: 40.7128, lng: -74.006, tz: 'America/New_York', locale: 'en-US', lang: 'en-US,en;q=0.9' };
        const stealthScript = buildStealthScript(loc.lang.split(',').map(l => l.split(';')[0].trim()));
        const unlock = await this.lock();
        try {
            const browser = await this.ensureBrowserLocked();
            const ua = USER_AGENTS[this.userAgentIndex++ % USER_AGENTS.length];
            const ctx = await browser.newContext({
                viewport: { width: 1920, height: 1080 },
                userAgent: ua,
                locale: loc.locale,
                timezoneId: loc.tz,
                ignoreHTTPSErrors: true,
                geolocation: { latitude: loc.lat, longitude: loc.lng },
                permissions: ['geolocation'],
                deviceScaleFactor: 1,
                screen: { width: 1920, height: 1080 },
                colorScheme: 'light',
                reducedMotion: 'no-preference',
                forcedColors: 'none',
                bypassCSP: true,
                extraHTTPHeaders: { 'Accept-Language': loc.lang },
            });
            await ctx.addInitScript(stealthScript);
            const page = await ctx.newPage();
            page.setDefaultTimeout(PAGE_TIMEOUT_MS);
            page.setDefaultNavigationTimeout(PAGE_TIMEOUT_MS);
            await this.setupPage(page);
            const managed = { context: ctx, pages: new Set([page]), lastUsed: Date.now() };
            this.contexts.push(managed);
            this.pageOwner.set(page, managed);
            this.totalPagesCreated++;
            logger_1.logger.debug({ source: sourceName, country, locale: loc.locale, tz: loc.tz }, 'BrowserManager: Page acquired with country context');
            return { page, browser, context: ctx };
        }
        finally {
            unlock();
        }
    }
    async acquireMultiple(sourceName, count, country) {
        const pages = [];
        try {
            for (let i = 0; i < count; i++) {
                if (country) {
                    pages.push(await this.acquireForCountry(`${sourceName}-${i}`, country));
                }
                else {
                    pages.push(await this.acquire(`${sourceName}-${i}`));
                }
            }
        }
        catch (err) {
            for (const p of pages) {
                try {
                    await this.release(p.page, sourceName);
                }
                catch { }
            }
            throw err;
        }
        return pages;
    }
    async acquireFresh(sourceName) {
        const unlock = await this.lock();
        try {
            const browser = await this.ensureBrowserLocked();
            let ctx = this.contexts.find((c) => c.pages.size < MAX_PAGES_PER_CONTEXT);
            if (!ctx)
                ctx = await this.createContextLocked();
            const page = await ctx.context.newPage();
            page.setDefaultTimeout(PAGE_TIMEOUT_MS);
            page.setDefaultNavigationTimeout(PAGE_TIMEOUT_MS);
            await this.setupPage(page);
            ctx.pages.add(page);
            this.pageOwner.set(page, ctx);
            ctx.lastUsed = Date.now();
            this.totalPagesCreated++;
            logger_1.logger.debug({
                source: sourceName, totalContexts: this.contexts.length,
                reusedContext: !!ctx,
            }, 'BrowserManager: Fresh page acquired with existing persistent context');
            return { page, browser, context: ctx.context };
        }
        finally {
            unlock();
        }
    }
    async release(page, _sourceName) {
        const unlock = await this.lock();
        try {
            const ctx = this.pageOwner.get(page);
            if (!ctx)
                return;
            ctx.pages.delete(page);
            this.pageOwner.delete(page);
            ctx.lastUsed = Date.now();
            try {
                await page.close();
                this.totalPagesClosed++;
            }
            catch { }
            logger_1.logger.debug({ remainingPages: ctx.pages.size, totalClosed: this.totalPagesClosed }, 'BrowserManager: Page released');
        }
        finally {
            unlock();
        }
    }
    async releaseAll(pages, sourceName) {
        for (const p of pages) {
            try {
                await this.release(p, sourceName);
            }
            catch { }
        }
    }
    async releaseAllActive() {
        const unlock = await this.lock();
        try {
            for (const ctx of this.contexts) {
                for (const page of [...ctx.pages]) {
                    try {
                        await page.close();
                        this.totalPagesClosed++;
                    }
                    catch { }
                    this.pageOwner.delete(page);
                }
                ctx.pages.clear();
                ctx.lastUsed = Date.now();
            }
        }
        finally {
            unlock();
        }
    }
    async shutdown() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        const unlock = await this.lock();
        try {
            const contextCount = this.contexts.length;
            const pageCount = this.totalPagesCreated - this.totalPagesClosed;
            for (const ctx of this.contexts) {
                for (const page of [...ctx.pages]) {
                    try {
                        await page.close();
                        this.totalPagesClosed++;
                    }
                    catch { }
                }
                ctx.pages.clear();
                this.pageOwner.clear();
                try {
                    await ctx.context.close();
                }
                catch { }
            }
            this.contexts = [];
            if (this.browser) {
                try {
                    await this.browser.close();
                    logger_1.logger.info({}, 'BrowserManager: Browser closed');
                }
                catch { }
                this.browser = null;
            }
            logger_1.logger.info({
                contextsClosed: contextCount,
                pagesClosed: pageCount,
            }, 'BrowserManager: Shutdown complete');
        }
        finally {
            unlock();
        }
    }
    async reset() {
        logger_1.logger.info({
            pagesCreated: this.totalPagesCreated,
            pagesClosed: this.totalPagesClosed,
            contexts: this.contexts.length,
            browserCrashes: this.browserCrashes,
        }, 'BrowserManager: Resetting — shutting down and restarting');
        await this.shutdown();
        this.startCleanupTimer();
        logger_1.logger.info({}, 'BrowserManager: Reset complete — browser closed and cleanup timer restarted');
    }
    getStatus() {
        const activePages = this.totalPagesCreated - this.totalPagesClosed;
        const mem = process.memoryUsage();
        return {
            browserAlive: this.browser !== null && this.browser.isConnected(),
            contexts: this.contexts.length,
            activePages,
            totalPagesCreated: this.totalPagesCreated,
            totalPagesClosed: this.totalPagesClosed,
            browserCrashes: this.browserCrashes,
            memoryUsageMB: Math.round(mem.heapUsed / 1024 / 1024),
        };
    }
    async ensureBrowserLocked() {
        if (this.browser && this.browser.isConnected())
            return this.browser;
        return this.launchBrowserLocked();
    }
    async launchBrowserLocked() {
        if (this.browser) {
            this.browserCrashes++;
            logger_1.logger.warn({ crashes: this.browserCrashes }, 'BrowserManager: Browser disconnected — cleaning up and relaunching');
            for (const ctx of this.contexts) {
                for (const page of [...ctx.pages]) {
                    try {
                        await page.close();
                        this.totalPagesClosed++;
                    }
                    catch { }
                }
                ctx.pages.clear();
                this.pageOwner.clear();
                try {
                    await ctx.context.close();
                }
                catch { }
            }
            this.contexts = [];
            try {
                await this.browser.close();
                logger_1.logger.info({ crashes: this.browserCrashes }, 'BrowserManager: Crashed browser closed');
            }
            catch { }
            this.browser = null;
        }
        const now = Date.now();
        if (now - this.lastLaunchAttemptTime > this.backoffResetWindowMs) {
            this.launchAttempts = 0;
            logger_1.logger.debug({}, 'BrowserManager: Launch attempt counter reset after cooldown');
        }
        this.lastLaunchAttemptTime = now;
        this.launchAttempts++;
        if (this.launchAttempts > this.maxLaunchAttempts) {
            const cooldownUntil = new Date(now + this.backoffResetWindowMs).toISOString();
            logger_1.logger.error({
                attempts: this.launchAttempts,
                maxAttempts: this.maxLaunchAttempts,
                cooldownUntil,
            }, 'BrowserManager: Max launch attempts reached. Will retry after cooldown window.');
            throw new Error(`BrowserManager: Browser launch failed ${this.maxLaunchAttempts} times. ` +
                `Will retry automatically after cooldown.`);
        }
        const backoffDelay = Math.min(1000 * Math.pow(2, this.launchAttempts - 1), 30000);
        if (this.launchAttempts > 1) {
            logger_1.logger.info({
                attempt: this.launchAttempts,
                maxAttempts: this.maxLaunchAttempts,
                delayMs: backoffDelay,
            }, `BrowserManager: Waiting ${backoffDelay}ms before retry ${this.launchAttempts}/${this.maxLaunchAttempts}`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
        let executablePath;
        let executableExists = false;
        try {
            const { chromium: pwChromium } = await Promise.resolve().then(() => __importStar(require('playwright')));
            executablePath = pwChromium.executablePath();
            executableExists = (0, fs_1.existsSync)(executablePath);
        }
        catch {
            executablePath = '(could not resolve)';
        }
        if (!(0, fs_1.existsSync)(PERSISTENT_PROFILE_DIR))
            (0, fs_1.mkdirSync)(PERSISTENT_PROFILE_DIR, { recursive: true });
        logger_1.logger.info({
            attempt: this.launchAttempts,
            executablePath,
            executableExists,
            cwd: process.cwd(),
            browsersPathEnv: process.env.PLAYWRIGHT_BROWSERS_PATH || '(not set)',
            launchTimeout: BROWSER_LAUNCH_TIMEOUT_MS,
            chromiumArgs: CHROMIUM_ARGS,
            persistentProfile: PERSISTENT_PROFILE_DIR,
        }, 'BrowserManager: Launching Chromium with persistent profile');
        try {
            const browserContext = await playwright_1.chromium.launchPersistentContext(PERSISTENT_PROFILE_DIR, {
                headless: process.env.PLAYWRIGHT_HEADLESS !== '0' && process.env.PW_HEADLESS !== '0',
                args: CHROMIUM_ARGS,
                timeout: BROWSER_LAUNCH_TIMEOUT_MS,
                viewport: { width: 1920, height: 1080 },
                ignoreHTTPSErrors: true,
                locale: 'en-US',
                timezoneId: 'America/New_York',
                userAgent: USER_AGENTS[this.userAgentIndex++ % USER_AGENTS.length],
                geolocation: { latitude: 40.7128, longitude: -74.006 },
                permissions: ['geolocation'],
                deviceScaleFactor: 1,
                screen: { width: 1920, height: 1080 },
                colorScheme: 'light',
                reducedMotion: 'no-preference',
                forcedColors: 'none',
                bypassCSP: true,
                extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
            });
            const launchedBrowser = browserContext.browser();
            if (!launchedBrowser)
                throw new Error('BrowserManager: No browser associated with persistent context');
            await browserContext.addInitScript(buildStealthScript(['en-US', 'en']));
            launchedBrowser.on('disconnected', () => {
                logger_1.logger.warn({}, 'BrowserManager: Browser disconnected');
                this.browser = null;
            });
            this.browser = launchedBrowser;
            this.contexts.push({ context: browserContext, pages: new Set(), lastUsed: Date.now() });
            this.launchAttempts = 0;
            logger_1.logger.info({
                executablePath,
                launchedWithPersistentProfile: true,
                contextCount: launchedBrowser.contexts().length,
            }, 'BrowserManager: Browser launched successfully');
            return launchedBrowser;
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            logger_1.logger.error({
                err: msg,
                attempt: this.launchAttempts,
                executablePath,
                executableExists,
                browsersPathEnv: process.env.PLAYWRIGHT_BROWSERS_PATH || '(not set)',
                cwd: process.cwd(),
                persistentProfile: PERSISTENT_PROFILE_DIR,
            }, 'BrowserManager: Launch failed');
            throw error;
        }
    }
    async findOrCreateContextLocked() {
        for (const ctx of this.contexts) {
            if (ctx.pages.size < MAX_PAGES_PER_CONTEXT)
                return ctx;
        }
        if (this.contexts.length < MAX_CONTEXTS && (this.totalPagesCreated - this.totalPagesClosed) < MAX_TOTAL_PAGES) {
            return this.createContextLocked();
        }
        throw new Error(`BrowserManager: All ${MAX_CONTEXTS} contexts at capacity (${this.totalPagesCreated - this.totalPagesClosed}/${MAX_TOTAL_PAGES} pages)`);
    }
    async createContextLocked(country) {
        if (!this.browser)
            throw new Error('BrowserManager: No browser');
        const ua = USER_AGENTS[this.userAgentIndex++ % USER_AGENTS.length];
        const loc = country
            ? (resolveCountryProfile(country) || { lat: 40.7128, lng: -74.006, tz: 'America/New_York', locale: 'en-US', lang: 'en-US,en;q=0.9' })
            : { lat: 23.0225, lng: 72.5714, tz: 'Asia/Kolkata', locale: 'en-IN', lang: 'en-IN,en-GB;q=0.9,en;q=0.8,hi;q=0.7' };
        const stealthScript = buildStealthScript(loc.lang.split(',').map(l => l.split(';')[0].trim()));
        const context = await this.browser.newContext({
            viewport: { width: 1920, height: 1080 },
            userAgent: ua,
            locale: loc.locale,
            timezoneId: loc.tz,
            ignoreHTTPSErrors: true,
            geolocation: { latitude: loc.lat, longitude: loc.lng },
            permissions: ['geolocation'],
            deviceScaleFactor: 1,
            screen: { width: 1920, height: 1080 },
            colorScheme: 'light',
            reducedMotion: 'no-preference',
            forcedColors: 'none',
            bypassCSP: true,
            extraHTTPHeaders: {
                'Accept-Language': loc.lang,
            },
        });
        await context.addInitScript(stealthScript);
        const managed = { context, pages: new Set(), lastUsed: Date.now() };
        this.contexts.push(managed);
        logger_1.logger.debug({ totalContexts: this.contexts.length, country: country || 'india' }, 'BrowserManager: Context created');
        return managed;
    }
    async setupPage(page) {
        const diagnostics = { console: [], requests: [] };
        this.pageDiagnostics.set(page, diagnostics);
        page.on('console', (message) => {
            try {
                diagnostics.console.push(`${message.type()}: ${message.text()}`);
            }
            catch (err) {
                logger_1.logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'BrowserManager: console handler error');
            }
        });
        page.on('request', (request) => {
            try {
                diagnostics.requests.push({
                    url: request.url(),
                    method: request.method(),
                    resourceType: request.resourceType(),
                });
            }
            catch (err) {
                logger_1.logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'BrowserManager: request handler error');
            }
        });
        page.on('requestfinished', async (request) => {
            try {
                const response = await request.response();
                if (response && typeof response.status === 'function') {
                    diagnostics.requests.push({
                        url: request.url(),
                        method: request.method(),
                        resourceType: request.resourceType(),
                        status: response.status(),
                    });
                }
                else {
                    diagnostics.requests.push({
                        url: request.url(),
                        method: request.method(),
                        resourceType: request.resourceType(),
                    });
                }
            }
            catch (err) {
                logger_1.logger.warn({ err: err instanceof Error ? err.message : String(err), url: request.url() }, 'BrowserManager: requestfinished handler error');
            }
        });
        page.on('requestfailed', (request) => {
            try {
                diagnostics.requests.push({
                    url: request.url(),
                    method: request.method(),
                    resourceType: request.resourceType(),
                });
            }
            catch (err) {
                logger_1.logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'BrowserManager: requestfailed handler error');
            }
        });
        await page.route('**/*', async (route) => {
            try {
                const url = route.request().url().toLowerCase();
                const resourceType = route.request().resourceType();
                if (BLOCKED_RESOURCE_TYPES.has(resourceType)) {
                    await route.abort();
                    return;
                }
                for (const domain of BLOCKED_DOMAINS) {
                    if (url.includes(domain)) {
                        await route.abort();
                        return;
                    }
                }
                await route.continue();
            }
            catch {
                try {
                    await route.continue();
                }
                catch { }
            }
        });
    }
    getPageDiagnostics(page) {
        return this.pageDiagnostics.get(page);
    }
    startCleanupTimer() {
        this.cleanupTimer = setInterval(async () => {
            const unlock = await this.lock();
            try {
                if (this.browser && !this.browser.isConnected()) {
                    logger_1.logger.warn({}, 'BrowserManager: Browser disconnected during cleanup');
                    this.browser = null;
                }
                const now = Date.now();
                for (let i = this.contexts.length - 1; i >= 0; i--) {
                    const ctx = this.contexts[i];
                    if (ctx.pages.size === 0 && (now - ctx.lastUsed) > BROWSER_IDLE_TIMEOUT_MS) {
                        try {
                            await ctx.context.close();
                        }
                        catch { }
                        this.contexts.splice(i, 1);
                        logger_1.logger.debug({ remainingContexts: this.contexts.length }, 'BrowserManager: Idle context cleaned');
                    }
                }
            }
            finally {
                unlock();
            }
        }, CLEANUP_INTERVAL_MS);
    }
}
exports.BrowserManager = BrowserManager;
exports.browserManager = new BrowserManager();
//# sourceMappingURL=browser-manager.js.map