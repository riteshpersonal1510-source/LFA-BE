import { logger } from '../../utils/logger';
import { GoogleMapsScraper } from './sources/googleMaps/scraper';
import { JustDialScraper } from './sources/justdial/scraper';
import { IndiaMartScraper } from './sources/indiamart/scraper';
import { ScraperLead, ScraperResult, ScraperOptions, ScraperError } from './types';
import { RetryEngine } from './retry-engine';
import { browserManager } from './browser-manager';
import { MAX_CONCURRENCY } from './types';
import { searchStatus } from '../../services/search-status.service';
import { perfMonitor } from '../../utils/perf-monitor';

interface ScrapeTask {
  source: string;
  execute: () => Promise<ScraperResult>;
}

const TABLE_FLIP = '(╯°□°)╯︵ ┻━┻';

export class ScraperEngine {
  private googleMapsScraper: GoogleMapsScraper;
  private justDialScraper: JustDialScraper;
  private indiaMartScraper: IndiaMartScraper;
  private retryEngine: RetryEngine;
  private allLeads: ScraperLead[] = [];
  private allErrors: ScraperError[] = [];

  constructor() {
    this.googleMapsScraper = new GoogleMapsScraper();
    this.justDialScraper = new JustDialScraper();
    this.indiaMartScraper = new IndiaMartScraper();
    this.retryEngine = new RetryEngine({ maxRetries: 2, baseDelayMs: 2000 });
  }

  async scrapeMultiSource(options: ScraperOptions): Promise<ScraperResult> {
    return perfMonitor.measure('scrapeMultiSource', async () => {
    this.allLeads = [];
    this.allErrors = [];

    logger.info({ keyword: options.keyword, sources: options.sources }, '[SCRAPER_ENGINE] scrapeMultiSource started');

    if (options.isCancelled?.()) {
      logger.warn({}, '[SCRAPER_ENGINE] Cancelled before start');
      return {
        success: false,
        message: 'Scrape cancelled',
        totalExtracted: 0,
        totalStored: 0,
        totalDuplicates: 0,
        leads: [],
        sourceResults: [],
      };
    }

    const trackSearch = !options.skipSearchTracking;
    const sessionId = options.sessionId || (trackSearch ? searchStatus.generateSessionId() : undefined);

    if (trackSearch && sessionId) {
      logger.info({ sessionId, keyword: options.keyword }, '[SCRAPER_ENGINE] Creating search session (standalone mode)');
      searchStatus.createSession(sessionId, {
        keyword: options.keyword,
        location: options.location || '',
        state: options.state,
        city: options.city,
        area: options.area,
        country: options.country,
        sources: options.sources || ['google-maps'],
        createdBy: options.userId,
      });
    }

    const sources = options.sources.filter(s => ['google-maps', 'justdial', 'indiamart'].includes(s));
    if (sources.length === 0) {
      return {
        success: false, message: 'No valid sources provided', totalExtracted: 0,
        totalStored: 0, totalDuplicates: 0, leads: [], sourceResults: [],
      };
    }

    const tasks: ScrapeTask[] = sources.map(source => ({
      source,
      execute: () => this.executeSourceScrape(source, { ...options, sessionId }),
    }));

    logger.info({ sources, sessionId }, '[SCRAPER_ENGINE] Starting concurrent source scraping');

    const results = await this.executeWithConcurrencyLimit(tasks, sessionId, trackSearch);

    const totalExtracted = results.reduce((sum, r) => sum + r.totalExtracted, 0);
    const totalStored = results.reduce((sum, r) => sum + r.totalStored, 0);
    const totalDuplicates = results.reduce((sum, r) => sum + r.totalDuplicates, 0);
    const anySuccess = results.some(r => r.success);
    const anyPartial = anySuccess && this.allErrors.length > 0;

    if (trackSearch && sessionId) {
      const sourceResults = results.map(r => r.sourceResults[0]).filter(Boolean);
      for (const r of sourceResults) {
        searchStatus.updateSourceBreakdown(sessionId, r.source, r.totalStored);
      }
    }

    const errorDetails = this.allErrors.length > 0
      ? this.allErrors.map(e => `[${e.source}] ${e.error}`).join(' | ')
      : '';

    const resultMessage = this.buildResultMessage(anySuccess, anyPartial, totalStored, sources, errorDetails);

    logger.info({
      totalExtracted, totalStored, totalDuplicates,
      errors: this.allErrors.length,
      anySuccess,
      sources: sources.join(', '),
    }, '[SCRAPER_ENGINE] Multi-source scrape completed');
    logger.info({ resultMessage }, '[SCRAPER_ENGINE] Result message');

    if (trackSearch && sessionId && anySuccess) {
      const completedSources = results.filter(r => r.success).map(r => r.sourceResults[0]?.source).filter(Boolean);
      const failedSources = this.allErrors.map(e => e.source);
      await searchStatus.markCompleted(sessionId, completedSources, failedSources);
    }

    return {
      success: anySuccess || totalStored > 0,
      message: resultMessage,
      totalExtracted,
      totalStored,
      totalDuplicates,
      leads: this.allLeads,
      sourceResults: results.map(r => r.sourceResults[0]).filter(Boolean),
      partialSuccess: anyPartial || undefined,
      errors: this.allErrors.length > 0 ? this.allErrors : undefined,
    };
    }, { log: true, metadata: { keyword: options.keyword, sources: options.sources.join(',') } });
  }

