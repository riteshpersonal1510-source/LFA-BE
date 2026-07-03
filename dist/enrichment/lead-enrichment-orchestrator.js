"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadEnrichmentOrchestrator = void 0;
const Lead_1 = require("../models/Lead");
const logger_1 = require("../utils/logger");
const google_maps_detail_extractor_1 = require("./google-maps-detail-extractor");
const website_enrichment_service_1 = require("./website-enrichment.service");
const website_cache_service_1 = require("./website-cache.service");
const googleMapsDetailExtractor = new google_maps_detail_extractor_1.GoogleMapsDetailExtractor();
const websiteEnrichmentService = new website_enrichment_service_1.WebsiteEnrichmentService();
class LeadEnrichmentOrchestrator {
    constructor() {
        this.queue = [];
        this.processing = new Set();
        this.maxConcurrent = 5;
        this.running = false;
    }
    enqueue(leadId, priority = 0) {
        if (this.processing.has(leadId))
            return;
        const exists = this.queue.some(e => e.leadId === leadId);
        if (exists)
            return;
        this.queue.push({ leadId, priority });
        this.queue.sort((a, b) => b.priority - a.priority);
        if (!this.running)
            this.processQueue();
    }
    enqueueMultiple(leadIds, priority = 0) {
        for (const leadId of leadIds) {
            this.enqueue(leadId, priority);
        }
    }
    get queueSize() {
        return this.queue.length;
    }
    get activeCount() {
        return this.processing.size;
    }
    get status() {
        return {
            queueSize: this.queue.length,
            activeCount: this.processing.size,
            maxConcurrent: this.maxConcurrent,
            cacheSize: website_cache_service_1.websiteCache.size,
        };
    }
    async processQueue() {
        this.running = true;
        while (this.queue.length > 0 && this.processing.size < this.maxConcurrent) {
            const entry = this.queue.shift();
            if (!entry)
                break;
            if (this.processing.has(entry.leadId))
                continue;
            this.processing.add(entry.leadId);
            this.runEnrichment(entry.leadId).finally(() => {
                this.processing.delete(entry.leadId);
                if (this.queue.length > 0)
                    setImmediate(() => this.processQueue());
                else
                    this.running = false;
            });
        }
    }
    async enrichLead(leadId) {
        return this.runEnrichment(leadId);
    }
    async runEnrichment(leadId) {
        const startTime = Date.now();
        const result = {
            leadId,
            success: false,
            fieldsUpdated: [],
            errors: [],
            durationMs: 0,
        };
        try {
            const lead = await Lead_1.Lead.findById(leadId);
            if (!lead) {
                result.errors.push('Lead not found');
                result.durationMs = Date.now() - startTime;
                return result;
            }
            await Lead_1.Lead.findByIdAndUpdate(leadId, {
                $set: {
                    enrichmentStatus: 'running',
                    enrichmentStartedAt: new Date(),
                    enrichmentError: null,
                    enrichmentProgress: 10,
                    enrichmentCurrentStep: 'Google Maps detail extraction',
                },
            });
            if (lead.placeId || lead.sourceUrl) {
                try {
                    const detailData = await googleMapsDetailExtractor.extractDetail(lead.placeId || '', lead.sourceUrl);
                    if (detailData) {
                        result.googleMapsData = detailData;
                        const updates = this.buildGoogleMapsUpdates(lead, detailData);
                        if (Object.keys(updates).length > 0) {
                            await Lead_1.Lead.findByIdAndUpdate(leadId, { $set: updates });
                            result.fieldsUpdated.push(...Object.keys(updates));
                        }
                    }
                }
                catch (err) {
                    result.errors.push(`Google Maps detail: ${err instanceof Error ? err.message : String(err)}`);
                }
            }
            await Lead_1.Lead.findByIdAndUpdate(leadId, {
                $set: { enrichmentProgress: 40, enrichmentCurrentStep: 'Website analysis' },
            });
            const refreshedLead = await Lead_1.Lead.findById(leadId);
            const website = refreshedLead?.website || lead.website;
            if (website) {
                try {
                    const domain = website.replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
                    const websiteData = await websiteEnrichmentService.enrichWebsite(domain);
                    result.websiteData = websiteData;
                    if (websiteData.success) {
                        const updates = this.buildWebsiteUpdates(lead, websiteData);
                        if (Object.keys(updates).length > 0) {
                            await Lead_1.Lead.findByIdAndUpdate(leadId, { $set: updates });
                            result.fieldsUpdated.push(...Object.keys(updates));
                        }
                    }
                }
                catch (err) {
                    result.errors.push(`Website enrichment: ${err instanceof Error ? err.message : String(err)}`);
                }
            }
            await Lead_1.Lead.findByIdAndUpdate(leadId, {
                $set: {
                    enrichmentProgress: 70,
                    enrichmentCurrentStep: 'Merging enrichment data',
                },
            });
            const mergedUpdates = this.mergeEnrichmentData(result);
            if (Object.keys(mergedUpdates).length > 0) {
                await Lead_1.Lead.findByIdAndUpdate(leadId, { $set: mergedUpdates });
                result.fieldsUpdated.push(...Object.keys(mergedUpdates));
            }
            await Lead_1.Lead.findByIdAndUpdate(leadId, {
                $set: {
                    enrichmentStatus: 'completed',
                    enrichmentCompletedAt: new Date(),
                    enrichmentProgress: 100,
                    enrichmentCurrentStep: 'Completed',
                },
            });
            result.success = true;
        }
        catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            result.errors.push(`Fatal: ${errMsg}`);
            logger_1.logger.error({ leadId, err: errMsg }, 'LeadEnrichmentOrchestrator: Fatal error');
            try {
                await Lead_1.Lead.findByIdAndUpdate(leadId, {
                    $set: {
                        enrichmentStatus: 'failed',
                        enrichmentCompletedAt: new Date(),
                        enrichmentError: errMsg,
                        enrichmentProgress: Math.min(result.fieldsUpdated.length > 0 ? 80 : 20, 100),
                    },
                });
            }
            catch { }
        }
        result.durationMs = Date.now() - startTime;
        logger_1.logger.info({
            leadId,
            success: result.success,
            fieldsUpdated: result.fieldsUpdated.length,
            errors: result.errors.length,
            durationMs: result.durationMs,
        }, 'LeadEnrichmentOrchestrator: Completed');
        return result;
    }
    buildGoogleMapsUpdates(lead, detailData) {
        const updates = {};
        if (detailData.website && !lead.website)
            updates.website = detailData.website;
        if (detailData.phone && !lead.phone)
            updates.phone = detailData.phone;
        if (detailData.address && !lead.address) {
            updates.address = detailData.address;
            updates.streetAddress = detailData.streetAddress || detailData.address;
        }
        if (detailData.category && !lead.category)
            updates.category = detailData.category;
        if (detailData.rating !== undefined && (lead.rating === undefined || lead.rating === 0))
            updates.rating = detailData.rating;
        if (detailData.reviewsCount !== undefined && (lead.reviewsCount === undefined || lead.reviewsCount === 0))
            updates.reviewsCount = detailData.reviewsCount;
        if (detailData.businessStatus && !lead.businessStatus)
            updates.businessStatus = detailData.businessStatus;
        if (detailData.workingHours && !lead.workingHours)
            updates.workingHours = detailData.workingHours;
        if (detailData.plusCode && !lead.plusCode)
            updates.plusCode = detailData.plusCode;
        if (detailData.totalPhotos !== undefined && (lead.totalPhotos === undefined || lead.totalPhotos === 0))
            updates.totalPhotos = detailData.totalPhotos;
        if (detailData.ownerClaimed !== undefined && lead.ownerClaimed === undefined)
            updates.ownerClaimed = detailData.ownerClaimed;
        if (detailData.latitude !== undefined && detailData.longitude !== undefined && (lead.latitude === undefined || lead.longitude === undefined)) {
            updates.latitude = detailData.latitude;
            updates.longitude = detailData.longitude;
        }
        if (detailData.sourceUrl && !lead.sourceUrl)
            updates.sourceUrl = detailData.sourceUrl;
        if (detailData.socialLinks) {
            const social = {};
            for (const [key, val] of Object.entries(detailData.socialLinks)) {
                if (val)
                    social[key] = val;
            }
            if (Object.keys(social).length > 0) {
                updates.socialLinks = { ...(lead.socialLinks || {}), ...social };
            }
        }
        return updates;
    }
    buildWebsiteUpdates(lead, websiteData) {
        const updates = {};
        if (websiteData.emails.length > 0) {
            const existingEmails = lead.emails || [];
            const merged = [...new Set([...existingEmails, ...websiteData.emails])];
            if (merged.length > existingEmails.length) {
                updates.emails = merged;
                if (!lead.email && websiteData.emails.length > 0) {
                    updates.email = websiteData.emails[0];
                }
            }
        }
        if (websiteData.phones.length > 0) {
            const existingPhones = lead.phones || [];
            const existingPrimary = lead.phone;
            const merged = [...new Set([...existingPhones, ...websiteData.phones])];
            if (merged.length > existingPhones.length) {
                updates.phones = merged;
                if (!existingPrimary && websiteData.phones.length > 0) {
                    updates.phone = websiteData.phones[0];
                }
            }
        }
        const existingSocial = lead.socialLinks || {};
        const newSocial = {};
        let socialChanged = false;
        for (const [platform, url] of Object.entries(websiteData.socialLinks)) {
            if (url && !existingSocial[platform]) {
                newSocial[platform] = url;
                socialChanged = true;
            }
        }
        if (socialChanged) {
            updates.socialLinks = { ...existingSocial, ...newSocial };
        }
        if (websiteData.companyName && !lead.companyName && websiteData.companyName.length > 0) {
            updates.companyName = websiteData.companyName;
        }
        return updates;
    }
    mergeEnrichmentData(_result) {
        const updates = {};
        return updates;
    }
}
exports.LeadEnrichmentOrchestrator = LeadEnrichmentOrchestrator;
//# sourceMappingURL=lead-enrichment-orchestrator.js.map