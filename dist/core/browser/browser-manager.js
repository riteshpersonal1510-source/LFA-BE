"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserManager = void 0;
const playwright_1 = require("playwright");
const logger_1 = require("../../utils/logger");
const chrome_profile_1 = require("./chrome-profile");
const os_1 = require("os");
const path_1 = require("path");
const CDP_PORT = 9222;
const DEFAULT_TIMEOUT = 60000;
const NAV_TIMEOUT = 90000;
class BrowserManager {
    constructor() { }
    static getInstance() {
        if (!BrowserManager.instance) {
            BrowserManager.instance = new BrowserManager();
        }
        return BrowserManager.instance;
    }
    async findWhatsAppPage(context) {
        for (const existingPage of context.pages()) {
            try {
                if (existingPage.isClosed())
                    continue;
                const url = existingPage.url();
                if (url.includes('web.whatsapp.com')) {
                    logger_1.logger.info({ url }, 'BrowserManager: Reusing existing WhatsApp Web tab');
                    return existingPage;
                }
            }
            catch {
                continue;
            }
        }
        return null;
    }
    configurePage(page) {
        page.setDefaultTimeout(DEFAULT_TIMEOUT);
        page.setDefaultNavigationTimeout(NAV_TIMEOUT);
        page.on('pageerror', (err) => {
            logger_1.logger.error({ err: err.message }, 'BrowserManager: Page error in connected Chrome');
        });
    }
    async getWhatsAppPage(context) {
        return this.findWhatsAppPage(context);
    }
    async connectCDP(port = CDP_PORT, preferWhatsAppTab = false) {
        try {
            const available = await (0, chrome_profile_1.checkChromeCdpAvailability)(port);
            if (!available)
                return null;
            logger_1.logger.info({ port, preferWhatsAppTab }, 'BrowserManager: Connecting to Chrome via CDP');
            const browser = await playwright_1.chromium.connectOverCDP(`http://127.0.0.1:${port}`);
            const contexts = browser.contexts();
            const context = contexts.length > 0
                ? contexts[0]
                : await browser.newContext();
            let page = null;
            if (preferWhatsAppTab) {
                page = await this.findWhatsAppPage(context);
            }
            if (!page) {
                page = await context.newPage();
                logger_1.logger.info('BrowserManager: Created new tab in existing Chrome');
            }
            this.configurePage(page);
            logger_1.logger.info('BrowserManager: Connected to existing Chrome');
            return {
                browser,
                context,
                page,
                isExistingChrome: true,
            };
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            logger_1.logger.warn({ err: msg }, 'BrowserManager: CDP connection failed');
            return null;
        }
    }
    async launchWithProfile(profile) {
        const detectedProfile = profile || (0, chrome_profile_1.detectChromeProfile)();
        if (!detectedProfile) {
            logger_1.logger.info('BrowserManager: No system Chrome found, falling back to bundled Chromium');
            try {
                const browser = await playwright_1.chromium.launch({
                    headless: false,
                    args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1280,900'],
                });
                const context = await browser.newContext();
                const page = await context.newPage();
                page.setDefaultTimeout(DEFAULT_TIMEOUT);
                page.setDefaultNavigationTimeout(NAV_TIMEOUT);
                page.on('pageerror', (err) => {
                    logger_1.logger.error({ err: err.message }, 'BrowserManager: Page error in bundled Chromium');
                });
                logger_1.logger.info('BrowserManager: Bundled Chromium launched (no system Chrome)');
                return {
                    session: {
                        browser,
                        context,
                        page,
                        isExistingChrome: false,
                    },
                };
            }
            catch (fallbackError) {
                const fbMsg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
                return {
                    session: null,
                    error: `No Chrome found and bundled Chromium failed: ${fbMsg}`,
                    errorType: 'launch-failed',
                    instructions: ['Install Google Chrome from https://www.google.com/chrome/'],
                };
            }
        }
        if (detectedProfile.isRunning) {
            const cdpSession = await this.connectCDP();
            if (cdpSession) {
                return { session: cdpSession };
            }
            logger_1.logger.info('BrowserManager: Chrome locked, trying system Chrome with temp profile...');
            const systemChromeResult = await this.launchSystemChromeTempProfile(detectedProfile);
            if (systemChromeResult.session) {
                return systemChromeResult;
            }
            logger_1.logger.info('BrowserManager: Trying bundled Chromium as last fallback...');
            try {
                const browser = await playwright_1.chromium.launch({
                    headless: false,
                    args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1280,900'],
                });
                const context = await browser.newContext();
                const page = await context.newPage();
                page.setDefaultTimeout(DEFAULT_TIMEOUT);
                page.setDefaultNavigationTimeout(NAV_TIMEOUT);
                page.on('pageerror', (err) => {
                    logger_1.logger.error({ err: err.message }, 'BrowserManager: Page error in bundled Chromium');
                });
                logger_1.logger.info('BrowserManager: Bundled Chromium launched successfully as fallback');
                return {
                    session: {
                        browser,
                        context,
                        page,
                        isExistingChrome: false,
                    },
                };
            }
            catch (fallbackError) {
                const fbMsg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
                logger_1.logger.error({ err: fbMsg }, 'BrowserManager: All browser launch methods failed');
                return {
                    session: null,
                    error: `Chrome is locked. Tried: temp profile (${systemChromeResult.error || 'failed'}), bundled Chromium (${fbMsg})`,
                    errorType: 'launch-failed',
                    instructions: [
                        `Close all Chrome windows and try again.`,
                        `Or run: npx playwright install`,
                        `Then restart the application.`,
                    ],
                };
            }
        }
        try {
            logger_1.logger.info({ executable: detectedProfile.executablePath, profile: detectedProfile.profileName }, 'BrowserManager: Launching Chrome with existing profile');
            const browser = await playwright_1.chromium.launch({
                headless: false,
                executablePath: detectedProfile.executablePath,
                args: [
                    `--user-data-dir=${detectedProfile.userDataDir}`,
                    `--profile-directory=${detectedProfile.profileName}`,
                    '--no-sandbox',
                    '--disable-dev-shm-usage',
                    '--window-size=1280,900',
                ],
            });
            const context = browser.contexts()[0] || await browser.newContext();
            const page = await context.newPage();
            page.setDefaultTimeout(DEFAULT_TIMEOUT);
            page.setDefaultNavigationTimeout(NAV_TIMEOUT);
            page.on('pageerror', (err) => {
                logger_1.logger.error({ err: err.message }, 'BrowserManager: Page error');
            });
            logger_1.logger.info('BrowserManager: Chrome launched with existing profile');
            return {
                session: {
                    browser,
                    context,
                    page,
                    isExistingChrome: false,
                    profile: detectedProfile,
                },
            };
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            logger_1.logger.error({ err: msg }, 'BrowserManager: Failed to launch Chrome with profile, trying temp profile...');
            const tempResult = await this.launchSystemChromeTempProfile(detectedProfile);
            if (tempResult.session) {
                return tempResult;
            }
            return {
                session: null,
                error: `Failed to launch Chrome: ${msg}. Temp profile fallback also failed: ${tempResult.error}`,
                errorType: 'launch-failed',
                instructions: [
                    'Make sure Chrome is properly installed.',
                    'Close any running Chrome instances and try again.',
                    'Check if your Chrome profile is not corrupted.',
                ],
            };
        }
    }
    async launchSystemChromeTempProfile(profile) {
        const tempProfileDir = (0, path_1.join)((0, os_1.tmpdir)(), `whatsapp-temp-profile-${Date.now()}`);
        try {
            logger_1.logger.info({ executable: profile.executablePath, tempProfile: tempProfileDir }, 'BrowserManager: Launching system Chrome with temp profile');
            const context = await playwright_1.chromium.launchPersistentContext(tempProfileDir, {
                headless: false,
                executablePath: profile.executablePath,
                args: [
                    '--no-sandbox',
                    '--disable-dev-shm-usage',
                    '--window-size=1280,900',
                    '--no-first-run',
                    '--no-default-browser-check',
                ],
            });
            const browser = context.browser();
            if (!browser)
                throw new Error('launchPersistentContext returned null browser');
            const pages = context.pages();
            const page = pages.length > 0 ? pages[0] : await context.newPage();
            page.setDefaultTimeout(DEFAULT_TIMEOUT);
            page.setDefaultNavigationTimeout(NAV_TIMEOUT);
            page.on('pageerror', (err) => {
                logger_1.logger.error({ err: err.message }, 'BrowserManager: Page error in system Chrome temp profile');
            });
            logger_1.logger.info('BrowserManager: System Chrome launched with temp profile');
            return {
                session: {
                    browser,
                    context,
                    page,
                    isExistingChrome: false,
                    profile,
                },
            };
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            logger_1.logger.error({ err: msg, tempProfile: tempProfileDir }, 'BrowserManager: System Chrome temp profile launch failed');
            return {
                session: null,
                error: `System Chrome temp profile failed: ${msg}`,
                errorType: 'launch-failed',
            };
        }
    }
    async getOrCreateSession(profile) {
        const cdpSession = await this.connectCDP();
        if (cdpSession) {
            return { session: cdpSession };
        }
        return await this.launchWithProfile(profile);
    }
}
exports.BrowserManager = BrowserManager;
//# sourceMappingURL=browser-manager.js.map