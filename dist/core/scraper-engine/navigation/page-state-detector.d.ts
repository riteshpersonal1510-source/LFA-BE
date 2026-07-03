import { Page } from 'playwright';
export declare enum PageState {
    COOKIE_CONSENT = "COOKIE_CONSENT",
    SIGN_IN = "SIGN_IN",
    CAPTCHA = "CAPTCHA",
    SEARCH_PAGE = "SEARCH_PAGE",
    RESULTS_LIST = "RESULTS_LIST",
    BUSINESS_DETAIL = "BUSINESS_DETAIL",
    EMPTY_RESULTS = "EMPTY_RESULTS",
    ERROR_PAGE = "ERROR_PAGE",
    RATE_LIMITED = "RATE_LIMITED",
    UNKNOWN = "UNKNOWN"
}
interface DetectionResult {
    state: PageState;
    confidence: number;
    evidence?: string;
}
export declare function detectPageState(page: Page): Promise<DetectionResult>;
export declare function dismissConsent(page: Page): Promise<boolean>;
export declare function handleCaptcha(page: Page): Promise<'resolved' | 'waiting' | 'not_found'>;
export declare function dismissSignIn(page: Page): Promise<boolean>;
export declare function getBusinessCardCount(page: Page): Promise<number>;
export {};
//# sourceMappingURL=page-state-detector.d.ts.map