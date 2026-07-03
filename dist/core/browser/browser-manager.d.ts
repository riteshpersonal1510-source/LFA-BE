import { Browser, BrowserContext, Page } from 'playwright';
import { type ChromeProfile } from './chrome-profile';
export interface BrowserSession {
    browser: Browser;
    context: BrowserContext;
    page: Page;
    isExistingChrome: boolean;
    profile?: ChromeProfile;
}
export interface BrowserLaunchResult {
    session: BrowserSession | null;
    error?: string;
    errorType?: 'no-chrome' | 'profile-locked' | 'launch-failed' | 'cdp-failed';
    instructions?: string[];
}
export declare class BrowserManager {
    private static instance;
    private constructor();
    static getInstance(): BrowserManager;
    private findWhatsAppPage;
    private configurePage;
    getWhatsAppPage(context: BrowserContext): Promise<Page | null>;
    connectCDP(port?: number, preferWhatsAppTab?: boolean): Promise<BrowserSession | null>;
    launchWithProfile(profile?: ChromeProfile): Promise<BrowserLaunchResult>;
    private launchSystemChromeTempProfile;
    getOrCreateSession(profile?: ChromeProfile): Promise<BrowserLaunchResult>;
}
//# sourceMappingURL=browser-manager.d.ts.map