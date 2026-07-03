/**
 * python-scraper.service.ts
 *
 * HTTP client that Node.js uses to delegate ALL scraping to the Python FastAPI service.
 * Node.js no longer runs Playwright. This service makes the HTTP call, receives leads,
 * stores them in MongoDB, and notifies the frontend via Socket.IO.
 *
 * Python Scraper API:  POST http://<PYTHON_SCRAPER_URL>/api/v1/scrape
 */

import { logger } from '../utils/logger';
import { Lead } from '../models/Lead';
import { searchStatus } from './search-status.service';
import { leadEnrichmentPipeline } from './lead-enrichment-pipeline.service';
import { leadEnrichmentOrchestrator } from '../enrichment';
import { websiteAnalysisService } from './website-analysis.service';
import { classifyWebsiteUrl } from '../modules/leads/services/urlClassifier.service';

// ─── Config ──────────────────────────────────────────────────────────────────

const PYTHON_SCRAPER_URL =
  process.env.PYTHON_SCRAPER_URL || 'http://localhost:8001';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '').replace(/\/api\/v1$/, '');
}

const normalizedPythonScraperUrl = normalizeBaseUrl(PYTHON_SCRAPER_URL);
const normalizedAiServiceUrl = normalizeBaseUrl(AI_SERVICE_URL);

if (normalizedPythonScraperUrl === normalizedAiServiceUrl) {
  logger.warn(
    {
      pythonScraperUrl: PYTHON_SCRAPER_URL,
      aiServiceUrl: AI_SERVICE_URL,
    },
    '[PYTHON_SCRAPER] PYTHON_SCRAPER_URL matches AI_SERVICE_URL — using unified Python service deployment'
  );
}

const REQUEST_TIMEOUT_MS = Number(process.env.PYTHON_SCRAPER_TIMEOUT_MS) || 600_000; // 10 min

// ─── Types (matching Python ScrapeRequest / ScrapeResponse) ───────────────────

export interface PythonScrapeRequest {
  keyword: string;
  location?: string;
  state?: string;
  city?: string;
  area?: string;
  country?: string;
  sources: string[];
  limit: number;
  businessType?: string;
  sessionId?: string;
  maxResults?: number;
  resumeSessionId?: string;
}

export interface PythonSourceResult {
  source: string;
  totalExtracted: number;
  totalStored: number;
  totalDuplicates: number;
  success: boolean;
  error?: string;
}

export interface PythonScrapedLead {
  companyName: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  category?: string;
  rating?: number;
  reviewsCount?: number;
  source: string;
  sourceUrl?: string;
  placeId?: string;
  href?: string;
  city?: string;
  state?: string;
  area?: string;
  country?: string;
  businessType?: string;
  fullSearchQuery?: string;
  searchedKeyword?: string;
  searchedLocation?: string;
  searchedCity?: string;
  searchedState?: string;
  searchedArea?: string;
  searchedCountry?: string;
  searchedBusinessType?: string;
  latitude?: number;
  longitude?: number;
  pincode?: string;
  postalCode?: string;
  streetAddress?: string;
  workingHours?: string;
  businessStatus?: string;
  plusCode?: string;
  secondaryCategories?: string[];
  serviceOptions?: string[];
  ownerClaimed?: boolean;
  totalPhotos?: number;
  searchRank?: number;
  relevanceScore?: number;
  leadScore?: number;
  semanticKeyword?: string;
  socialLinks?: Record<string, string>;
  additionalPhones?: string[];
  additionalEmails?: string[];
  whatsappNumber?: string;
  technologyStack?: string[];
  sslEnabled?: boolean;
  businessDescription?: string;
}

export interface PythonScrapeResponse {
  success: boolean;
  message: string;
  sessionId?: string;
  totalExtracted: number;
  totalStored: number;
  totalDuplicates: number;
  sourceResults: PythonSourceResult[];
  leads: PythonScrapedLead[];
  errors?: Array<{ source: string; error: string }>;
}

