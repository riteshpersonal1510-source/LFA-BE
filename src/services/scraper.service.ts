/**
 * scraper.service.ts  — Node.js scraper orchestrator
 *
 * ARCHITECTURE CHANGE: All Playwright scraping is now delegated to the
 * Python Scraper Service (FastAPI + Playwright Python).
 *
 * Node.js responsibilities here:
 *  1. Validate & normalise inputs
 *  2. Resolve which sources to use per country
 *  3. Call pythonScraperService.scrape()
 *  4. Return aggregated result to the search queue
 *
 * Node.js does NOT run any browser, Playwright, or scraping code.
 */

import { logger } from '../utils/logger';
import { buildMapsSearchQuery } from '../utils/location-query-builder';
import { getSourcesForCountry, validateSources, isIndiaCountry } from '../multi-source';
import { pythonScraperService, PythonScrapeResult } from './python-scraper.service';

export const DEFAULT_SEARCH_SOURCES = [
  'google-maps',
  'justdial',
  'indiamart',
  'clutch',
  'website',
] as const;

export interface ScrapeOptions {
  keyword: string;
  location?: string;
  sources?: string[];
  limit: number;
  state?: string;
  city?: string;
  area?: string;
  country?: string;
  businessType?: string;
  sessionId?: string;
  skipSearchTracking?: boolean;
  isCancelled?: () => boolean;
  semanticExpansion?: boolean;
  maxResults?: number;
  resumeSessionId?: string;
}

export interface ScrapeResult {
  success: boolean;
  message: string;
  results: {
    [sourceName: string]: {
      totalExtracted: number;
      totalStored: number;
      totalDuplicates: number;
    };
  };
  totalExtracted: number;
  totalStored: number;
  totalDuplicates: number;
  leads: unknown[];
  errors?: Array<{ source: string; keyword: string; error: string }>;
}

export class ScraperService {
  async scrapeBusinesses(options: ScrapeOptions): Promise<ScrapeResult> {
    const {
      keyword,
      location,
      sources = [],
      limit = 0,
      state,
      city,
      area,
      country,
      businessType,
      sessionId = `node_${Date.now()}`,
      isCancelled,
      maxResults,
      resumeSessionId,
    } = options;

    if (isCancelled?.()) {
      return this._cancelled();
    }

    // Resolve sources for this country
    const resolvedSources = validateSources(
      sources.length > 0 ? sources : getSourcesForCountry(country),
      country
    );

    const { searchQuery } = buildMapsSearchQuery(businessType || keyword, {
      area,
      city,
      state,
      country,
      location,
    });

    logger.info(
      {
        action: 'scrape_started',
        keyword,
        area,
        city,
        state,
        country,
        sources: resolvedSources,
        limit,
        sessionId,
        searchQuery,
        engine: 'python',
        countryRouting: isIndiaCountry(country) ? 'india' : 'international',
      },
      `[SCRAPER_SERVICE] Delegating "${keyword}" in ${[area, city, state, country].filter(Boolean).join(', ') || location || 'unspecified'} → Python`
    );

    // Delegate 100% to Python scraper service
    let result: PythonScrapeResult;
    try {
      result = await pythonScraperService.scrape(
        {
          keyword,
          location: location || searchQuery,
          state,
          city,
          area,
          country,
          sources: resolvedSources,
          limit,
          businessType: businessType || keyword,
          sessionId,
          maxResults: maxResults ?? (limit > 0 ? limit : undefined),
          resumeSessionId,
        },
        sessionId
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ err: msg, keyword, sessionId }, '[SCRAPER_SERVICE] pythonScraperService threw');
      return {
        success: false,
        message: `Scraper error: ${msg}`,
        results: {},
        totalExtracted: 0,
        totalStored: 0,
        totalDuplicates: 0,
        leads: [],
        errors: [{ source: 'python-scraper', keyword, error: msg }],
      };
    }

    // Build per-source results map for callers that expect it
    const resultsMap: ScrapeResult['results'] = {};
    for (const sr of result.sourceResults ?? []) {
      resultsMap[sr.source] = {
        totalExtracted: sr.totalExtracted,
        totalStored: sr.totalStored,
        totalDuplicates: sr.totalDuplicates,
      };
    }

    logger.info(
      {
        action: 'scrape_completed',
        totalExtracted: result.totalExtracted,
        totalStored: result.totalStored,
        totalDuplicates: result.totalDuplicates,
        sources: resolvedSources,
        keyword,
        area,
        city,
        state,
        country,
        success: result.success,
        errorCount: result.errors?.length ?? 0,
        engine: 'python',
      },
      `[SCRAPER_SERVICE] Done: ${result.message}`
    );

    return {
      success: result.success,
      message: result.message,
      results: resultsMap,
      totalExtracted: result.totalExtracted,
      totalStored: result.totalStored,
      totalDuplicates: result.totalDuplicates,
      leads: result.leads,
      errors: result.errors?.map((e) => ({
        source: e.source,
        keyword,
        error: e.error,
      })),
    };
  }

  private _cancelled(): ScrapeResult {
    return {
      success: false,
      message: 'Scrape cancelled',
      results: {},
      totalExtracted: 0,
      totalStored: 0,
      totalDuplicates: 0,
      leads: [],
    };
  }
}

export const scraperService = new ScraperService();
