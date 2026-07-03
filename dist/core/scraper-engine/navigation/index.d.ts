import { NavigationEngine } from './navigation-engine';
export type { NavigationEngineResult, NavigationInput } from './navigation-engine';
export { PageState } from './page-state-detector';
export { buildSearchQuery, buildFallbackQueries, buildBaseMapsUrl, getTld, getCountryName, COUNTRY_TLD_MAP, COUNTRY_NAMES } from './url-builder';
export type { BuiltQuery } from './url-builder';
export { detectPageState, dismissConsent, dismissSignIn, handleCaptcha, getBusinessCardCount } from './page-state-detector';
export { FallbackCascade } from './fallback-cascade';
export type { CascadeResult } from './fallback-cascade';
export { waitForResultsFeed, waitForBusinessCards, waitForSearchBox, waitForPageStable, waitForDetailPanel, waitForNavigationComplete, waitForContentStable, waitForListUpdate, } from './wait-strategy';
export { NavigationEngine };
export declare const navigationEngine: NavigationEngine;
//# sourceMappingURL=index.d.ts.map