export interface PythonScrapeStartResponse {
  success: boolean;
  message: string;
  jobId: string;
  sessionId: string;
}

export interface PythonScrapeStatusResponse {
  success: boolean;
  data: {
    jobId: string;
    sessionId: string;
    status: string;
    message?: string;
    lastHeartbeat?: string;
    createdAt?: string;
    updatedAt?: string;
    startedAt?: string;
    completedAt?: string;
    result?: PythonScrapeResponse;
    error?: string;
    newLeads?: PythonScrapedLead[];
  };
}

export interface PythonScrapeResult {
  success: boolean;
  message: string;
  totalExtracted: number;
  totalStored: number;
  totalDuplicates: number;
  sourceResults: PythonSourceResult[];
  leads: PythonScrapedLead[];
  errors?: Array<{ source: string; error: string }>;
}

// ─── Marketplace platform classifier (mirrors base-source.ts) ─────────────────

const MARKETPLACE_PLATFORM_MAP: Record<string, string> = {
  justdial: 'justdial',
  indiamart: 'indiamart',
  sulekha: 'sulekha',
  tradeindia: 'tradeindia',
  yellowpages: 'yellowpages',
  amazon: 'amazon',
  flipkart: 'flipkart',
  meesho: 'meesho',
};

function classifyLeadWebsite(
  doc: Record<string, unknown>,
  website: string | undefined
): void {
  if (!website) return;
  const analysis = websiteAnalysisService.getLeadFields(website);
  doc.website = analysis.website;
  doc.hasWebsite = analysis.hasWebsite;
  doc.normalizedDomain = analysis.normalizedDomain;
  doc.analysisEligible = analysis.analysisEligible;
  doc.hasRealWebsite = analysis.analysisEligible;
  doc.websiteType = analysis.websiteType;
  doc.websiteAuditAllowed = analysis.analysisEligible;

  if (!analysis.analysisEligible) {
    const classification = classifyWebsiteUrl(website);
    if (classification.normalizedUrl && classification.websiteType !== 'INVALID_URL') {
      const existing = (doc.socialLinks || {}) as Record<string, unknown>;
      for (const [k, v] of Object.entries(classification.socialProfiles || {})) {
        if (k === 'other' && Array.isArray(v)) {
          const prev = (existing.other as string[]) || [];
          existing.other = [...prev, ...v];
        } else if (typeof v === 'string' && v) {
          existing[k] = v;
        }
      }
      if (
        classification.websiteType === 'MARKETPLACE_PROFILE' &&
        classification.normalizedUrl
      ) {
        const mkt = (doc.marketplaceLinks || {}) as Record<string, unknown>;
        const hostname = classification.normalizedUrl
          .replace(/^https?:\/\//, '')
          .replace(/\/.*$/, '')
          .toLowerCase();
        for (const [domain, platform] of Object.entries(MARKETPLACE_PLATFORM_MAP)) {
          if (hostname.includes(domain)) {
            mkt[platform] = classification.normalizedUrl;
            break;
          }
        }
      }
    }
  }
}

// ─── Lead score calculator (mirrors lead-storage.ts) ──────────────────────────

function calculateLeadScore(lead: PythonScrapedLead): number {
  let score = 0;
  if (lead.website) score += 20;
  if (lead.phone) score += 15;
  if (lead.email) score += 15;
  if (lead.address) score += 10;
  if (lead.streetAddress) score += 3;
  if (lead.postalCode) score += 2;
  if (lead.category) score += 5;
  if (lead.secondaryCategories?.length) score += 3;
  if (lead.rating && lead.rating > 0) score += 5;
  if (lead.reviewsCount && lead.reviewsCount > 0) score += 5;
  if (lead.reviewsCount && lead.reviewsCount > 50) score += 3;
  if (lead.workingHours) score += 5;
  if (lead.businessStatus) score += 3;
  if (lead.plusCode) score += 2;
  if (lead.latitude !== undefined && lead.longitude !== undefined) score += 3;
  if (lead.serviceOptions?.length) score += 2;
  if (lead.ownerClaimed) score += 2;
  return Math.min(score, 100);
}

// ─── Duplicate detection + MongoDB storage ────────────────────────────────────

interface StorageResult {
  totalStored: number;
  totalDuplicates: number;
  storedIds: string[];
}

async function storeLeadsInMongo(
  leads: PythonScrapedLead[],
  sessionId: string,
  skipEnrichment = false
): Promise<StorageResult> {
  if (!leads.length) return { totalStored: 0, totalDuplicates: 0, storedIds: [] };

  // Build dedup conditions in one batch query
  const conditions: Record<string, unknown>[] = [];
  for (const lead of leads) {
    const name = lead.companyName?.trim();
    if (!name) continue;
    const or: Record<string, unknown>[] = [];
    if (lead.phone && lead.phone.length >= 10) or.push({ phone: lead.phone });
    if (lead.website?.trim()) or.push({ website: lead.website.trim() });
    if (lead.address?.trim()) or.push({ companyName: name, address: lead.address.trim() });
    if (lead.placeId) or.push({ 'sourceMetadata.placeId': lead.placeId });
    if (!or.length) or.push({ companyName: name, source: lead.source });
    conditions.push({ $or: or });
  }

  const existing = await Lead.find({ $or: conditions }, 'phone website address companyName source sourceMetadata').lean();

  const existingPhones = new Set(existing.map((e: any) => e.phone).filter(Boolean));
  const existingWebsites = new Set(existing.map((e: any) => e.website?.trim()).filter(Boolean));
  const existingPlaceIds = new Set(existing.map((e: any) => e.sourceMetadata?.placeId).filter(Boolean));

  const toInsert: Record<string, unknown>[] = [];
  let totalDuplicates = 0;

  for (const lead of leads) {
    const name = lead.companyName?.trim();
    if (!name) continue;

    const isDup =
      (lead.phone && existingPhones.has(lead.phone)) ||
      (lead.website && existingWebsites.has(lead.website.trim())) ||
      (lead.placeId && existingPlaceIds.has(lead.placeId));

    if (isDup) {
      totalDuplicates++;
      continue;
    }

    const doc: Record<string, unknown> = {
      companyName: name,
      phone: lead.phone || undefined,
      additionalPhones: lead.additionalPhones?.length ? lead.additionalPhones : undefined,
      website: lead.website || undefined,
      email: lead.email || undefined,
      additionalEmails: lead.additionalEmails?.length ? lead.additionalEmails : undefined,
      whatsappNumber: lead.whatsappNumber || undefined,
      address: lead.address || undefined,
      category: lead.category || undefined,
      secondaryCategories: lead.secondaryCategories?.length ? lead.secondaryCategories : undefined,
      source: lead.source,
      rating: lead.rating || undefined,
      reviewsCount: lead.reviewsCount || undefined,
      totalPhotos: lead.totalPhotos ?? undefined,
      leadScore: lead.leadScore ?? calculateLeadScore(lead),
      sourceUrl: lead.sourceUrl || undefined,
      extractionSource: lead.source,
      relevanceScore: lead.relevanceScore || 0,
      searchedKeyword: lead.searchedKeyword || '',
      searchedLocation: lead.searchedLocation || '',
      searchedArea: lead.searchedArea || lead.area || '',
      searchedCity: lead.searchedCity || lead.city || '',
      searchedState: lead.searchedState || lead.state || '',
      searchedCountry: lead.searchedCountry || lead.country || '',
      searchedBusinessType: lead.searchedBusinessType || lead.businessType || '',
      fullSearchQuery: lead.fullSearchQuery || '',
      searchSessionId: sessionId,
      pincode: lead.pincode || undefined,
      postalCode: lead.postalCode || undefined,
      streetAddress: lead.streetAddress || undefined,
      latitude: lead.latitude ?? undefined,
      longitude: lead.longitude ?? undefined,
      workingHours: lead.workingHours || undefined,
      businessStatus: lead.businessStatus || undefined,
      businessDescription: lead.businessDescription || undefined,
      technologyStack: lead.technologyStack?.length ? lead.technologyStack : undefined,
      sslEnabled: lead.sslEnabled ?? undefined,
      serviceOptions: lead.serviceOptions?.length ? lead.serviceOptions : undefined,
      ownerClaimed: lead.ownerClaimed ?? undefined,
      plusCode: lead.plusCode || undefined,
      searchRank: lead.searchRank ?? undefined,
      semanticKeyword: lead.semanticKeyword || lead.searchedKeyword || '',
      sourceMetadata: {
        source: lead.source,
        placeId: lead.placeId || undefined,
        extractedAt: new Date().toISOString(),
        searchedKeyword: lead.searchedKeyword || '',
        searchedLocation: lead.searchedLocation || '',
        searchedArea: lead.searchedArea || lead.area || '',
        searchedCity: lead.searchedCity || lead.city || '',
        searchedState: lead.searchedState || lead.state || '',
        searchedCountry: lead.searchedCountry || lead.country || '',
        searchedBusinessType: lead.searchedBusinessType || lead.businessType || '',
        fullSearchQuery: lead.fullSearchQuery || '',
      },
    };

    // Classify website (social/marketplace/real)
    classifyLeadWebsite(doc, lead.website);

    // Merge social links from Python scraper
    if (lead.socialLinks && Object.keys(lead.socialLinks).length > 0) {
      doc.socialLinks = lead.socialLinks;
    }

    toInsert.push(doc);
  }

  if (!toInsert.length) {
    return { totalStored: 0, totalDuplicates, storedIds: [] };
  }

  let storedIds: string[] = [];
  try {
    const inserted = await Lead.insertMany(toInsert, { ordered: false });
    storedIds = inserted.map((d: any) => d._id?.toString()).filter(Boolean);

    if (!skipEnrichment && storedIds.length > 0) {
      leadEnrichmentPipeline.enqueueMultiple(storedIds);
      leadEnrichmentOrchestrator.enqueueMultiple(storedIds);
    }

    logger.info(
      { stored: inserted.length, duplicates: totalDuplicates, session: sessionId },
      '[PYTHON_SCRAPER] Leads stored in MongoDB'
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err: msg }, '[PYTHON_SCRAPER] MongoDB insertMany failed');
  }

  return { totalStored: storedIds.length, totalDuplicates, storedIds };
}

