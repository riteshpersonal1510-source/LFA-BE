"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pythonScraperService = exports.PythonScraperService = void 0;
const logger_1 = require("../utils/logger");
const Lead_1 = require("../models/Lead");
const search_status_service_1 = require("./search-status.service");
const lead_enrichment_pipeline_service_1 = require("./lead-enrichment-pipeline.service");
const enrichment_1 = require("../enrichment");
const website_analysis_service_1 = require("./website-analysis.service");
const urlClassifier_service_1 = require("../modules/leads/services/urlClassifier.service");
const PYTHON_SCRAPER_URL = process.env.PYTHON_SCRAPER_URL || 'http://localhost:8001';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
function normalizeBaseUrl(url) {
    return url.replace(/\/+$/, '').replace(/\/api\/v1$/, '');
}
const normalizedPythonScraperUrl = normalizeBaseUrl(PYTHON_SCRAPER_URL);
const normalizedAiServiceUrl = normalizeBaseUrl(AI_SERVICE_URL);
if (normalizedPythonScraperUrl === normalizedAiServiceUrl) {
    logger_1.logger.warn({
        pythonScraperUrl: PYTHON_SCRAPER_URL,
        aiServiceUrl: AI_SERVICE_URL,
    }, '[PYTHON_SCRAPER] PYTHON_SCRAPER_URL matches AI_SERVICE_URL — using unified Python service deployment');
}
const REQUEST_TIMEOUT_MS = Number(process.env.PYTHON_SCRAPER_TIMEOUT_MS) || 600_000;
const MARKETPLACE_PLATFORM_MAP = {
    justdial: 'justdial',
    indiamart: 'indiamart',
    sulekha: 'sulekha',
    tradeindia: 'tradeindia',
    yellowpages: 'yellowpages',
    amazon: 'amazon',
    flipkart: 'flipkart',
    meesho: 'meesho',
};
function classifyLeadWebsite(doc, website) {
    if (!website)
        return;
    const analysis = website_analysis_service_1.websiteAnalysisService.getLeadFields(website);
    doc.website = analysis.website;
    doc.hasWebsite = analysis.hasWebsite;
    doc.normalizedDomain = analysis.normalizedDomain;
    doc.analysisEligible = analysis.analysisEligible;
    doc.hasRealWebsite = analysis.analysisEligible;
    doc.websiteType = analysis.websiteType;
    doc.websiteAuditAllowed = analysis.analysisEligible;
    if (!analysis.analysisEligible) {
        const classification = (0, urlClassifier_service_1.classifyWebsiteUrl)(website);
        if (classification.normalizedUrl && classification.websiteType !== 'INVALID_URL') {
            const existing = (doc.socialLinks || {});
            for (const [k, v] of Object.entries(classification.socialProfiles || {})) {
                if (k === 'other' && Array.isArray(v)) {
                    const prev = existing.other || [];
                    existing.other = [...prev, ...v];
                }
                else if (typeof v === 'string' && v) {
                    existing[k] = v;
                }
            }
            if (classification.websiteType === 'MARKETPLACE_PROFILE' &&
                classification.normalizedUrl) {
                const mkt = (doc.marketplaceLinks || {});
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
function calculateLeadScore(lead) {
    let score = 0;
    if (lead.website)
        score += 20;
    if (lead.phone)
        score += 15;
    if (lead.email)
        score += 15;
    if (lead.address)
        score += 10;
    if (lead.streetAddress)
        score += 3;
    if (lead.postalCode)
        score += 2;
    if (lead.category)
        score += 5;
    if (lead.secondaryCategories?.length)
        score += 3;
    if (lead.rating && lead.rating > 0)
        score += 5;
    if (lead.reviewsCount && lead.reviewsCount > 0)
        score += 5;
    if (lead.reviewsCount && lead.reviewsCount > 50)
        score += 3;
    if (lead.workingHours)
        score += 5;
    if (lead.businessStatus)
        score += 3;
    if (lead.plusCode)
        score += 2;
    if (lead.latitude !== undefined && lead.longitude !== undefined)
        score += 3;
    if (lead.serviceOptions?.length)
        score += 2;
    if (lead.ownerClaimed)
        score += 2;
    return Math.min(score, 100);
}
async function storeLeadsInMongo(leads, sessionId, skipEnrichment = false) {
    if (!leads.length)
        return { totalStored: 0, totalDuplicates: 0, storedIds: [] };
    const conditions = [];
    for (const lead of leads) {
        const name = lead.companyName?.trim();
        if (!name)
            continue;
        const or = [];
        if (lead.phone && lead.phone.length >= 10)
            or.push({ phone: lead.phone });
        if (lead.website?.trim())
            or.push({ website: lead.website.trim() });
        if (lead.address?.trim())
            or.push({ companyName: name, address: lead.address.trim() });
        if (lead.placeId)
            or.push({ 'sourceMetadata.placeId': lead.placeId });
        if (!or.length)
            or.push({ companyName: name, source: lead.source });
        conditions.push({ $or: or });
    }
    const existing = await Lead_1.Lead.find({ $or: conditions }, 'phone website address companyName source sourceMetadata').lean();
    const existingPhones = new Set(existing.map((e) => e.phone).filter(Boolean));
    const existingWebsites = new Set(existing.map((e) => e.website?.trim()).filter(Boolean));
    const existingPlaceIds = new Set(existing.map((e) => e.sourceMetadata?.placeId).filter(Boolean));
    const toInsert = [];
    let totalDuplicates = 0;
    for (const lead of leads) {
        const name = lead.companyName?.trim();
        if (!name)
            continue;
        const isDup = (lead.phone && existingPhones.has(lead.phone)) ||
            (lead.website && existingWebsites.has(lead.website.trim())) ||
            (lead.placeId && existingPlaceIds.has(lead.placeId));
        if (isDup) {
            totalDuplicates++;
            continue;
        }
        const doc = {
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
        classifyLeadWebsite(doc, lead.website);
        if (lead.socialLinks && Object.keys(lead.socialLinks).length > 0) {
            doc.socialLinks = lead.socialLinks;
        }
        toInsert.push(doc);
    }
    if (!toInsert.length) {
        return { totalStored: 0, totalDuplicates, storedIds: [] };
    }
    let storedIds = [];
    try {
        const inserted = await Lead_1.Lead.insertMany(toInsert, { ordered: false });
        storedIds = inserted.map((d) => d._id?.toString()).filter(Boolean);
        if (!skipEnrichment && storedIds.length > 0) {
            lead_enrichment_pipeline_service_1.leadEnrichmentPipeline.enqueueMultiple(storedIds);
            enrichment_1.leadEnrichmentOrchestrator.enqueueMultiple(storedIds);
        }
        logger_1.logger.info({ stored: inserted.length, duplicates: totalDuplicates, session: sessionId }, '[PYTHON_SCRAPER] Leads stored in MongoDB');
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger_1.logger.error({ err: msg }, '[PYTHON_SCRAPER] MongoDB insertMany failed');
    }
    return { totalStored: storedIds.length, totalDuplicates, storedIds };
}
class PythonScraperService {
    constructor() {
        this.baseUrl = normalizeBaseUrl(PYTHON_SCRAPER_URL);
    }
    async healthCheck() {
        const healthUrl = `${this.baseUrl}/api/v1/health`;
        logger_1.logger.info({ healthUrl }, '[PYTHON_SCRAPER] Checking Python scraper health');
        try {
            const res = await fetch(healthUrl, {
                signal: AbortSignal.timeout(5000),
            });
            logger_1.logger.info({ healthUrl, status: res.status }, '[PYTHON_SCRAPER] Health check response');
            return res.ok;
        }
        catch (err) {
            logger_1.logger.error({ err: err instanceof Error ? err.message : String(err), healthUrl }, '[PYTHON_SCRAPER] Health check failed');
            return false;
        }
    }
    async scrape(request, sessionId) {
        const targetUrl = `${this.baseUrl}/api/v1/scrape`;
        logger_1.logger.info({
            keyword: request.keyword,
            sources: request.sources,
            city: request.city,
            area: request.area,
            sessionId,
            targetUrl,
        }, '[PYTHON_SCRAPER] Delegating scrape to Python service');
        search_status_service_1.searchStatus.addLog(sessionId, '[PYTHON_SCRAPER] Calling Python scraper...', 'info');
        let raw;
        const startPayload = { ...request, sessionId };
        const startUrl = `${this.baseUrl}/api/v1/scrape/start`;
        let startResponse;
        let jobId;
        let lastStatus = null;
        let lastStage = null;
        let lastHeartbeatValue = null;
        let lastActivityTimestamp = Date.now();
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
            logger_1.logger.info({ startUrl, sessionId, startPayload }, '[PYTHON_SCRAPER] Calling async scraper start');
            const res = await fetch(startUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(startPayload),
                signal: controller.signal,
            });
            clearTimeout(timer);
            const body = await res.text().catch(() => '');
            logger_1.logger.info({ startUrl, sessionId, status: res.status, body }, '[PYTHON_SCRAPER] Async start response');
            if (!res.ok) {
                const msg = `Python async scraper returned HTTP ${res.status}: ${body}`;
                logger_1.logger.error({ msg, startUrl, sessionId }, '[PYTHON_SCRAPER] Async start failed');
                throw new Error(msg);
            }
            startResponse = body ? JSON.parse(body) : undefined;
            if (!startResponse || !startResponse.jobId) {
                throw new Error(`Invalid start response from Python scraper: ${body}`);
            }
            jobId = startResponse.jobId;
            logger_1.logger.info({ jobId, sessionId }, '[PYTHON_SCRAPER] Async scrape job started');
            search_status_service_1.searchStatus.addLog(sessionId, `[PYTHON_SCRAPER] Async job started: ${jobId}`, 'info');
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            logger_1.logger.error({ err: msg, sessionId, startUrl }, '[PYTHON_SCRAPER] Async start call failed');
            search_status_service_1.searchStatus.addLog(sessionId, `[PYTHON_SCRAPER] Failed to start async scrape: ${msg}`, 'error');
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
                logger_1.logger.error({ msg, jobId, sessionId }, '[PYTHON_SCRAPER] Async poll timed out');
                search_status_service_1.searchStatus.addLog(sessionId, `[PYTHON_SCRAPER] ${msg}`, 'error');
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
                const timer = setTimeout(() => controller.abort(), 15000);
                logger_1.logger.info({ statusUrl, jobId, sessionId, attempt: Math.round(elapsed / pollIntervalMs) + 1 }, '[PYTHON_SCRAPER] Polling job status');
                const res = await fetch(statusUrl, {
                    method: 'GET',
                    signal: controller.signal,
                });
                clearTimeout(timer);
                const body = await res.text().catch(() => '');
                logger_1.logger.info({ statusUrl, jobId, sessionId, status: res.status, body }, '[PYTHON_SCRAPER] Poll response');
                if (!res.ok) {
                    const msg = `Python async scraper status returned HTTP ${res.status}: ${body}`;
                    logger_1.logger.error({ msg, statusUrl, jobId, sessionId }, '[PYTHON_SCRAPER] Async status polling failed');
                    throw new Error(msg);
                }
                const statusResponse = body ? JSON.parse(body) : undefined;
                if (!statusResponse || !statusResponse.data || !statusResponse.data.status) {
                    throw new Error(`Invalid status response from Python scraper: ${body}`);
                }
                const status = (statusResponse.data.status || '').toUpperCase();
                const message = statusResponse.data.message || '';
                const currentStage = statusResponse.data.currentStage || '';
                const pythonUpdatedAt = statusResponse.data.updatedAt;
                const pythonLastHeartbeat = statusResponse.data.lastHeartbeat;
                let activityDetected = false;
                if (status !== lastStatus) {
                    lastStatus = status;
                    activityDetected = true;
                    logger_1.logger.info({ jobId, sessionId, status, message }, '[PYTHON_SCRAPER] Job status changed');
                    search_status_service_1.searchStatus.addLog(sessionId, `[PYTHON_SCRAPER] Job ${jobId} status: ${status}`, 'info');
                }
                if (currentStage && currentStage !== lastStage) {
                    lastStage = currentStage;
                    activityDetected = true;
                    logger_1.logger.info({ jobId, sessionId, stage: currentStage }, '[PYTHON_SCRAPER] Job stage changed');
                }
                if (pythonLastHeartbeat && pythonLastHeartbeat !== lastHeartbeatValue) {
                    lastHeartbeatValue = pythonLastHeartbeat;
                    activityDetected = true;
                }
                const activeStatuses = ['QUEUED', 'PENDING', 'STARTING', 'RUNNING', 'SCRAPING', 'SAVING', 'FINALIZING'];
                if (activeStatuses.includes(status)) {
                    if (activityDetected) {
                        lastActivityTimestamp = Date.now();
                    }
                    if (Date.now() - lastActivityTimestamp > stuckTimeoutMs) {
                        const msg = `AI service unresponsive: job ${jobId} stuck in status ${status} for more than 90 seconds`;
                        logger_1.logger.error({ msg, jobId, sessionId }, '[PYTHON_SCRAPER] Async job stuck');
                        search_status_service_1.searchStatus.addLog(sessionId, `[PYTHON_SCRAPER] ${msg}`, 'error');
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
                    logger_1.logger.error({ jobId, sessionId, error }, '[PYTHON_SCRAPER] Async job failed');
                    search_status_service_1.searchStatus.addLog(sessionId, `[PYTHON_SCRAPER] Async job failed: ${error}`, 'error');
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
                logger_1.logger.error({ jobId, sessionId, status, message }, '[PYTHON_SCRAPER] Async job returned unknown status');
                throw new Error(unknownStatus);
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                logger_1.logger.error({ err: msg, jobId, sessionId }, '[PYTHON_SCRAPER] Async status polling error');
                search_status_service_1.searchStatus.addLog(sessionId, `[PYTHON_SCRAPER] Async poll error: ${msg}`, 'error');
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
        logger_1.logger.info({
            pythonExtracted: raw.totalExtracted,
            pythonLeads: raw.leads?.length ?? 0,
            pythonSuccess: raw.success,
            sessionId,
        }, '[PYTHON_SCRAPER] Received response from Python service after async polling');
        search_status_service_1.searchStatus.addLog(sessionId, `[PYTHON_SCRAPER] Received ${raw.leads?.length ?? 0} leads from Python`, 'info');
        if (raw.leads?.length) {
            for (const lead of raw.leads) {
            }
        }
        const stored = await storeLeadsInMongo(raw.leads ?? [], sessionId);
        for (const sr of raw.sourceResults ?? []) {
            if (sr.totalStored > 0) {
                search_status_service_1.searchStatus.updateSourceBreakdown(sessionId, sr.source, sr.totalStored);
            }
        }
        if (stored.totalStored > 0) {
            search_status_service_1.searchStatus.incrementSaved(sessionId, stored.totalStored);
        }
        if (stored.totalDuplicates > 0) {
            search_status_service_1.searchStatus.incrementDuplicates(sessionId, stored.totalDuplicates);
        }
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
exports.PythonScraperService = PythonScraperService;
exports.pythonScraperService = new PythonScraperService();
//# sourceMappingURL=python-scraper.service.js.map