import type { Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { logger } from '../../../../utils/logger';
import { browserManager } from '../../browser-manager';
import { leadStorage } from '../../lead-storage';
import type { ScraperLead, ScraperResult, ScrapeContext, ScraperOptions } from '../../types';
import { searchStatus } from '../../../../services/search-status.service';
import { resumeStateService } from '../../../../services/resume-state.service';
import { extractEmailsFromHtml } from '../../../../utils/email-extract';
import { buildMapsSearchQuery } from '../../../../utils/location-query-builder';
import { NavigationEngine, NavigationInput, PageState } from '../../navigation/navigation-engine';

const DETAIL_TIMEOUT = 45000;
const BATCH_FLUSH_SIZE = 25;
const BATCH_FLUSH_INTERVAL_MS = 2000;
const DETAIL_CONTENT_TIMEOUT = 25000;
const DEFAULT_WORKERS = 5;
const MAX_END_REPEATS = 8;
const RESUME_SAVE_INTERVAL = 25;
const PROGRESS_REPORT_INTERVAL_MS = 1500;
const SCROLL_PAUSE_MS = 2000;
const SCROLL_SAFETY_CAP = 10000;
const IDLE_SCROLL_END_THRESHOLD = 15;

const END_OF_LIST_PATTERNS = [
  /reached the end|end of the list|no more results|that's all|you.?ve reached the end/i,
  /fin de la liste|plus de r[eé]sultats|vous avez atteint la fin/i,
  /ende der liste|keine weiteren ergebnisse|listenende/i,
  /fine dell.?elenco|non ci sono altri risultati|fine dei risultati/i,
  /リストの末尾|これ以上結果|リストの終わり/i,
  /목록의 끝|더 이상 결과|목록 끝/i,
  /fim da lista|n[aã]o h[aá] mais resultados/i,
  /конец списка|больше нет результатов/i,
  /نهاية القائمة|لا مزيد من النتائج|انتهت القائمة/i,
  /列表结束|没有更多结果|已到达列表末尾/i,
];

function isEndOfListText(text: string): boolean {
  return END_OF_LIST_PATTERNS.some(pattern => pattern.test(text));
}

interface BlockInfo {
  blocked: boolean;
  type: string;
  url: string;
  title: string;
}

interface FeedMetrics {
  childCount: number;
  placeLinkCount: number;
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  endOfListVisible: boolean;
  endOfListText: boolean;
}

const DEBUG_DIR = path.resolve(process.cwd(), 'debug-screenshots');

function ensureDebugDir(): void {
  if (!fs.existsSync(DEBUG_DIR)) fs.mkdirSync(DEBUG_DIR, { recursive: true });
}

interface ProfilingSnapshot {
  phase: string;
  elapsed: number;
  cardsCollected: number;
  leadsSaved: number;
  workersActive: number;
  queueDepth: number;
}

interface ProfilingTiming {
  browserStart: number;
  pageLoadMs: number;
  feedReadyMs: number;
  firstScrollMs: number;
  firstCardMs: number;
  lastCardMs: number;
  scrollEndMs: number;
  phase2StartMs: number;
  phase2EndMs: number;
}

export class GoogleMapsScraper {
  private navigationEngine = new NavigationEngine();
  getProfile(): ProfilingSnapshot[] { return this.lastProfile; }
  private lastProfile: ProfilingSnapshot[] = [];

  async scrape(options: ScraperOptions & { semanticKeyword?: string }): Promise<ScraperResult> {
    const {
      keyword, location = '', state, city, area, country, businessType, sessionId, semanticKeyword,
      skipSearchTracking, onStageChange,
    } = options;

    const reportStage = async (stage: string, message: string) => {
      if (skipSearchTracking) { await onStageChange?.(stage, message); }
      else if (sessionId) { searchStatus.updateStage(sessionId, stage); searchStatus.addLog(sessionId, message, 'info'); }
    };

    if (!keyword || keyword.trim().length === 0) {
      return { success: false, message: 'Invalid keyword', totalExtracted: 0, totalStored: 0, totalDuplicates: 0, leads: [], sourceResults: [] };
    }

    const { searchQuery } = buildMapsSearchQuery(businessType || keyword, {
      area, city, state, country, location,
    });
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;
    logger.info({ searchQuery, searchUrl, country, state, city, area, businessType: businessType || keyword }, 'GoogleMaps: Search query generated');
    this.lastActiveOptions = options;
    const profileLog: ProfilingSnapshot[] = [];
    this.lastProfile = profileLog;
    const startTs = Date.now();
    const concurrency = options.detailConcurrency || DEFAULT_WORKERS;
    const profile = (phase: string, cards: number, saved: number, queue: number) => {
      profileLog.push({ phase, elapsed: Date.now() - startTs, cardsCollected: cards, leadsSaved: saved, workersActive: Math.min(concurrency, queue), queueDepth: queue });
    };

    const allScrapedNames = new Set<string>();
    const allScrapedPlaceIds = new Set<string>();
    let totalDuplicates = 0;
    let leadsSaved = 0;

    const profiling = {
      browserStart: 0, pageLoadMs: 0, feedReadyMs: 0,
      firstScrollMs: 0, firstCardMs: 0, lastCardMs: 0,
      scrollEndMs: 0, phase2StartMs: 0, phase2EndMs: 0,
    };

    const context: ScrapeContext = {
      sessionId: sessionId || `gm_${Date.now()}`,
      keyword, location, state, city, area, country,
      businessType: businessType || keyword,
      sources: ['google-maps'],
      fullSearchQuery: searchQuery,
      semanticKeyword,
    };

    const cardQueue: ScraperLead[] = [];
    let queueIndex = 0;
    let phase1Done = false;
    let phase1Error: Error | null = null;
    const allLeads: ScraperLead[] = [];

    let searchPage: Page | null = null;
    let detailPages: Page[] = [];

    try {
      await reportStage('opening-maps', `Searching ${context.businessType}...`);

      profiling.browserStart = Date.now();
      const acquired = country
        ? await browserManager.acquireForCountry('google-maps', country)
        : await browserManager.acquire('google-maps');
      searchPage = acquired.page;
      profiling.pageLoadMs = Date.now() - profiling.browserStart;

      const navInput: NavigationInput = {
        keyword: businessType || keyword,
        area: area || '',
        city: city || '',
        state: state || '',
        country: country || 'india',
      };

      let navResult = await this.navigationEngine.navigateToResults(searchPage, navInput);

      if (!navResult.success && navResult.pageState === PageState.SIGN_IN) {
        await browserManager.release(searchPage, 'google-maps');
        searchPage = null;

        const MAX_SIGNIN_RETRIES = 3;
        let signinSuccess = false;

        for (let attempt = 1; attempt <= MAX_SIGNIN_RETRIES; attempt++) {
          logger.warn({
            attempt, maxRetries: MAX_SIGNIN_RETRIES,
          }, `GoogleMaps: SIGN_IN detected — retry ${attempt}/${MAX_SIGNIN_RETRIES}`);

          const retryCountry = options.country || country || 'united states';
          const fresh = await browserManager.acquireForCountry('google-maps-retry', retryCountry);
          searchPage = fresh.page;

          await this.warmupPage(searchPage);

          try {
            await searchPage.context().clearCookies();
            await searchPage.evaluate(() => {
              try { localStorage.clear(); } catch {}
              try { sessionStorage.clear(); } catch {}
            }).catch(() => {});
          } catch {}

          navResult = await this.navigationEngine.navigateToResults(searchPage, navInput);
          if (navResult.success) {
            logger.info({ attempt }, 'GoogleMaps: SIGN_IN retry succeeded via Navigation Engine');
            signinSuccess = true;
            break;
          }

          await this.captureDebugEvidence(searchPage, `signin-retry-${attempt}`, {
            blocked: true, type: 'SIGN_IN', url: navResult.url, title: navResult.failureReason || 'Sign-in',
          });

          if (attempt < MAX_SIGNIN_RETRIES) {
            await browserManager.release(searchPage, 'google-maps');
            searchPage = null;
            await new Promise(r => setTimeout(r, 2000));
          }
        }

        if (!signinSuccess) {
          if (searchPage) {
            await this.captureScreenshot(searchPage, 'blocked-signin-final', {
              blocked: true, type: 'SIGN_IN', url: navResult.url, title: navResult.failureReason || 'Sign-in',
            });
            await browserManager.release(searchPage, 'google-maps');
            searchPage = null;
          }
          return this.blockedResult({ blocked: true, type: 'SIGN_IN', url: navResult.url, title: navResult.failureReason || 'Sign-in required' });
        }
      }

      if (!navResult.success) {
        if (searchPage) {
          await this.captureScreenshot(searchPage, 'navigation-engine-failed', {
            blocked: true, type: String(navResult.pageState), url: navResult.url,
            title: navResult.failureReason || 'Navigation Engine failed',
          });
        }
        logger.warn({
          country, state, city, area,
          keyword: businessType || keyword,
          searchQuery,
          pageState: navResult.pageState,
          pageUrl: navResult.url,
          failureReason: navResult.failureReason,
          strategyUsed: navResult.strategyUsed,
        }, 'GoogleMaps: Navigation Engine failed');
        return {
          success: false, message: `Google Maps navigation failed: ${navResult.failureReason || navResult.pageState}`,
          totalExtracted: 0, totalStored: 0, totalDuplicates: 0, leads: [],
          sourceResults: [{ source: 'google-maps', totalStored: 0, totalExtracted: 0, totalDuplicates: 0, success: false, error: `Navigation failed: ${navResult.failureReason || navResult.pageState}` }],
        };
      }

      if (!searchPage) {
        return { success: false, message: 'Lost search page after navigation', totalExtracted: 0, totalStored: 0, totalDuplicates: 0, leads: [], sourceResults: [{ source: 'google-maps', totalStored: 0, totalExtracted: 0, totalDuplicates: 0, success: false, error: 'Lost search page' }] };
      }

      profiling.feedReadyMs = Date.now() - profiling.browserStart;
      logger.info({
        country: country || 'india',
        state: state || '',
        city: city || '',
        area: area || '',
        keyword: businessType || keyword,
        searchQuery,
        pageState: navResult.pageState,
        pageUrl: navResult.url,
        cardsFound: navResult.businessCards,
        strategyUsed: navResult.strategyUsed,
        tld: navResult.tld,
        countryName: navResult.countryName,
      }, 'GoogleMaps: Navigation verified via Navigation Engine');

      await reportStage('collecting', `Collecting ${context.keyword} listings...`);

      const detailPageResults = await browserManager.acquireMultiple('gm-detail', concurrency, country);
      detailPages = detailPageResults.map(r => r.page);
      profiling.firstScrollMs = Date.now() - profiling.browserStart;

      const phase2Promise = this.runDetailWorkers(
        cardQueue, () => queueIndex, (idx: number) => { queueIndex = idx; },
        () => phase1Done, () => phase1Error,
        context, concurrency, profile, detailPages,
        () => leadsSaved, (n: number) => { leadsSaved = n; },
      );

      profiling.phase2StartMs = Date.now() - profiling.browserStart;
      await this.collectCards(searchPage!, context, cardQueue, profile, allScrapedNames, allScrapedPlaceIds, profiling, allLeads, (n) => { leadsSaved += n; }, options.onLeadExtracted, options.maxResults, options.resumeSessionId, options.onProgress, options.onEndDetected, options.onSearchCompleted);
      profiling.scrollEndMs = Date.now() - profiling.browserStart;

      phase1Done = true;
      profile('phase1-complete', cardQueue.length, leadsSaved, cardQueue.length - queueIndex);

      await phase2Promise;
      profiling.phase2EndMs = Date.now() - profiling.browserStart;
      profile('phase2-complete', cardQueue.length, leadsSaved, 0);

      const totalExtracted = allScrapedNames.size;
      const totalStored = allLeads.length;

      const fieldCoverage = {
        website: allLeads.filter(l => l.website).length,
        phone: allLeads.filter(l => l.phone).length,
        address: allLeads.filter(l => l.address).length,
        rating: allLeads.filter(l => l.rating && l.rating > 0).length,
        reviewsCount: allLeads.filter(l => l.reviewsCount && l.reviewsCount > 0).length,
        category: allLeads.filter(l => l.category).length,
        businessStatus: allLeads.filter(l => l.businessStatus).length,
        workingHours: allLeads.filter(l => l.workingHours).length,
        plusCode: allLeads.filter(l => l.plusCode).length,
        pincode: allLeads.filter(l => l.pincode).length,
        latitude: allLeads.filter(l => l.latitude !== undefined).length,
        longitude: allLeads.filter(l => l.longitude !== undefined).length,
        placeId: allLeads.filter(l => l.placeId).length,
        sourceUrl: allLeads.filter(l => l.sourceUrl).length,
        city: allLeads.filter(l => l.city).length,
        state: allLeads.filter(l => l.state).length,
        country: allLeads.filter(l => l.country).length,
        searchRank: allLeads.filter(l => l.searchRank !== undefined).length,
      };
      logger.info({
        browserAcquireMs: profiling.pageLoadMs,
        feedReadyMs: profiling.feedReadyMs,
        firstScrollMs: profiling.firstScrollMs,
        firstCardMs: profiling.firstCardMs,
        scrollEndMs: profiling.scrollEndMs,
        phase2EndMs: profiling.phase2EndMs,
        totalElapsedMs: Date.now() - profiling.browserStart,
        cardsCollected: cardQueue.length,
        leadsSaved: totalStored,
        fieldCoverage,
      }, '[GM_PERF] Google Maps performance profile');

      context.sessionId && searchStatus.updateStage(context.sessionId, 'finalizing');
      context.sessionId && searchStatus.addLog(context.sessionId, `Google Maps: ${totalExtracted} found, ${totalStored} saved`, 'info');

      logger.info({
        country: country || 'india',
        state: state || '',
        city: city || '',
        area: area || '',
        keyword: businessType || keyword,
        searchQuery,
        searchUrl,
        cardsFound: allScrapedNames.size,
        businessesExtracted: cardQueue.length,
        businessesSaved: totalStored,
        failureReason: totalStored === 0 && totalExtracted > 0 ? 'all-duplicates' : totalStored === 0 ? 'no-results' : null,
      }, 'GoogleMaps: Search finished — runtime report');

      return {
        success: totalStored > 0,
        message: totalStored > 0 ? `Google Maps: ${totalStored} leads saved` : totalExtracted > 0 ? 'All duplicates' : 'No leads found',
        totalExtracted, totalStored, totalDuplicates,
        leads: allLeads,
        sourceResults: [{ source: 'google-maps', totalStored, totalExtracted, totalDuplicates, success: totalStored > 0 }],
      };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ err: errMsg, sessionId: context.sessionId, keyword }, 'GoogleMaps: Failed');
      return {
        success: allLeads.length > 0,
        message: allLeads.length > 0 ? `Google Maps: ${allLeads.length} leads (with warnings)` : `Google Maps failed: ${errMsg}`,
        totalExtracted: allScrapedNames.size,
        totalStored: allLeads.length, totalDuplicates,
        leads: allLeads,
        sourceResults: [{ source: 'google-maps', totalStored: allLeads.length, totalExtracted: allScrapedNames.size, totalDuplicates, success: allLeads.length > 0, error: allLeads.length > 0 ? undefined : errMsg }],
      };
    } finally {
      await browserManager.releaseAll(detailPages, 'gm-detail');
      if (searchPage) await browserManager.release(searchPage, 'google-maps');
    }
  }

  private async collectCards(
    page: Page, context: ScrapeContext, cardQueue: ScraperLead[],
    profile: (p: string, c: number, s: number, q: number) => void,
    allScrapedNames: Set<string>, allScrapedPlaceIds: Set<string>,
    profiling: ProfilingTiming,
    allLeads: ScraperLead[],
    onSaved: (n: number) => void,
    onLeadExtracted?: (lead: ScraperLead) => void | Promise<void>,
    maxResults?: number,
    resumeSessionId?: string,
    onProgress?: (progress: { found: number; saved: number; duplicates: number; scrollPercent: number; currentBusiness: string }) => void | Promise<void>,
    onEndDetected?: () => void | Promise<void>,
    onSearchCompleted?: () => void | Promise<void>,
  ): Promise<void> {
    const resumedPlaceIds = new Set<string>();
    if (resumeSessionId) {
      const state = resumeStateService.load(resumeSessionId);
      if (state) {
        for (const pid of state.processedPlaceIds) {
          resumedPlaceIds.add(pid);
          allScrapedPlaceIds.add(pid);
        }
        logger.info({ sessionId: resumeSessionId, resumedCount: state.processedCount, savedCount: state.savedCount }, 'GoogleMaps: Resuming from previous state');
      }
    }

      let endRepeats = 0;
      let lastBottomName = '';
      let lastBottomHref = '';
      let lastBottomPlaceId = '';
      let consecutiveIdleScrolls = 0;
      let totalSavedThisSession = 0;
      let totalDuplicatesThisSession = 0;
      let totalFoundThisSession = allScrapedNames.size;
      let lastProgressReport = 0;
      let lastResumeSave = 0;
      let resumeData = {
        sessionId: resumeSessionId || context.sessionId,
        searchQuery: context.fullSearchQuery,
        keyword: context.keyword,
        location: context.location,
        city: context.city || '',
        state: context.state || '',
        area: context.area || '',
        country: context.country || '',
        businessType: context.businessType,
        processedCount: 0,
        savedCount: 0,
        duplicateCount: 0,
        processedPlaceIds: [...allScrapedPlaceIds],
        scrollPosition: 0,
        scrollHeight: 0,
        lastBusinessName: '',
        lastBusinessHref: '',
        updatedAt: new Date().toISOString(),
      };

      const saveResumeState = () => {
        resumeData.processedCount = allScrapedNames.size;
        resumeData.savedCount = totalSavedThisSession;
        resumeData.duplicateCount = totalDuplicatesThisSession;
        resumeData.processedPlaceIds = [...allScrapedPlaceIds].slice(-5000);
        resumeStateService.save(resumeData);
      };

      const reportProgress = async () => {
        const now = Date.now();
        if (now - lastProgressReport < PROGRESS_REPORT_INTERVAL_MS) return;
        lastProgressReport = now;
        const scrollPercent = await this.getScrollPercent(page);
        await onProgress?.({
          found: totalFoundThisSession,
          saved: totalSavedThisSession,
          duplicates: totalDuplicatesThisSession,
          scrollPercent,
          currentBusiness: resumeData.lastBusinessName,
        });
      };

      let scrollAttempt = 0;
      for (scrollAttempt = 1; scrollAttempt <= SCROLL_SAFETY_CAP; scrollAttempt++) {
        if (this.isCancelled()) throw new Error('Scrape cancelled');

        if (scrollAttempt > 0 && scrollAttempt % 5 === 0) {
          const bi = await this.detectBlocking(page);
          if (bi.blocked) {
            saveResumeState();
            await this.captureScreenshot(page, 'blocked-mid-collection', bi);
            logger.error({ blockType: bi.type, url: bi.url, title: bi.title }, 'GoogleMaps: Blocked mid-collection');
            break;
          }
        }

        const metricsBefore = await this.getFeedMetrics(page);
        if (metricsBefore.endOfListVisible || metricsBefore.endOfListText) {
          logger.info({ scrollAttempt, found: totalFoundThisSession }, 'GoogleMaps: End of results marker detected');
          await onEndDetected?.();
          break;
        }

        if (maxResults && maxResults > 0 && allScrapedNames.size >= maxResults) {
          logger.info({ found: allScrapedNames.size, maxResults }, 'GoogleMaps: Max results limit reached');
          break;
        }

        const newCards = await this.extractCards(page, allScrapedNames.size);

        let actualNew = 0;
        let duplicatesInBatch = 0;
        const streamBatch: ScraperLead[] = [];
        for (const card of newCards) {
          const cardKey = card.placeId
            ? `pid:${card.placeId}`
            : card.href
              ? `href:${card.href}`
              : `name:${card.companyName}|${card.address || ''}`;
          if (allScrapedNames.has(cardKey)) { duplicatesInBatch++; continue; }
          if (card.placeId && allScrapedPlaceIds.has(card.placeId)) { duplicatesInBatch++; continue; }
          allScrapedNames.add(cardKey);
          if (card.placeId) allScrapedPlaceIds.add(card.placeId);
          card.fullSearchQuery = context.fullSearchQuery;
          card.searchedKeyword = context.keyword;
          card.searchedLocation = context.location;
          card.searchedCity = context.city;
          card.searchedState = context.state;
          card.searchedArea = context.area;
          card.searchedCountry = context.country;
          card.searchedBusinessType = context.businessType;
          card.businessType = context.businessType;
          card.city = context.city;
          card.state = context.state;
          card.area = context.area;
          card.country = context.country;
          cardQueue.push(card);
          streamBatch.push(card);
          actualNew++;
        }

        if (actualNew > 0) {
          consecutiveIdleScrolls = 0;
          if (!profiling.firstCardMs) profiling.firstCardMs = Date.now() - profiling.browserStart;
          profiling.lastCardMs = Date.now() - profiling.browserStart;
          profile('cards-added', cardQueue.length, 0, cardQueue.length);

          const streamResult = await leadStorage.storeLeads(streamBatch, this.makeContext(context));
          if (streamResult.totalStored > 0) {
            totalSavedThisSession += streamResult.totalStored;
            onSaved(streamResult.totalStored);
            for (const lead of streamResult.leads) {
              allLeads.push(lead);
              await onLeadExtracted?.(lead);
            }
          }
          totalDuplicatesThisSession += streamResult.totalDuplicates;
          totalFoundThisSession = allScrapedNames.size;

          resumeData.lastBusinessName = streamBatch[streamBatch.length - 1].companyName || '';
          resumeData.lastBusinessHref = streamBatch[streamBatch.length - 1].href || '';

          const lastCard = streamBatch[streamBatch.length - 1];
          const bottomKey = lastCard.placeId || lastCard.href || lastCard.companyName;

          if (bottomKey && (bottomKey === lastBottomPlaceId || bottomKey === lastBottomHref || bottomKey === lastBottomName)) {
            endRepeats++;
          } else {
            endRepeats = 0;
            lastBottomName = bottomKey;
            lastBottomHref = lastCard.href || '';
            lastBottomPlaceId = lastCard.placeId || '';
          }

          if (endRepeats >= MAX_END_REPEATS) {
            logger.info({ endRepeats, found: totalFoundThisSession }, 'GoogleMaps: Same last business repeated — end of results');
            await onEndDetected?.();
            break;
          }

          if (totalSavedThisSession - lastResumeSave >= RESUME_SAVE_INTERVAL) {
            lastResumeSave = totalSavedThisSession;
            saveResumeState();
          }
        } else {
          if (duplicatesInBatch > 0) {
            totalDuplicatesThisSession += duplicatesInBatch;
          }
          consecutiveIdleScrolls++;
        }

        await reportProgress();

        await this.smartScroll(page);
        const feedChanged = await this.waitForFeedChange(page, metricsBefore);
        if (feedChanged) {
          consecutiveIdleScrolls = 0;
        }

        const metricsAfter = await this.getFeedMetrics(page);
        if (metricsAfter.endOfListVisible || metricsAfter.endOfListText) {
          logger.info({ scrollAttempt, found: totalFoundThisSession }, 'GoogleMaps: End of results marker detected after scroll');
          await onEndDetected?.();
          break;
        }

        if (maxResults && maxResults > 0 && allScrapedNames.size >= maxResults) break;

        if (consecutiveIdleScrolls >= IDLE_SCROLL_END_THRESHOLD) {
          logger.info({ consecutiveIdleScrolls, found: allScrapedNames.size }, `GoogleMaps: ${IDLE_SCROLL_END_THRESHOLD} consecutive idle scrolls — end of results`);
          await onEndDetected?.();
          break;
        }

        await new Promise<void>(resolve => setTimeout(resolve, SCROLL_PAUSE_MS));
      }

      if (scrollAttempt > SCROLL_SAFETY_CAP) {
        logger.warn({ found: totalFoundThisSession, cap: SCROLL_SAFETY_CAP }, 'GoogleMaps: Scroll safety cap reached');
      }

    saveResumeState();
    resumeStateService.delete(resumeSessionId || context.sessionId);
    await onSearchCompleted?.();
  }

  private async getScrollPercent(page: Page): Promise<number> {
    try {
      return await page.evaluate(() => {
        const feed = document.querySelector('[role="feed"]');
        const main = document.querySelector('div[role="main"]');
        const scrollEl = feed || main || document.documentElement;
        if (!scrollEl) return 0;
        const st = (scrollEl as HTMLElement).scrollTop;
        const sh = (scrollEl as HTMLElement).scrollHeight;
        const ch = (scrollEl as HTMLElement).clientHeight;
        if (!sh || sh <= ch) return 100;
        return Math.min(100, Math.round((st / (sh - ch)) * 100));
      });
    } catch { return 0; }
  }

  private async smartScroll(page: Page): Promise<void> {
    try {
      const feed = await page.$('[role="feed"]');
      if (feed) {
        await feed.evaluate((el: HTMLElement) => {
          const step = Math.max(400, Math.min(1200, el.clientHeight * 0.7));
          el.scrollBy({ top: step, behavior: 'instant' });
        });
        return;
      }
      await page.evaluate(() => {
        const main = document.querySelector('div[role="main"]');
        if (main) {
          const step = Math.max(400, Math.min(1200, (main as HTMLElement).clientHeight * 0.7));
          (main as HTMLElement).scrollBy({ top: step, behavior: 'instant' });
        } else {
          window.scrollBy(0, 800);
        }
      });
    } catch {
      await page.evaluate(() => window.scrollBy(0, 500)).catch(() => {});
    }
  }

  private async waitForFeedChange(page: Page, before: FeedMetrics): Promise<boolean> {
    try {
      const changed = await page.waitForFunction(
        (prev: { childCount: number; placeLinkCount: number }) => {
          const feed = document.querySelector('[role="feed"]');
          const main = document.querySelector('div[role="main"]');
          const scrollEl = feed || main;
          if (!scrollEl) return true;
          const childCount = feed ? feed.children.length : 0;
          const placeLinks = scrollEl.querySelectorAll('a[href*="maps/place/"]').length;
          const isEnd = !!(document.querySelector('.HlvXi, .PbZDve'));
          const bodyText = document.body?.innerText || '';
          const endPatterns = [
            /reached the end|end of the list|no more results|fin de la liste|ende der liste|fine dell.?elenco|リストの末尾|목록의 끝|fim da lista|نهاية القائمة|列表结束/i,
          ];
          const endOfList = endPatterns.some((p) => p.test(bodyText));
          return childCount !== prev.childCount
            || placeLinks !== prev.placeLinkCount
            || isEnd || endOfList;
        },
        { childCount: before.childCount, placeLinkCount: before.placeLinkCount },
        { timeout: 2500, polling: 150 }
      ).catch(() => null);
      return changed !== null;
    } catch { return false; }
  }

  private isCancelled(): boolean {
    try { return this.lastActiveOptions?.isCancelled?.() === true; } catch { return false; }
  }
  private lastActiveOptions: (ScraperOptions & { semanticKeyword?: string }) | null = null;

  private async runDetailWorkers(
    cardQueue: ScraperLead[],
    getIndex: () => number, setIndex: (idx: number) => void,
    isPhase1Done: () => boolean, getPhase1Error: () => Error | null,
    context: ScrapeContext, concurrency: number,
    profile: (p: string, c: number, s: number, q: number) => void,
    detailPages: Page[],
    getLeadsSaved: () => number, setLeadsSaved: (n: number) => void,
  ): Promise<void> {
    const results = await Promise.allSettled(
      Array.from({ length: concurrency }, (_, i) =>
        this.detailWorker(
          cardQueue, getIndex, setIndex, isPhase1Done, getPhase1Error,
          context, profile, detailPages[i],
          getLeadsSaved, setLeadsSaved,
        )
      )
    );
    for (const r of results) {
      if (r.status === 'rejected') logger.error({ err: r.reason }, 'GoogleMaps: Worker crashed');
    }
  }

  private async detailWorker(
    cardQueue: ScraperLead[],
    getIndex: () => number, setIndex: (idx: number) => void,
    isPhase1Done: () => boolean, getPhase1Error: () => Error | null,
    context: ScrapeContext,
    profile: (p: string, c: number, s: number, q: number) => void,
    page: Page,
    getLeadsSaved: () => number, setLeadsSaved: (n: number) => void,
  ): Promise<void> {
    const buffer: ScraperLead[] = [];
    let lastFlushTs = Date.now();

    const enrichCtx = this.makeContext(context);
    const flush = async () => {
      if (buffer.length === 0) return;
      const batch = buffer.splice(0);
      const enriched = await leadStorage.enrichLeads(batch, enrichCtx);
      if (enriched > 0) {
        setLeadsSaved(getLeadsSaved() + enriched);
        profile('enriched', cardQueue.length, getLeadsSaved(), cardQueue.length - getIndex());
        for (const lead of batch) {
          if (lead.companyName) {
            logger.info({ company: lead.companyName }, 'GoogleMaps: MongoDB saved');
          }
        }
      }
    };

    try {
      while (true) {
        const err = getPhase1Error();
        if (err) throw err;
        if (this.isCancelled()) throw new Error('Scrape cancelled');

        let card: ScraperLead | null = null;
        const idx = getIndex();
        if (idx < cardQueue.length) {
          card = cardQueue[idx];
          setIndex(idx + 1);
        }

        if (!card) {
          if (Date.now() - lastFlushTs >= BATCH_FLUSH_INTERVAL_MS) {
            await flush();
            lastFlushTs = Date.now();
          }
          if (isPhase1Done()) { await flush(); break; }
          await new Promise<void>(resolve => setTimeout(resolve, 10));
          continue;
        }

        if (!card.href) {
          buffer.push(card);
          if (buffer.length >= BATCH_FLUSH_SIZE) {
            await flush();
            lastFlushTs = Date.now();
          }
          continue;
        }

        try {
          logger.info({ company: card.companyName }, 'GoogleMaps: Business discovered');

          const navStart = Date.now();
          let navSucceeded = false;
          const waitStrategies: ('networkidle' | 'load' | 'domcontentloaded')[] = ['networkidle', 'load', 'domcontentloaded'];
          for (const ws of waitStrategies) {
            try {
              await page.goto(card.href, { waitUntil: ws, timeout: DETAIL_TIMEOUT });
              navSucceeded = true;
              break;
            } catch (navErr) {
              logger.debug({ company: card.companyName, strategy: ws, err: navErr instanceof Error ? navErr.message : String(navErr) }, 'GoogleMaps: Nav fallback');
            }
          }
          if (!navSucceeded) throw new Error('All navigation strategies failed');
          const firstNavUrl = page.url();
          const firstNavTitle = await page.title().catch(() => '');
          logger.info({ company: card.companyName, url: firstNavUrl, title: firstNavTitle, navMs: Date.now() - navStart }, 'GoogleMaps: Business opened — detail navigated');

          let bi = await this.detectBlocking(page);
          if (bi.blocked) {
            await this.captureDebugEvidence(page, `detail-blocked-${bi.type}`, bi);
            if (bi.type === 'SIGN_IN') {
              const MAX_DETAIL_RETRIES = 3;
              let detailRetrySuccess = false;
              for (let retryD = 1; retryD <= MAX_DETAIL_RETRIES; retryD++) {
                logger.warn({ company: card.companyName, attempt: retryD, maxRetries: MAX_DETAIL_RETRIES, type: bi.type }, 'GoogleMaps: Detail page blocked, retrying');
                try {
                  await page.context().clearCookies();
                  await page.evaluate(() => {
                    try { localStorage.clear(); } catch {}
                    try { sessionStorage.clear(); } catch {}
                  }).catch(() => {});
                } catch {}
                await page.waitForTimeout(1500);
                await page.goto(card.href, { waitUntil: 'domcontentloaded', timeout: DETAIL_TIMEOUT });
                bi = await this.detectBlocking(page);
                if (!bi.blocked) {
                  detailRetrySuccess = true;
                  logger.info({ company: card.companyName, attempt: retryD }, 'GoogleMaps: Detail page retry succeeded');
                  break;
                }
                await this.captureDebugEvidence(page, `detail-blocked-retry-${retryD}-${bi.type}`, bi);
              }
              if (!detailRetrySuccess) {
                throw new Error(`GOOGLE_BLOCKED: ${bi.type}`);
              }
            } else {
              logger.warn({ company: card.companyName, type: bi.type }, 'GoogleMaps: Detail page blocked');
              throw new Error(`GOOGLE_BLOCKED: ${bi.type}`);
            }
          }

          let contentReady = false;
          try {
            await this.waitForBusinessDetailReady(page, DETAIL_CONTENT_TIMEOUT);
            contentReady = true;
          } catch {
            logger.warn({ company: card.companyName }, 'GoogleMaps: Business detail readiness timeout — extracting anyway');
          }
          const finalUrl = page.url();
          const finalTitle = await page.title().catch(() => '');
          const domLength = await page.evaluate(() => document.documentElement?.innerHTML.length || 0).catch(() => 0);
          logger.info({
            company: card.companyName,
            cardHref: card.href,
            finalUrl,
            finalTitle,
            domLength,
            navMs: Date.now() - navStart,
            contentReady,
          }, 'GoogleMaps: Detail panel loaded');

            logger.info({ company: card.companyName }, 'GoogleMaps: Extraction started');

            const extractionStart = Date.now();
            const [website, phone, addr, businessStatus, openingHours, plusCode, lat, lng, secondaryCats, totalPhotos, serviceOpts, ownerClaimed, addrComponents] = await Promise.all([
              this.extractWebsite(page),
              this.extractPhone(page),
              this.extractAddress(page),
              this.extractBusinessStatus(page),
              this.extractOpeningHours(page),
              this.extractPlusCode(page),
              this.extractLatitude(page),
              this.extractLongitude(page),
              this.extractSecondaryCategories(page),
              this.extractTotalPhotos(page),
              this.extractServiceOptions(page),
              this.extractOwnerClaimed(page),
              this.extractAddressComponents(page),
            ]);
            const pincode = addr ? this.extractPincode(addr) : undefined;

            if (website) card.website = website;
            if (phone) card.phone = phone;
            if (addr) {
              card.address = addr;
              const parsed = this.parseAddress(addr, card.city, card.state, card.country);
              if (parsed.city) card.city = parsed.city;
              if (parsed.state) card.state = parsed.state;
              if (parsed.area) card.area = parsed.area;
              if (parsed.country) card.country = parsed.country;
            }
            if (pincode) card.pincode = pincode;
            if (businessStatus) card.businessStatus = businessStatus;
            if (openingHours) card.workingHours = openingHours;
            if (plusCode) card.plusCode = plusCode;
            if (lat !== undefined) card.latitude = lat;
            if (lng !== undefined) card.longitude = lng;
            if (secondaryCats && secondaryCats.length > 0) card.secondaryCategories = secondaryCats;
            if (totalPhotos !== undefined) card.totalPhotos = totalPhotos;
            if (serviceOpts && serviceOpts.length > 0) card.serviceOptions = serviceOpts;
            if (ownerClaimed !== undefined) card.ownerClaimed = ownerClaimed;
            if (addrComponents) {
              if (addrComponents.streetAddress) card.streetAddress = addrComponents.streetAddress;
              if (addrComponents.postalCode) card.postalCode = addrComponents.postalCode;
              if (addrComponents.city) card.city = addrComponents.city;
              if (addrComponents.state) card.state = addrComponents.state;
              if (addrComponents.country) card.country = addrComponents.country;
            }

            if (!website || !phone || !addr) {
              await new Promise<void>(resolve => setTimeout(resolve, 2000));
              if (!website) {
                const retryWebsite = await this.extractWebsite(page);
                if (retryWebsite) card.website = retryWebsite;
              }
              if (!phone) {
                const retryPhone = await this.extractPhone(page);
                if (retryPhone) card.phone = retryPhone;
              }
              if (!addr) {
                const retryAddr = await this.extractAddress(page);
                if (retryAddr) {
                  card.address = retryAddr;
                  const parsed = this.parseAddress(retryAddr, card.city, card.state, card.country);
                  if (parsed.city) card.city = parsed.city;
                  if (parsed.state) card.state = parsed.state;
                  if (parsed.area) card.area = parsed.area;
                  if (parsed.country) card.country = parsed.country;
                }
              }
            }

            if (card.website) {
              const emails = await this.extractEmailsFromWebsite(card.website);
              if (emails.length > 0) {
                card.email = emails[0];
              }
            }

            const fieldLog: Record<string, string> = {
              name: card.companyName ? 'OK' : 'MISSING',
              website: website ? 'OK' : 'MISSING',
              phone: phone ? 'OK' : 'MISSING',
              address: addr ? 'OK' : 'MISSING',
              email: card.email ? 'OK' : 'MISSING',
              category: card.category || (secondaryCats && secondaryCats.length > 0) ? 'OK' : 'MISSING',
              rating: card.rating !== undefined ? 'OK' : 'MISSING',
              reviews: card.reviewsCount !== undefined ? 'OK' : 'MISSING',
              businessStatus: businessStatus ? 'OK' : 'MISSING',
              workingHours: openingHours ? 'OK' : 'MISSING',
              plusCode: plusCode ? 'OK' : 'MISSING',
              coordinates: lat !== undefined && lng !== undefined ? 'OK' : 'MISSING',
              pincode: pincode ? 'OK' : 'MISSING',
              photos: totalPhotos !== undefined ? 'OK' : 'MISSING',
              serviceOptions: serviceOpts && serviceOpts.length > 0 ? 'OK' : 'MISSING',
              ownerClaimed: ownerClaimed !== undefined ? 'OK' : 'MISSING',
              secondaryCategories: secondaryCats && secondaryCats.length > 0 ? 'OK' : 'MISSING',
              streetAddress: addrComponents && addrComponents.streetAddress ? 'OK' : 'MISSING',
            };
            const extractedCount = Object.values(fieldLog).filter(v => v === 'OK').length;
            logger.info({
              company: card.companyName,
              searchRank: card.searchRank,
              extractionMs: Date.now() - extractionStart,
              totalNavMs: Date.now() - navStart,
              fields: extractedCount,
              fieldLog,
            }, 'GoogleMaps: Extraction completed');
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          const errStack = error instanceof Error ? error.stack : undefined;
          let browserUrl = '';
          let pageTitle = '';
          try { browserUrl = page.url(); } catch {}
          try { pageTitle = await page.title().catch(() => ''); } catch {}
          logger.error({
            file: 'backend/src/core/scraper-engine/sources/googleMaps/scraper.ts',
            function: 'detailWorker',
            stack: errStack,
            error: errMsg,
            business: card.companyName || 'unknown',
            googleMapsUrl: card.href || '',
            browserUrl,
            pageTitle,
          }, `[RECOVERABLE_ERROR] Extraction failed for ${card.companyName || 'unknown'} — continuing with next business`);
        }

        buffer.push(card);

        if (buffer.length >= BATCH_FLUSH_SIZE || (Date.now() - lastFlushTs) >= BATCH_FLUSH_INTERVAL_MS) {
          await flush();
          lastFlushTs = Date.now();
        }
      }
    } finally {
      await flush();
    }
  }

  private makeContext(context: ScrapeContext) {
    return {
      keyword: context.keyword, location: context.location,
      area: context.area, city: context.city, state: context.state,
      country: context.country,
      businessType: context.businessType,
      fullSearchQuery: context.fullSearchQuery,
      semanticKeyword: context.semanticKeyword,
      sessionId: context.sessionId,
      automationSessionId: this.lastActiveOptions?.automationSessionId,
      automationJobId: this.lastActiveOptions?.automationJobId,
      onLeadSaved: this.lastActiveOptions?.onLeadSaved,
      skipEnrichment: true,
    };
  }

  private async captureScreenshot(page: Page, label: string, info?: BlockInfo): Promise<string> {
    try {
      ensureDebugDir();
      const url = info?.url || page.url();
      const title = info?.title || await page.title().catch(() => 'unknown');
      const timestamp = Date.now();
      const filepath = path.join(DEBUG_DIR, `${label}-${timestamp}.png`);
      await page.screenshot({ path: filepath, fullPage: false }).catch(() => {});
      const diagPath = path.join(DEBUG_DIR, `${label}-${timestamp}.txt`);
      const diagContent = [
        `Label: ${label}`,
        `URL: ${url}`,
        `Title: ${title}`,
        `Type: ${info?.type || 'unknown'}`,
        `Timestamp: ${new Date(timestamp).toISOString()}`,
      ].join('\n');
      fs.writeFileSync(diagPath, diagContent, 'utf-8');
      logger.warn({ url, title, type: info?.type, screenshot: filepath }, `GoogleMaps: Screenshot — ${label}`);
      return filepath;
    } catch { return ''; }
  }

  private blockedResult(info: BlockInfo): ScraperResult {
    const isNoResults = info.type === 'NO_RESULTS';
    const msg = isNoResults
      ? `No results found for this search query`
      : `Google Maps blocked: ${info.type} — ${info.url}`;
    if (isNoResults) {
      logger.info({ url: info.url, title: info.title }, 'GoogleMaps: No results found');
    } else {
      logger.error({ url: info.url, title: info.title, type: info.type }, `GoogleMaps: ${msg}`);
    }
    return {
      success: isNoResults,
      message: msg, totalExtracted: 0, totalStored: 0, totalDuplicates: 0,
      leads: [],
      sourceResults: [{ source: 'google-maps', totalStored: 0, totalExtracted: 0, totalDuplicates: 0, success: isNoResults, error: isNoResults ? undefined : `Blocked: ${info.type}` }],
    };
  }

  private async warmupPage(page: Page): Promise<void> {
    try {
      await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded', timeout: 15000 });
      await new Promise(r => setTimeout(r, 800 + Math.random() * 1200));
    } catch {
      logger.debug({}, 'GoogleMaps: Warmup skipped (non-fatal)');
    }
  }

  private async detectBlocking(page: Page): Promise<BlockInfo> {
    try {
      const url = page.url();
      const title = await page.title().catch(() => '');
      const text = await page.evaluate(() => document.body?.innerText || '').catch(() => '');

      if (url.includes('accounts.google.com')) {
        return { blocked: true, type: 'SIGN_IN', url, title };
      }
      if (url.includes('google.com/sorry') || url.includes('google.com/error?')) {
        return { blocked: true, type: 'CAPTCHA', url, title };
      }
      if (url.includes('consent.google.com')) {
        return { blocked: true, type: 'CONSENT', url, title };
      }

      const signinUrls = [
        'accounts.google.com',
        'serviceLogin',
        'signin',
        'sign-in',
        'oauth',
        'authentication',
        'passiveauth',
      ];
      if (signinUrls.some((fragment) => url.toLowerCase().includes(fragment))) {
        return { blocked: true, type: 'SIGN_IN', url, title };
      }

      const blockedPatterns: [RegExp, string][] = [
        [/sign in|sign-in|signin/i, 'SIGN_IN'],
        [/unusual traffic|automated queries|our systems have detected/i, 'RATE_LIMITED'],
        [/captcha|recaptcha|challenge|verify you('re| are) human/i, 'CAPTCHA'],
        [/this page is blocked|access denied|403 forbidden/i, 'BLOCKED'],
        [/please try again later|too many requests|try again later/i, 'RATE_LIMITED'],
        [/before you continue|accept all|accept all cookies|i agree/i, 'CONSENT'],
      ];
      for (const [pattern, type] of blockedPatterns) {
        if (pattern.test(text)) return { blocked: true, type, url, title };
      }

      const noResultPatterns: [RegExp, string][] = [
        [/no results|no businesses|no listings found|no matches|did not match any/i, 'NO_RESULTS'],
        [/no result found|your search did not match/i, 'NO_RESULTS'],
        [/try adjusting your search/i, 'NO_RESULTS'],
      ];
      for (const [pattern, type] of noResultPatterns) {
        if (pattern.test(text)) return { blocked: true, type, url, title };
      }

      return { blocked: false, type: '', url, title };
    } catch {
      return { blocked: false, type: '', url: '', title: '' };
    }
  }

  private async captureDebugEvidence(page: Page, label: string, info: BlockInfo): Promise<void> {
    try {
      ensureDebugDir();
      const url = info.url || page.url();
      const title = info.title || await page.title().catch(() => 'unknown');
      const timestamp = Date.now();
      const screenshotPath = path.join(DEBUG_DIR, `${label}-${timestamp}.png`);
      const htmlPath = path.join(DEBUG_DIR, `${label}-${timestamp}.html`);
      const metaPath = path.join(DEBUG_DIR, `${label}-${timestamp}.json`);
      await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
      const html = await page.content().catch(() => '<failed to capture html>');
      fs.writeFileSync(htmlPath, html, 'utf-8');
      const diagnostics = await this.capturePageDiagnostics(page);
      const diagnosticData = {
        label,
        url,
        title,
        type: info.type,
        timestamp: new Date(timestamp).toISOString(),
        diagnostics,
      };
      fs.writeFileSync(metaPath, JSON.stringify(diagnosticData, null, 2), 'utf-8');
      logger.warn({ url, title, type: info.type, screenshot: screenshotPath, html: htmlPath, metadata: metaPath }, `GoogleMaps: Debug evidence captured — ${label}`);
    } catch (err) {
      logger.error({ err: err instanceof Error ? err.message : String(err), label }, 'GoogleMaps: Failed to capture debug evidence');
    }
  }

  private async capturePageDiagnostics(page: Page): Promise<Record<string, unknown>> {
    try {
      const diagnostics = browserManager.getPageDiagnostics(page);
      if (!diagnostics) return {};
      const cookies = await page.context().cookies().catch(() => []);
      const localStorageData = await page.evaluate(() => {
        const result: Record<string, string> = {};
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key) result[key] = window.localStorage.getItem(key) ?? '';
        }
        return result;
      }).catch(() => ({} as Record<string, string>));
      const sessionStorageData = await page.evaluate(() => {
        const result: Record<string, string> = {};
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i);
          if (key) result[key] = window.sessionStorage.getItem(key) ?? '';
        }
        return result;
      }).catch(() => ({} as Record<string, string>));
      let viewport: { width: number; height: number } | null = null;
      try { viewport = await page.viewportSize(); } catch {}
      const userAgent = await page.evaluate(() => navigator.userAgent).catch(() => '');
      const languages = await page.evaluate(() => navigator.languages).catch(() => []);
      return {
        console: diagnostics.console,
        requests: diagnostics.requests,
        cookies,
        localStorage: localStorageData,
        sessionStorage: sessionStorageData,
        viewport,
        userAgent,
        languages,
      };
    } catch {
      return {};
    }
  }

  private async waitForBusinessDetailReady(page: Page, timeoutMs: number): Promise<void> {
    await page.waitForFunction(() => {
      const main = document.querySelector('[role="main"]');
      if (!main) return false;
      const title = document.querySelector('h1')?.textContent || '';
      const metadata = document.querySelector('[role="heading"]') || document.querySelector('div[aria-label*="hours"]') || document.querySelector('button[data-item-id*="authority"]');
      const links = main.querySelectorAll('a[href*="http"]').length;
      const text = main.textContent || '';
      return !!title && (!!metadata || links > 1) && text.length > 300;
    }, { timeout: timeoutMs });
  }

  private async getFeedMetrics(page: Page): Promise<FeedMetrics> {
    try {
      const bodyText = await page.evaluate(() => document.body?.innerText || '').catch(() => '');
      const metrics = await page.evaluate(() => {
        const feed = document.querySelector('[role="feed"]');
        const main = document.querySelector('div[role="main"]');
        const scrollEl = feed || main;
        const endOfListVisible = !!(document.querySelector('.HlvXi, .PbZDve'));
        const placeLinks = scrollEl
          ? Array.from(scrollEl.querySelectorAll('a[href*="maps/place/"]'))
          : Array.from(document.querySelectorAll('a[href*="maps/place/"]'));
        return {
          childCount: feed ? feed.children.length : 0,
          placeLinkCount: placeLinks.length,
          scrollTop: scrollEl ? (scrollEl as HTMLElement).scrollTop : window.scrollY,
          scrollHeight: scrollEl ? (scrollEl as HTMLElement).scrollHeight : document.body.scrollHeight,
          clientHeight: scrollEl ? (scrollEl as HTMLElement).clientHeight : window.innerHeight,
          endOfListVisible,
        };
      });
      return {
        ...metrics,
        endOfListText: isEndOfListText(bodyText),
      };
    } catch {
      return { childCount: 0, placeLinkCount: 0, scrollTop: 0, scrollHeight: 0, clientHeight: 0, endOfListVisible: false, endOfListText: false };
    }
  }

  private async extractCards(page: Page, searchRankOffset: number): Promise<ScraperLead[]> {
    try {
      const cards = await page.evaluate((offset: number) => {
        const leads: ScraperLead[] = [];
        const feed = document.querySelector('[role="feed"]');
        const container = feed || document.querySelector('div[role="main"]') || document.body;
        const selectors = ['a[href*="maps/place/"]', 'div[role="article"]', '[data-place-id]'];
        let elements: Element[] = [];
        for (const sel of selectors) {
          const found = container.querySelectorAll(sel);
          if (found.length > 0) { elements = Array.from(found); break; }
        }
        if (elements.length === 0) elements = Array.from(container.querySelectorAll('a[href*="maps/place/"]'));
        const visitedHrefs = new Set<string>();
        let cardIndex = 0;
        for (const card of elements) {
          const href = (card as HTMLAnchorElement).href || card.getAttribute('href') || '';
          if (href && visitedHrefs.has(href)) continue;
          if (href) visitedHrefs.add(href);
          let name = card.getAttribute('aria-label') || '';
          let rating = 0, reviewsCount = 0, category = '', placeId = '';
          if (name && name.length > 2) {
            const parts = name.split('·').map(s => s.trim()).filter(Boolean);
            if (parts.length >= 2) {
              name = parts[0].trim();
              for (const p of parts.slice(1)) {
                const rm = p.match(/(\d+\.?\d*)\s*star/i);
                if (rm) rating = parseFloat(rm[1]) || 0;
                const rvm = p.match(/([\d,]+)\s*review/i);
                if (rvm) reviewsCount = parseInt(rvm[1].replace(/,/g, ''), 10) || 0;
                if (!category && p.length < 60 && !p.match(/^[\d.]+$/) && !p.toLowerCase().includes('star') && !p.toLowerCase().includes('review')) category = p;
              }
            } else {
              const rm = name.match(/(\d+\.?\d*)\s*stars?/i);
              if (rm) rating = parseFloat(rm[1]) || 0;
              const rvm = name.match(/([\d,]+)\s*reviews?/i);
              if (rvm) reviewsCount = parseInt(rvm[1].replace(/,/g, ''), 10) || 0;
              name = name.replace(/\s*\d+\.?\d*\s*stars?.*$/i, '').replace(/\s*[\d,]+\s*reviews?.*$/i, '').trim();
            }
          }
          if (!name || name.length < 2) {
            const textParts = (card.textContent || '').split('·').map(s => s.trim()).filter(Boolean);
            if (textParts.length > 0) {
              const first = textParts[0];
              if (first.length > 1 && first.length < 100 && first !== category) name = first;
            }
          }
          if (!name || name.length < 2) {
            const allText = card.textContent || '';
            const textMatch = allText.match(/^([\p{L}\p{N}][\p{L}\p{N}\s\-'&.,]+)/u);
            if (textMatch) { const t = textMatch[1].trim(); if (t.length > 2 && t.length < 100) name = t; }
          }
          if (!name || name.length < 2) continue;
          if (!rating) {
            const ratingEl = card.querySelector('[aria-label*="stars"], span[role="img"]');
            if (ratingEl) {
              const label = ratingEl.getAttribute('aria-label') || '';
              const m = label.match(/(\d+\.?\d*)/);
              if (m) rating = parseFloat(m[1]) || 0;
              const rvm2 = label.match(/([\d,]+)\s*reviews?/i);
              if (rvm2) reviewsCount = parseInt(rvm2[1].replace(/,/g, ''), 10) || 0;
            }
          }
          const textContent = card.textContent || '';
          const segments = textContent.split('·').map(s => s.trim()).filter(Boolean);
          for (const seg of segments) {
            if (!category && seg.length < 60 && !seg.match(/^[\d.]+$/) && !seg.toLowerCase().includes('star')) category = seg;
          }
          placeId = card.getAttribute('data-place-id') || '';
          if (!placeId && href) { const m = href.match(/!1s([^!]+)/) || href.match(/place\/([^/]+)/); if (m) placeId = decodeURIComponent(m[1]); }
          leads.push({
            companyName: name, rating, reviewsCount, category, address: '',
            href, placeId, source: 'google-maps', sourceUrl: href,
            searchRank: offset + cardIndex,
          });
          cardIndex++;
        }
        return leads;
      }, searchRankOffset);
      return cards;
    } catch { return []; }
  }

  private parseAddress(fullAddress: string, contextCity?: string, contextState?: string, contextCountry?: string): { city: string; state: string; area: string; country: string } {
    if (!fullAddress) return { city: contextCity || '', state: contextState || '', area: '', country: contextCountry || '' };

    const result = { city: '', state: '', area: '', country: '' };

    const knownCountries = ['india', 'united states', 'usa', 'uk', 'united kingdom', 'australia', 'canada', 'germany', 'france', 'uae', 'dubai', 'singapore', 'malaysia', 'indonesia', 'thailand', 'japan', 'china', 'brazil', 'mexico', 'italy', 'spain', 'netherlands', 'switzerland', 'sweden', 'norway', 'denmark', 'finland', 'belgium', 'austria', 'ireland', 'new zealand', 'south africa', 'south korea', 'russia', 'turkey', 'saudi arabia', 'qatar', 'kuwait', 'oman', 'bahrain', 'nepal', 'bangladesh', 'sri lanka', 'pakistan', 'bhutan', 'maldives'];
    const addrLower = fullAddress.toLowerCase();

    const foundCountry = knownCountries.find(c => addrLower.includes(c));
    if (foundCountry) {
      result.country = foundCountry.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    const parts = fullAddress.split(',').map(p => p.trim()).filter(Boolean);

    const indiaPin = fullAddress.match(/\b(\d{6})\b/);
    const usZip = fullAddress.match(/\b(\d{5})(?:-\d{4})?\b/);
    const canadaPost = fullAddress.match(/\b([A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d)\b/);
    const ukPost = fullAddress.match(/\b([A-Za-z]{1,2}\d{1,2}[A-Za-z]?\s?\d[A-Za-z]{2})\b/);

    const pincode = indiaPin ? indiaPin[0]
      : canadaPost ? canadaPost[1].replace(/\s/, ' ').toUpperCase()
      : ukPost ? ukPost[1].toUpperCase()
      : usZip ? usZip[0]
      : '';

    if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1];
      if (!result.country && knownCountries.some(c => lastPart.toLowerCase() === c)) {
        result.country = lastPart;
      }
    }

    if (pincode) {
      const pincodePartIdx = parts.findIndex(p => p.includes(pincode.split(' ')[0]));
      if (pincodePartIdx >= 1) {
        result.state = parts[pincodePartIdx - 1];
        if (pincodePartIdx >= 2) {
          result.city = parts[pincodePartIdx - 2];
          result.area = parts.slice(0, pincodePartIdx - 2).join(', ');
        } else {
          result.area = parts.slice(0, pincodePartIdx).join(', ');
        }
      }
    } else if (parts.length >= 3) {
      result.city = parts[parts.length - (result.country ? 3 : 2)];
      result.state = parts[parts.length - (result.country ? 2 : 1)];
      result.area = parts.slice(0, parts.length - (result.country ? 3 : 2)).join(', ');
    } else if (parts.length === 2) {
      result.city = parts[0];
      result.state = parts[1];
    }

    if (!result.city && contextCity) result.city = contextCity;
    if (!result.state && contextState) result.state = contextState;
    if (!result.country && contextCountry) result.country = contextCountry;

    return result;
  }

  private async extractWebsite(page: Page): Promise<string | undefined> {
    const selectors = [
      'a[data-item-id*="authority"]', 'a[aria-label*="website"]',
      'button[data-tooltip*="Website"]', 'a[data-tooltip*="Website"]',
      'a[href^="http"]:not([href*="google.com"]):not([href*="maps.googleapis"])',
    ];
    for (const sel of selectors) {
      const el = await page.$(sel).catch(() => null);
      if (el) {
        const href = await el.getAttribute('href').catch(() => null);
        if (href && !href.includes('google.com')) { const n = this.normalizeWebsite(href); if (n) return n; }
      }
    }
    try {
      const hrefs = await page.evaluate(() =>
        Array.from(document.querySelectorAll('a[href]'))
          .map(a => a.getAttribute('href'))
          .filter(h => h && !h.includes('google.com') && !h.includes('maps.googleapis') && h.startsWith('http')) as string[]
      );
      for (const link of hrefs) { const n = this.normalizeWebsite(link); if (n) return n; }
    } catch {}
    try {
      const jsonLd = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        for (const s of scripts) {
          try {
            const data = JSON.parse(s.textContent || '{}');
            const obj = Array.isArray(data) ? data[0] : data;
            if (obj.url && !obj.url.includes('google.com')) return obj.url;
            if (obj.sameAs && Array.isArray(obj.sameAs)) {
              const w = obj.sameAs.find((u: string) => u.startsWith('http') && !u.includes('google.com'));
              if (w) return w;
            }
          } catch {}
        }
        return '';
      });
      if (jsonLd) { const n = this.normalizeWebsite(jsonLd); if (n) return n; }
    } catch {}
    try {
      const metaUrl = await page.evaluate(() => {
        const og = document.querySelector('meta[property="og:url"]');
        if (og) return og.getAttribute('content') || '';
        const tw = document.querySelector('meta[name="twitter:url"]');
        if (tw) return tw.getAttribute('content') || '';
        return '';
      });
      if (metaUrl) { const n = this.normalizeWebsite(metaUrl); if (n) return n; }
    } catch {}
    try {
      const textUrl = await page.evaluate(() => {
        const main = document.querySelector('[role="main"]');
        const text = main ? main.textContent || '' : document.body?.innerText || '';
        const m = text.match(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}(?:\/[^\s,;)]*)?)/);
        if (m) {
          const full = m[0].startsWith('http') ? m[0] : `https://${m[0]}`;
          if (!full.includes('google')) return full;
        }
        return '';
      });
      if (textUrl) { const n = this.normalizeWebsite(textUrl); if (n) return n; }
    } catch {}
    return undefined;
  }

  private async extractPhone(page: Page): Promise<string | undefined> {
    const selectors = [
      'button[data-item-id*="phone:tel"]', 'a[href^="tel:"]',
      'span[aria-label*="phone"]', 'button[aria-label*="phone"]', '[data-tooltip*="Phone"]',
      '[data-item-id*="phone"]',
    ];
    for (const sel of selectors) {
      const el = await page.$(sel).catch(() => null);
      if (el) {
        const text = await el.textContent().catch(() => null)
          || await el.getAttribute('aria-label').catch(() => null)
          || await el.getAttribute('href').catch(() => '')
          || await el.getAttribute('data-phone-number').catch(() => null);
        if (text) {
          const cleaned = text.replace(/^tel:/, '').replace(/[\s-]/g, '').trim();
          const n = this.normalizePhone(cleaned);
          if (n) return n;
          if (cleaned.match(/^\+?\d{10,15}$/)) return cleaned;
        }
      }
    }
    try {
      const allText = await page.evaluate(() => {
        const panel = document.querySelector('[role="dialog"], div[role="main"]');
        return panel ? panel.textContent || '' : document.body?.innerText || '';
      });
      const phoneRegex = /[\+\d][\d\s\-\(\)]{7,18}\d/g;
      const matches = allText.match(phoneRegex);
      if (matches) {
        for (const m of matches) {
          const cleaned = m.replace(/[\s\-\(\)]/g, '');
          const n = this.normalizePhone(cleaned);
          if (n) return n;
          if (cleaned.match(/^\+?\d{10,15}$/)) return cleaned;
        }
      }
    } catch {}
    try {
      const jsonLd = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        for (const s of scripts) {
          try {
            const data = JSON.parse(s.textContent || '{}');
            const obj = Array.isArray(data) ? data[0] : data;
            if (obj.telephone) return obj.telephone;
            if (obj.contactPoint && Array.isArray(obj.contactPoint)) {
              const cp = obj.contactPoint.find((c: Record<string, unknown>) => c.telephone);
              if (cp) return cp.telephone;
            }
          } catch {}
        }
        return '';
      });
      if (jsonLd) { const n = this.normalizePhone(jsonLd); if (n) return n; }
    } catch {}
    try {
      const dataAttrs = await page.evaluate(() => {
        const all = Array.from(document.querySelectorAll('[data-phone-number], [data-phonenumber], [data-phone]'));
        for (const el of all) {
          const v = el.getAttribute('data-phone-number') || el.getAttribute('data-phonenumber') || el.getAttribute('data-phone') || '';
          if (v) return v;
        }
        return '';
      });
      if (dataAttrs) { const n = this.normalizePhone(dataAttrs); if (n) return n; }
    } catch {}
    try {
      const bodyHtml = await page.evaluate(() => document.body?.innerHTML || '');
      const telMatches = bodyHtml.match(/tel:(\+?\d[\d\s\-\(\)]{7,18}\d)/g);
      if (telMatches) {
        for (const m of telMatches) {
          const cleaned = m.replace('tel:', '').replace(/[\s\-\(\)]/g, '');
          const n = this.normalizePhone(cleaned);
          if (n) return n;
        }
      }
    } catch {}
    return undefined;
  }

  private async extractAddress(page: Page): Promise<string | undefined> {
    const selectors = [
      'button[data-item-id*="address"]', 'div[aria-label*="address"]',
      'span[aria-label*="address"]', '[data-item-id*="address"]',
    ];
    for (const sel of selectors) {
      const el = await page.$(sel).catch(() => null);
      if (el) {
        const text = await el.textContent().catch(() => null) || await el.getAttribute('aria-label').catch(() => null);
        if (text && text.length > 5) return text.trim();
      }
    }
    try {
      const addr = await page.evaluate(() => {
        const panel = document.querySelector('[role="dialog"], div[role="main"]');
        if (!panel) return '';
        const text = panel.textContent || '';
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        for (const line of lines) {
          if (line.match(/\d{4,6}/) || (line.includes(',') && line.length > 15 && line.length < 150)) {
            if (!line.toLowerCase().includes('phone') && !line.toLowerCase().includes('website')) return line;
          }
        }
        return '';
      });
      if (addr) return addr;
    } catch {}
    try {
      const jsonLd = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        for (const s of scripts) {
          try {
            const data = JSON.parse(s.textContent || '{}');
            const obj = Array.isArray(data) ? data[0] : data;
            if (obj.address && typeof obj.address === 'object') {
              const street = obj.address.streetAddress || '';
              const city = obj.address.addressLocality || '';
              const region = obj.address.addressRegion || '';
              const postal = obj.address.postalCode || '';
              const country = obj.address.addressCountry || '';
              return [street, city, region, postal, country].filter(Boolean).join(', ');
            }
          } catch {}
        }
        return '';
      });
      if (jsonLd) return jsonLd;
    } catch {}
    try {
      const metaAddr = await page.evaluate(() => {
        const meta = document.querySelector('meta[itemprop="address"]');
        if (meta) return meta.getAttribute('content') || '';
        const dc = document.querySelector('meta[name="DC.coverage"]');
        if (dc) return dc.getAttribute('content') || '';
        return '';
      });
      if (metaAddr && metaAddr.length > 5) return metaAddr;
    } catch {}
    try {
      const urlAddr = await page.evaluate(() => {
        const url = window.location.href;
        const m = url.match(/\/place\/([^@]+)/);
        if (m) {
          const decoded = decodeURIComponent(m[1]).replace(/\+/g, ' ').replace(/!.*$/, '').replace(/\/data.*$/, '').trim();
          if (decoded.length > 5 && !decoded.toLowerCase().includes('search')) {
            const parts = decoded.split(',').map(p => p.trim()).filter(Boolean);
            if (parts.length >= 2) return decoded;
          }
        }
        return '';
      });
      if (urlAddr) return urlAddr;
    } catch {}
    return undefined;
  }

  private extractPincode(text: string): string | undefined {
    const india = text.match(/\b(\d{6})\b/);
    if (india) return india[1];
    const canada = text.match(/\b([A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d)\b/);
    if (canada) return canada[1].replace(/\s/, ' ').toUpperCase();
    const uk = text.match(/\b([A-Za-z]{1,2}\d{1,2}[A-Za-z]?\s?\d[A-Za-z]{2})\b/);
    if (uk) return uk[1].toUpperCase();
    const us = text.match(/\b(\d{5})(?:-\d{4})?\b/);
    if (us) return us[1];
    return undefined;
  }

  private async extractBusinessStatus(page: Page): Promise<string | undefined> {
    const selectors = [
      'span[aria-label*="Open"]', 'span[aria-label*="Closed"]',
      '[data-tooltip*="Open"]', '[data-tooltip*="Closed"]',
      'button[data-item-id*="open"]', 'span[class*="opened"]',
    ];
    for (const sel of selectors) {
      const el = await page.$(sel).catch(() => null);
      if (el) {
        const text = await el.textContent().catch(() => null) || await el.getAttribute('aria-label').catch(() => null);
        if (text && text.length < 60) return text.trim();
      }
    }
    try {
      const status = await page.evaluate(() => {
        const main = document.querySelector('[role="dialog"], div[role="main"]');
        if (!main) return '';
        const text = main.textContent || '';
        const m = text.match(/(Open|Closed|Temporarily closed|Hours may differ)/i);
        return m ? m[1] : '';
      });
      if (status) return status;
    } catch {}
    return undefined;
  }

  private async extractOpeningHours(page: Page): Promise<string | undefined> {
    try {
      const hours = await page.evaluate(() => {
        const main = document.querySelector('[role="dialog"], div[role="main"]');
        if (!main) return '';
        const text = main.textContent || '';
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        const hourLines: string[] = [];
        const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        let inHours = false;
        for (const line of lines) {
          const lower = line.toLowerCase();
          if (lower.includes('hours') || lower.includes('open') || lower.includes('closed') || lower === 'add hours') {
            inHours = true;
            continue;
          }
          if (inHours) {
            if (dayNames.some(d => lower.startsWith(d)) || lower.match(/^\d{1,2}[:.]\d{2}\s*(am|pm)/i) || lower.match(/^(closed|open 24 hours)/i)) {
              hourLines.push(line);
            } else if (hourLines.length > 0 && lower.length > 2 && !lower.includes('phone') && !lower.includes('website') && !lower.includes('address')) {
              break;
            }
          }
        }
        return hourLines.join(', ');
      });
      if (hours && hours.length > 2) return hours;
    } catch {}
    return undefined;
  }

  private async extractPlusCode(page: Page): Promise<string | undefined> {
    try {
      const plusCode = await page.evaluate(() => {
        const main = document.querySelector('[role="dialog"], div[role="main"]');
        if (!main) return '';
        const text = main.textContent || '';
        const m = text.match(/\b([A-Z0-9]{4,8}\+[A-Z0-9]{2,4})\b/);
        return m ? m[1] : '';
      });
      if (plusCode) return plusCode;
    } catch {}
    return undefined;
  }

  private async extractLatitude(page: Page): Promise<number | undefined> {
    try {
      const latStr = await page.evaluate(() => {
        const url = window.location.href;
        const m = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        return m ? m[1] : '';
      });
      if (latStr) {
        const n = parseFloat(latStr);
        if (!isNaN(n)) return n;
      }
    } catch {}
    try {
      const el = await page.$('[data-lat]');
      if (el) {
        const v = await el.getAttribute('data-lat').catch(() => null);
        if (v) { const n = parseFloat(v); if (!isNaN(n)) return n; }
      }
    } catch {}
    return undefined;
  }

  private async extractLongitude(page: Page): Promise<number | undefined> {
    try {
      const lngStr = await page.evaluate(() => {
        const url = window.location.href;
        const m = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        return m ? m[2] : '';
      });
      if (lngStr) {
        const n = parseFloat(lngStr);
        if (!isNaN(n)) return n;
      }
    } catch {}
    try {
      const el = await page.$('[data-lng]');
      if (el) {
        const v = await el.getAttribute('data-lng').catch(() => null);
        if (v) { const n = parseFloat(v); if (!isNaN(n)) return n; }
      }
    } catch {}
    return undefined;
  }

  private async extractSecondaryCategories(page: Page): Promise<string[] | undefined> {
    try {
      const cats = await page.evaluate(() => {
        const panel = document.querySelector('[role="dialog"], div[role="main"]');
        if (!panel) return [];
        const allLinks = Array.from(panel.querySelectorAll('a'));
        const categories: string[] = [];
        for (const a of allLinks) {
          const href = a.getAttribute('href') || '';
          const text = a.textContent?.trim() || '';
          if (href.includes('search/') && text && !href.includes('maps/place/') && text.length < 50) {
            categories.push(text);
          }
        }
        const button = panel.querySelector('button[jsaction*="category"]');
        if (button) {
          const t = button.textContent?.trim();
          if (t && t.length < 50 && !categories.includes(t)) categories.push(t);
        }
        return categories;
      });
      if (cats && cats.length > 0) return cats;
    } catch {}
    try {
      const singleCat = await page.evaluate(() => {
        const button = document.querySelector('button[data-item-id*="category"]');
        return button ? button.getAttribute('aria-label') || button.textContent?.trim() || '' : '';
      });
      if (singleCat && singleCat.length > 0 && singleCat.length < 50) return [singleCat];
    } catch {}
    return undefined;
  }

  private async extractTotalPhotos(page: Page): Promise<number | undefined> {
    try {
      const count = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        for (const b of buttons) {
          const text = b.textContent?.trim() || '';
          const m = text.match(/(\d+)\s*(photo|image|picture)s?/i);
          if (m) return parseInt(m[1], 10);
        }
        const spans = Array.from(document.querySelectorAll('span'));
        for (const s of spans) {
          const text = s.textContent?.trim() || '';
          const m = text.match(/(\d+)\s*(photo|image|picture)s?/i);
          if (m) return parseInt(m[1], 10);
        }
        return -1;
      });
      if (count >= 0) return count;
    } catch {}
    return undefined;
  }

  private async extractServiceOptions(page: Page): Promise<string[] | undefined> {
    try {
      const options = await page.evaluate(() => {
        const panel = document.querySelector('[role="dialog"], div[role="main"]');
        if (!panel) return [];
        const allSpans = Array.from(panel.querySelectorAll('span'));
        const opts: string[] = [];
        const knownServices = ['in-store', 'delivery', 'takeaway', 'dine-in', 'curbside', 'pickup', 'drive-through',
          'reservation', 'online', 'appointment', 'order', 'shipping', 'return', 'warranty'];
        for (const s of allSpans) {
          const text = s.textContent?.trim() || '';
          if (text.length > 2 && text.length < 60 && knownServices.some(k => text.toLowerCase().includes(k))) {
            if (!opts.includes(text)) opts.push(text);
          }
        }
        return opts;
      });
      if (options && options.length > 0) return options;
    } catch {}
    try {
      const text = await page.evaluate(() => {
        const panel = document.querySelector('[role="dialog"], div[role="main"]');
        return panel ? panel.textContent || '' : '';
      });
      const knownServices = ['in-store shopping', 'delivery', 'takeaway', 'dine-in', 'curbside pickup', 'pickup',
        'drive-through', 'reservation', 'online ordering', 'in-store pickup', 'same-day delivery', 'no-contact delivery'];
      const found: string[] = [];
      for (const s of knownServices) {
        if (text.toLowerCase().includes(s)) found.push(s);
      }
      if (found.length > 0) return found;
    } catch {}
    return undefined;
  }

  private async extractOwnerClaimed(page: Page): Promise<boolean | undefined> {
    try {
      const claimed = await page.evaluate(() => {
        const panel = document.querySelector('[role="dialog"], div[role="main"]');
        if (!panel) return false;
        const text = panel.textContent || '';
        if (text.includes('Claim this business') || text.includes('Own this business?')) return false;
        const indicators = ['verified', 'claimed', 'owner', 'business owner'];
        const lower = text.toLowerCase();
        for (const ind of indicators) {
          if (lower.includes(ind)) {
            const button = panel.querySelector('button');
            if (button) return true;
          }
        }
        return false;
      });
      return claimed;
    } catch {}
    return undefined;
  }

  private async extractAddressComponents(page: Page): Promise<{ streetAddress?: string; postalCode?: string; city?: string; state?: string; country?: string; formatted?: string } | undefined> {
    try {
      const addr = await this.extractAddress(page);
      if (addr) {
        const postalCode = this.extractPincode(addr);
        const parts = addr.split(',').map(p => p.trim()).filter(Boolean);
        const result: Record<string, string> = {};
        if (postalCode) {
          result.postalCode = postalCode;
          const pIdx = parts.findIndex(p => p.includes(postalCode.split(' ')[0]));
          if (pIdx > 0) result.state = parts[pIdx - 1];
          if (pIdx > 1) result.city = parts[pIdx - 2];
          if (pIdx > 0) result.streetAddress = parts.slice(0, pIdx - (pIdx > 1 ? 2 : 1)).join(', ');
          if (!result.streetAddress && parts.length > 0) result.streetAddress = parts[0];
        } else if (parts.length >= 3) {
          result.city = parts[parts.length - 3];
          result.state = parts[parts.length - 2];
          result.streetAddress = parts.slice(0, parts.length - 3).join(', ');
        } else if (parts.length === 2) {
          result.streetAddress = parts[0];
          result.city = parts[1];
        } else {
          result.streetAddress = parts[0];
        }
        const knownCountries = ['india', 'united states', 'usa', 'uk', 'united kingdom', 'australia', 'canada', 'germany', 'france', 'uae', 'dubai', 'singapore', 'malaysia'];
        const lower = addr.toLowerCase();
        for (const c of knownCountries) {
          if (lower.includes(c)) {
            result.country = c.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            break;
          }
        }
        return result as { streetAddress?: string; postalCode?: string; city?: string; state?: string; country?: string };
      }
    } catch {}
    try {
      const jsonLd = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        for (const s of scripts) {
          try {
            const data = JSON.parse(s.textContent || '{}');
            const obj = Array.isArray(data) ? data[0] : data;
            if (obj.address && typeof obj.address === 'object') {
              return {
                streetAddress: obj.address.streetAddress || '',
                postalCode: obj.address.postalCode || '',
                city: obj.address.addressLocality || '',
                state: obj.address.addressRegion || '',
                country: obj.address.addressCountry || '',
              };
            }
          } catch {}
        }
        return null;
      });
      if (jsonLd && (jsonLd.streetAddress || jsonLd.city)) return jsonLd;
    } catch {}
    return undefined;
  }

  private async extractEmailsFromWebsite(website: string): Promise<string[]> {
    const allEmails = new Set<string>();
    try {
      const base = website.startsWith('http') ? website : `https://${website}`;
      const origin = new URL(base).origin;
      const pagesToTry = [
        base,
        `${origin}/contact`,
        `${origin}/contact-us`,
        `${origin}/about`,
        `${origin}/about-us`,
        `${origin}/team`,
        `${origin}/services`,
      ];
      for (const url of pagesToTry) {
        try {
          const resp = await axios.get(url, {
            timeout: 5000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            validateStatus: (s) => s < 400,
          });
          const html = typeof resp.data === 'string' ? resp.data : String(resp.data);
          const extracted = extractEmailsFromHtml(html, 'website');
          for (const e of extracted) allEmails.add(e.email);
          if (allEmails.size > 0) break;
        } catch { }
      }
    } catch { }
    return [...allEmails];
  }

  private normalizeWebsite(url: string): string | undefined {
    if (!url || url.includes('google.com') || url.includes('maps.googleapis')) return undefined;
    try {
      let normalized = url.startsWith('http') ? url : `https://${url}`;
      const parsed = new URL(normalized);
      let hostname = parsed.hostname.replace(/^www\./, '');
      if (hostname.includes('google')) return undefined;
      return `${parsed.protocol}//${hostname}${parsed.pathname === '/' ? '' : parsed.pathname}`;
    } catch { return undefined; }
  }

  private normalizePhone(phone: string): string | undefined {
    if (!phone) return undefined;
    const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
    if (cleaned.match(/^\+\d{7,15}$/)) return cleaned;
    if (cleaned.match(/^00\d{9,14}$/)) return `+${cleaned.substring(2)}`;
    if (cleaned.match(/^\d{11,15}$/)) return `+${cleaned}`;
    if (cleaned.match(/^0\d{9,14}$/)) return `+${cleaned.substring(1)}`;
    if (cleaned.match(/^\d{10}$/) && this.lastActiveOptions?.country) {
      const c = (this.lastActiveOptions.country || '').toLowerCase().trim();
      if (c === 'india' || c === '') return `+91${cleaned}`;
    }
    if (cleaned.match(/^\d{7,9}$/)) return undefined;
    return undefined;
  }

}