// ─── Main service class ───────────────────────────────────────────────────────

export class PythonScraperService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = normalizeBaseUrl(PYTHON_SCRAPER_URL);
  }

  /**
   * Ping the Python service to confirm it is reachable.
   */
  async healthCheck(): Promise<boolean> {
    const healthUrl = `${this.baseUrl}/api/v1/health`;
    logger.info({ healthUrl }, '[PYTHON_SCRAPER] Checking Python scraper health');
    try {
      const res = await fetch(healthUrl, {
        signal: AbortSignal.timeout(5000),
      });
      logger.info({ healthUrl, status: res.status }, '[PYTHON_SCRAPER] Health check response');
      return res.ok;
    } catch (err: unknown) {
      logger.error({ err: err instanceof Error ? err.message : String(err), healthUrl }, '[PYTHON_SCRAPER] Health check failed');
      return false;
    }
  }

  /**
   * Call Python scraper, receive leads, store in MongoDB, emit Socket.IO progress.
   * This is the ONLY method Node.js calls to perform scraping.
   */
  async scrape(
    request: PythonScrapeRequest,
    sessionId: string
  ): Promise<PythonScrapeResult> {
    const targetUrl = `${this.baseUrl}/api/v1/scrape`;
    logger.info(
      {
        keyword: request.keyword,
        sources: request.sources,
        city: request.city,
        area: request.area,
        sessionId,
        targetUrl,
      },
      '[PYTHON_SCRAPER] Delegating scrape to Python service'
    );

    // Update Socket.IO status
    searchStatus.addLog(sessionId, '[PYTHON_SCRAPER] Calling Python scraper...', 'info');

    let raw: PythonScrapeResponse;

    interface StartPayload {
      keyword: string;
      location?: string;
      state?: string;
      city?: string;
      area?: string;
      country?: string;
      sources: string[];
      limit: number;
      businessType?: string;
      sessionId?: string;
      maxResults?: number;
      resumeSessionId?: string;
    }

    const startPayload: StartPayload = { ...request, sessionId };
    const startUrl = `${this.baseUrl}/api/v1/scrape/start`;

    let startResponse: PythonScrapeStartResponse | undefined;
    let jobId: string;
    let lastStatus: string | null = null;
    let lastStage: string | null = null;
    let lastHeartbeatValue: string | null = null;
    let lastActivityTimestamp = Date.now();

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      logger.info({ startUrl, sessionId, startPayload }, '[PYTHON_SCRAPER] Calling async scraper start');
      const res = await fetch(startUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(startPayload),
        signal: controller.signal,
      });
      clearTimeout(timer);

      const body = await res.text().catch(() => '');
      logger.info({ startUrl, sessionId, status: res.status, body }, '[PYTHON_SCRAPER] Async start response');
      if (!res.ok) {
        const msg = `Python async scraper returned HTTP ${res.status}: ${body}`;
        logger.error({ msg, startUrl, sessionId }, '[PYTHON_SCRAPER] Async start failed');
        throw new Error(msg);
      }

      startResponse = body ? (JSON.parse(body) as PythonScrapeStartResponse) : undefined;
      if (!startResponse || !startResponse.jobId) {
        throw new Error(`Invalid start response from Python scraper: ${body}`);
      }
      jobId = startResponse.jobId;
      logger.info({ jobId, sessionId }, '[PYTHON_SCRAPER] Async scrape job started');
      searchStatus.addLog(sessionId, `[PYTHON_SCRAPER] Async job started: ${jobId}`, 'info');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ err: msg, sessionId, startUrl }, '[PYTHON_SCRAPER] Async start call failed');
      searchStatus.addLog(sessionId, `[PYTHON_SCRAPER] Failed to start async scrape: ${msg}`, 'error');
      return {
        success: false,
        message: `Python scraper unreachable: ${msg}`,
        totalExtracted: 0,
        totalStored: 0,
        totalDuplicates: 0,
        sourceResults: [],
        leads: [],
        errors: [{ source: 'python-scraper', error: msg }],
      };
    }

    const statusUrl = `${this.baseUrl}/api/v1/scrape/status/${jobId}?consume_leads=true`;
    const pollIntervalMs = 2000;
    const stuckTimeoutMs = 90_000;
    const overallTimeoutMs = REQUEST_TIMEOUT_MS;
    const startPoll = Date.now();

    while (true) {
      const elapsed = Date.now() - startPoll;
      if (elapsed >= overallTimeoutMs) {
        const msg = `Async scraper status polling timed out after ${Math.round(elapsed / 1000)}s`;
        logger.error({ msg, jobId, sessionId }, '[PYTHON_SCRAPER] Async poll timed out');
        searchStatus.addLog(sessionId, `[PYTHON_SCRAPER] ${msg}`, 'error');
        return {
          success: false,
          message: msg,
          totalExtracted: 0,
          totalStored: 0,
          totalDuplicates: 0,
          sourceResults: [],
          leads: [],
          errors: [{ source: 'python-scraper', error: msg }],
        };
      }

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 30000); // Increased from 15s to 30s

        logger.info({ statusUrl, jobId, sessionId, attempt: Math.round(elapsed / pollIntervalMs) + 1 }, '[PYTHON_SCRAPER] Polling job status');
        const res = await fetch(statusUrl, {
          method: 'GET',
          signal: controller.signal,
        });
        clearTimeout(timer);

        const body = await res.text().catch(() => '');
        logger.info({ statusUrl, jobId, sessionId, status: res.status, body }, '[PYTHON_SCRAPER] Poll response');

        if (!res.ok) {
          const msg = `Python async scraper status returned HTTP ${res.status}: ${body}`;
          logger.error({ msg, statusUrl, jobId, sessionId }, '[PYTHON_SCRAPER] Async status polling failed');
          throw new Error(msg);
        }

        const statusResponse = body ? (JSON.parse(body) as PythonScrapeStatusResponse) : undefined;
        if (!statusResponse || !statusResponse.data || !statusResponse.data.status) {
          throw new Error(`Invalid status response from Python scraper: ${body}`);
        }

        const status = (statusResponse.data.status || '').toUpperCase();
        const message = statusResponse.data.message || '';
        const currentStage = (statusResponse.data as any).currentStage || '';
        const pythonUpdatedAt = statusResponse.data.updatedAt;
        const pythonLastHeartbeat = statusResponse.data.lastHeartbeat;

        let activityDetected = false;

        if (status !== lastStatus) {
          lastStatus = status;
          activityDetected = true;
          logger.info({ jobId, sessionId, status, message }, '[PYTHON_SCRAPER] Job status changed');
          searchStatus.addLog(sessionId, `[PYTHON_SCRAPER] Job ${jobId} status: ${status}`, 'info');
        }

        if (currentStage && currentStage !== lastStage) {
          lastStage = currentStage;
          activityDetected = true;
          logger.info({ jobId, sessionId, stage: currentStage }, '[PYTHON_SCRAPER] Job stage changed');
        }

        if (pythonLastHeartbeat && pythonLastHeartbeat !== lastHeartbeatValue) {
          lastHeartbeatValue = pythonLastHeartbeat;
          activityDetected = true;
        }

        // --- Python AI Service now processes leads directly via Webhooks and MongoDB ---
        // We only use this polling loop to monitor job lifecycle (status, stage, heartbeat).

        // If Python is explicitly sending updated timestamps, we consider the job active
        // A timestamp change (e.g. heartbeat) proves the Python event loop is alive.
        const activeStatuses = ['QUEUED', 'PENDING', 'STARTING', 'RUNNING', 'SCRAPING', 'SAVING', 'FINALIZING'];

        if (activeStatuses.includes(status)) {
          // Reset activity timestamp if we see a fresh heartbeat from Python
          if (activityDetected) {
              lastActivityTimestamp = Date.now();
          }

          if (Date.now() - lastActivityTimestamp > stuckTimeoutMs) {
            const msg = `AI service unresponsive: job ${jobId} stuck in status ${status} for more than 90 seconds`;
            logger.error({ msg, jobId, sessionId }, '[PYTHON_SCRAPER] Async job stuck');
            searchStatus.addLog(sessionId, `[PYTHON_SCRAPER] ${msg}`, 'error');
            return {
              success: false,
              message: msg,
              totalExtracted: 0,
              totalStored: 0,
              totalDuplicates: 0,
              sourceResults: [],
              leads: [],
              errors: [{ source: 'python-scraper', error: msg }],
            };
          }
          await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
          continue;
        }

        if (status === 'COMPLETED') {
          const result = statusResponse.data.result;
          if (!result) {
            throw new Error(`Async job completed without result: ${body}`);
          }
          raw = result;
          break;
        }

        if (status === 'FAILED' || status === 'STOPPED') {
          const error = statusResponse.data.error || message || 'Async scrape job failed';
          logger.error({ jobId, sessionId, error }, '[PYTHON_SCRAPER] Async job failed');
          searchStatus.addLog(sessionId, `[PYTHON_SCRAPER] Async job failed: ${error}`, 'error');
          return {
            success: false,
            message: error,
            totalExtracted: 0,
            totalStored: 0,
            totalDuplicates: 0,
            sourceResults: [],
            leads: [],
            errors: [{ source: 'python-scraper', error }],
          };
        }

        const unknownStatus = `Unknown async job status: ${status}`;
        logger.error({ jobId, sessionId, status, message }, '[PYTHON_SCRAPER] Async job returned unknown status');
        throw new Error(unknownStatus);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        
        // Transient error check (AbortError or fetch failed)
        if (msg.includes('aborted') || msg.includes('fetch failed') || msg.includes('ECONNREFUSED')) {
          logger.warn({ err: msg, jobId, sessionId }, '[PYTHON_SCRAPER] Transient network error during poll, retrying...');
          searchStatus.addLog(sessionId, `[PYTHON_SCRAPER] Transient network error: ${msg}. Retrying...`, 'warning');
          await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
          continue;
        }

        logger.error({ err: msg, jobId, sessionId }, '[PYTHON_SCRAPER] Async status polling error');
        searchStatus.addLog(sessionId, `[PYTHON_SCRAPER] Async poll error: ${msg}`, 'error');
        return {
          success: false,
          message: `Python scraper status polling failed: ${msg}`,
          totalExtracted: 0,
          totalStored: 0,
          totalDuplicates: 0,
          sourceResults: [],
          leads: [],
          errors: [{ source: 'python-scraper', error: msg }],
        };
      }
    }

    logger.info(
      {
        pythonExtracted: raw.totalExtracted,
        pythonLeads: raw.leads?.length ?? 0,
        pythonSuccess: raw.success,
        sessionId,
      },
      '[PYTHON_SCRAPER] Received response from Python service after async polling'
    );

    searchStatus.addLog(
      sessionId,
      `[PYTHON_SCRAPER] Received ${raw.leads?.length ?? 0} leads from Python`,
      'info'
    );

    // Emit live lead progress for any remaining leads (if it wasn't streaming)
    if (raw.leads?.length) {
      for (const lead of raw.leads) {
        // Only if they weren't already sent. Python now clears newLeads, but raw.leads might contain all of them.
        // Node.js dedup handles duplicates. However, we don't want to incrementFound again for already emitted leads.
        // It's safer to rely entirely on streaming counters if streaming is active. 
        // For now, we'll let the final block run as a catch-all, but we should be aware of double counting found leads.
        // A better approach is checking if we already processed them, but `storeLeadsInMongo` dedups cleanly.
      }
    }

    // Store leads in MongoDB (dedup + enrich) (catch-all for remaining)
    const stored = await storeLeadsInMongo(raw.leads ?? [], sessionId);

    // Update source breakdown for Socket.IO (Final)
    for (const sr of raw.sourceResults ?? []) {
      if (sr.totalStored > 0) {
        searchStatus.updateSourceBreakdown(sessionId, sr.source, sr.totalStored);
      }
    }

    // Emit saved count (only for the leftovers if any)
    if (stored.totalStored > 0) {
      searchStatus.incrementSaved(sessionId, stored.totalStored);
    }
    if (stored.totalDuplicates > 0) {
      searchStatus.incrementDuplicates(sessionId, stored.totalDuplicates);
    }

    // Wait for final Socket.IO sync before returning
    await new Promise(resolve => setTimeout(resolve, 500));

    const message = stored.totalStored > 0
      ? `Scraping completed: ${stored.totalStored} leads saved, ${stored.totalDuplicates} duplicates`
      : raw.success
        ? `No new leads (${stored.totalDuplicates} duplicates)`
        : raw.message;

    return {
      success: raw.success || stored.totalStored > 0,
      message,
      totalExtracted: raw.totalExtracted,
      totalStored: stored.totalStored,
      totalDuplicates: stored.totalDuplicates,
      sourceResults: raw.sourceResults ?? [],
      leads: raw.leads ?? [],
      errors: raw.errors,
    };
  }
}

export const pythonScraperService = new PythonScraperService();