  private async executeSourceScrape(source: string, options: ScraperOptions): Promise<ScraperResult> {
    if (options.isCancelled?.()) {
      throw new Error('Scrape cancelled');
    }

    const trackSearch = !options.skipSearchTracking;
    if (trackSearch && options.sessionId) {
      const session = searchStatus.getProgress(options.sessionId);
      if (session) {
        session.currentSource = source;
      }
    }

    logger.info({ source, keyword: options.keyword }, '[SCRAPER_ENGINE] executeSourceScrape starting');

    const retryResult = await this.retryEngine.execute(
      async () => {
        if (options.isCancelled?.()) {
          throw new Error('Scrape cancelled');
        }
        switch (source) {
          case 'google-maps':
            const gmResult = await this.googleMapsScraper.scrape({ ...options, semanticKeyword: options.semanticKeyword });
            const profile = this.googleMapsScraper.getProfile();
            if (profile.length > 0) {
              const last = profile[profile.length - 1];
              logger.info({
                firstLeadMs: profile.find(p => p.leadsSaved > 0)?.elapsed || last.elapsed,
                totalElapsed: last.elapsed,
                leadsSaved: last.leadsSaved,
                cardsCollected: last.cardsCollected,
                milestones: profile.map(p => `${p.phase}=${p.elapsed}ms`).join(' → '),
              }, '[GM_PROFILE] Google Maps performance profile');
            }
            return gmResult;
          case 'justdial':
            return this.justDialScraper.scrape({ ...options, semanticKeyword: options.semanticKeyword });
          case 'indiamart':
            return this.indiaMartScraper.scrape({ ...options, semanticKeyword: options.semanticKeyword });
          default:
            throw new Error(`Unknown source: ${source}`);
        }
      },
      { source, keyword: options.keyword }
    );

    if (retryResult.success && retryResult.data) {
      const result = retryResult.data;
      logger.info({ source, stored: result.totalStored, extracted: result.totalExtracted }, '[SCRAPER_ENGINE] Source scrape returned');
      if (result.leads && result.leads.length > 0) {
        this.allLeads = [...this.allLeads, ...result.leads];
      }
      if (!result.success && result.sourceResults[0]?.error) {
        this.allErrors.push({
          source,
          keyword: options.keyword,
          error: result.sourceResults[0].error,
          retryable: false,
        });
      }
      return result;
    }

    const errorMsg = retryResult.error || 'Unknown error';
    logger.error({ source, error: errorMsg }, `[SCRAPER_ENGINE] ${TABLE_FLIP} Source scrape failed after retries`);
    this.allErrors.push({
      source,
      keyword: options.keyword,
      error: errorMsg,
      retryable: false,
    });

    return {
      success: false,
      message: `${source} failed: ${errorMsg}`,
      totalExtracted: 0,
      totalStored: 0,
      totalDuplicates: 0,
      leads: [],
      sourceResults: [{
        source,
        totalStored: 0,
        totalExtracted: 0,
        totalDuplicates: 0,
        success: false,
        error: errorMsg,
        retriesUsed: retryResult.retriesUsed,
      }],
    };
  }

  private async executeWithConcurrencyLimit(
    tasks: ScrapeTask[],
    sessionId?: string,
    trackSearch = true
  ): Promise<ScraperResult[]> {
    const results: ScraperResult[] = [];
    const pending: Promise<void>[] = [];

    for (const task of tasks) {
      const maxConcurrent = MAX_CONCURRENCY[task.source as keyof typeof MAX_CONCURRENCY] || 2;

      const promise = this.executeTask(task, results, sessionId, trackSearch).finally(() => {
        const index = pending.indexOf(promise);
        if (index >= 0) {
          pending.splice(index, 1);
        }
      });
      pending.push(promise);

      if (pending.length >= maxConcurrent) {
        await Promise.race(pending);
      }
    }

    await Promise.allSettled(pending);
    return results;
  }

  private async executeTask(
    task: ScrapeTask,
    results: ScraperResult[],
    sessionId?: string,
    trackSearch = true
  ): Promise<void> {
    try {
      const result = await task.execute();
      results.push(result);
      if (trackSearch && sessionId && result.success) {
        searchStatus.updateCurrentSource(sessionId, task.source);
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error({ task: task.source, err: errMsg }, `[SCRAPER_ENGINE] ${TABLE_FLIP} Task threw unexpected error`);
      results.push({
        success: false,
        message: `${task.source} failed: ${errMsg}`,
        totalExtracted: 0, totalStored: 0, totalDuplicates: 0,
        leads: [],
        sourceResults: [{
          source: task.source, totalStored: 0, totalExtracted: 0,
          totalDuplicates: 0, success: false, error: errMsg, retriesUsed: 0,
        }],
      });
    }
  }

  private buildResultMessage(
    anySuccess: boolean, anyPartial: boolean, totalStored: number,
    sources: string[], errorDetails: string
  ): string {
    if (!anySuccess) {
      const base = errorDetails
        ? `All sources failed: ${errorDetails}`
        : 'No leads found from any source';
      return base;
    }
    if (anyPartial) {
      const base = errorDetails
        ? `Partial results: ${totalStored} leads saved from ${sources.length} sources (errors: ${errorDetails})`
        : `Partial results: ${totalStored} leads saved from ${sources.length} sources`;
      return base;
    }
    return `Scraping completed: ${totalStored} leads saved from ${sources.join(', ')}`;
  }

  getBrowserStatus() {
    return browserManager.getStatus();
  }
}

export const scraperEngine = new ScraperEngine();
