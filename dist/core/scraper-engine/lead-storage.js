"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadStorage = exports.LeadStorage = void 0;
const Lead_1 = require("../../models/Lead");
const logger_1 = require("../../utils/logger");
const lead_normalizer_1 = require("./lead-normalizer");
const search_status_service_1 = require("../../services/search-status.service");
const lead_enrichment_pipeline_service_1 = require("../../services/lead-enrichment-pipeline.service");
const enrichment_1 = require("../../enrichment");
const monitor_engine_1 = require("../../modules/automation-monitor/monitor-engine");
class LeadStorage {
    constructor() {
        this.dedupCache = new Set();
        this.dedupCacheMaxSize = 50000;
        this.normalizerCache = new Map();
        this.normalizerCacheMaxSize = 20000;
    }
    clearSessionCache() {
        this.dedupCache.clear();
        this.normalizerCache.clear();
    }
    checkDedupCache(keys) {
        for (const key of keys) {
            if (this.dedupCache.has(key))
                return true;
        }
        return false;
    }
    addToDedupCache(keys) {
        if (this.dedupCache.size >= this.dedupCacheMaxSize) {
            this.dedupCache.clear();
            this.normalizerCache.clear();
        }
        for (const key of keys) {
            this.dedupCache.add(key);
        }
    }
    getCachedNormalized(lead) {
        const key = `${lead.companyName}|${lead.source}|${lead.placeId || ''}`;
        return this.normalizerCache.get(key) || null;
    }
    setCachedNormalized(lead, normalized, dedupKeys) {
        if (this.normalizerCache.size >= this.normalizerCacheMaxSize)
            return;
        const key = `${lead.companyName}|${lead.source}|${lead.placeId || ''}`;
        this.normalizerCache.set(key, { lead: normalized, dedupKeys });
    }
    async enrichLeads(leads, context) {
        if (leads.length === 0)
            return 0;
        const ops = [];
        let enriched = 0;
        for (const lead of leads) {
            if (!lead.companyName || lead.companyName.trim().length < 2)
                continue;
            const filter = {};
            if (lead.placeId) {
                filter['sourceMetadata.placeId'] = lead.placeId;
            }
            else {
                filter.companyName = lead.companyName;
                filter.source = lead.source;
            }
            const setFields = {
                enrichedAt: new Date().toISOString(),
            };
            if (lead.website)
                setFields.website = lead.website;
            if (lead.phone)
                setFields.phone = lead.phone;
            if (lead.email)
                setFields.email = lead.email;
            if (lead.address)
                setFields.address = lead.address;
            if (lead.pincode)
                setFields.pincode = lead.pincode;
            if (lead.postalCode)
                setFields.postalCode = lead.postalCode;
            if (lead.streetAddress)
                setFields.streetAddress = lead.streetAddress;
            if (lead.latitude !== undefined)
                setFields.latitude = lead.latitude;
            if (lead.longitude !== undefined)
                setFields.longitude = lead.longitude;
            if (lead.workingHours)
                setFields.workingHours = lead.workingHours;
            if (lead.businessStatus)
                setFields.businessStatus = lead.businessStatus;
            if (lead.plusCode)
                setFields.plusCode = lead.plusCode;
            if (lead.rating)
                setFields.rating = lead.rating;
            if (lead.reviewsCount)
                setFields.reviewsCount = lead.reviewsCount;
            if (lead.totalPhotos !== undefined)
                setFields.totalPhotos = lead.totalPhotos;
            if (lead.secondaryCategories && lead.secondaryCategories.length > 0)
                setFields.secondaryCategories = lead.secondaryCategories;
            if (lead.serviceOptions && lead.serviceOptions.length > 0)
                setFields.serviceOptions = lead.serviceOptions;
            if (lead.ownerClaimed !== undefined)
                setFields.ownerClaimed = lead.ownerClaimed;
            if (lead.category)
                setFields.category = lead.category;
            ops.push({
                updateOne: {
                    filter,
                    update: { $set: setFields },
                    upsert: false,
                }
            });
            enriched++;
        }
        if (ops.length > 0) {
            try {
                await Lead_1.Lead.bulkWrite(ops, { ordered: false });
            }
            catch (err) {
                logger_1.logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'LeadStorage: Enrich bulkWrite failed');
            }
        }
        if (enriched > 0 && context.sessionId) {
            for (const lead of leads.slice(0, enriched)) {
                search_status_service_1.searchStatus.addLiveLead(context.sessionId, lead.companyName, lead.source);
            }
        }
        return enriched;
    }
    async storeLeads(leads, context) {
        if (leads.length === 0) {
            return { totalStored: 0, totalDuplicates: 0, leads: [] };
        }
        const validLeads = [];
        let preFiltered = 0;
        for (const lead of leads) {
            if (!this.validateLead(lead)) {
                preFiltered++;
                continue;
            }
            const cached = this.getCachedNormalized(lead);
            if (cached) {
                validLeads.push(cached);
                continue;
            }
            const normalized = lead_normalizer_1.leadNormalizer.normalize(lead, {
                ...context,
                source: lead.source,
            });
            const dedupKeys = lead_normalizer_1.leadNormalizer.getDedupKey(normalized);
            this.setCachedNormalized(lead, normalized, dedupKeys);
            validLeads.push({ lead: normalized, dedupKeys });
        }
        if (validLeads.length === 0) {
            return { totalStored: 0, totalDuplicates: 0, leads: [] };
        }
        const batchSize = validLeads.length;
        const useBulkCheck = batchSize > 1;
        let existingLeadSet = new Set();
        if (useBulkCheck) {
            const allConditions = [];
            for (const entry of validLeads) {
                for (const key of entry.dedupKeys) {
                    const cond = this.dedupKeyToCondition(key);
                    if (cond)
                        allConditions.push(cond);
                }
            }
            if (allConditions.length > 0) {
                try {
                    const existingDocs = await Lead_1.Lead.find({ $or: allConditions }, 'phone website companyName sourceUrl sourceMetadata.placeId').lean();
                    for (const doc of existingDocs) {
                        if (doc.phone)
                            existingLeadSet.add(`phone:${doc.phone}`);
                        if (doc.website)
                            existingLeadSet.add(`website:${doc.website}`);
                        if (doc.sourceUrl)
                            existingLeadSet.add(`sourceUrl:${doc.sourceUrl}`);
                        if (doc.sourceMetadata?.placeId)
                            existingLeadSet.add(`placeId:${doc.sourceMetadata.placeId}`);
                        if (doc.latitude !== undefined && doc.longitude !== undefined) {
                            existingLeadSet.add(`coords:${Number(doc.latitude).toFixed(5)},${Number(doc.longitude).toFixed(5)}`);
                        }
                        if (doc.companyName && doc.address) {
                            const name = doc.companyName.toLowerCase().replace(/\s+/g, '');
                            const addr = doc.address.toLowerCase().replace(/\s+/g, '');
                            existingLeadSet.add(`nameaddr:${name}|${addr}`);
                        }
                        else if (doc.companyName) {
                            existingLeadSet.add(`name:${doc.companyName.toLowerCase().replace(/\s+/g, '')}|`);
                        }
                    }
                }
                catch (err) {
                    logger_1.logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'LeadStorage: Bulk duplicate check failed, falling back');
                }
            }
        }
        const newLeads = [];
        let totalDuplicates = 0;
        for (const entry of validLeads) {
            const cachedDup = this.checkDedupCache(entry.dedupKeys);
            const isDuplicate = cachedDup
                || (!useBulkCheck
                    ? !!(await this.findDuplicate(entry.dedupKeys))
                    : entry.dedupKeys.some(k => existingLeadSet.has(k)));
            if (isDuplicate) {
                totalDuplicates++;
                this.addToDedupCache(entry.dedupKeys);
                if (context.sessionId) {
                    search_status_service_1.searchStatus.incrementDuplicates(context.sessionId);
                }
                if (context.automationSessionId) {
                    monitor_engine_1.monitorEngine.onDuplicateSkipped(context.automationSessionId, entry.lead.companyName, 1);
                    await context.onLeadSaved?.(0, 1, 0);
                }
            }
            else {
                this.addToDedupCache(entry.dedupKeys);
                newLeads.push(entry.lead);
            }
        }
        let totalStored = 0;
        const stored = [];
        if (newLeads.length > 0) {
            const newDocs = newLeads.map(lead => ({
                companyName: lead.companyName,
                website: lead.website || undefined,
                phone: lead.phone || undefined,
                email: lead.email || undefined,
                address: lead.address || undefined,
                category: lead.category || undefined,
                secondaryCategories: lead.secondaryCategories && lead.secondaryCategories.length > 0 ? lead.secondaryCategories : undefined,
                source: lead.source,
                rating: lead.rating || undefined,
                reviewsCount: lead.reviewsCount || undefined,
                totalPhotos: lead.totalPhotos !== undefined ? lead.totalPhotos : undefined,
                leadScore: this.calculateLeadScore(lead),
                sourceUrl: lead.sourceUrl,
                extractionSource: lead.source,
                relevanceScore: lead.relevanceScore || 0,
                locationConfidence: lead.locationRelevanceScore || 0,
                searchedKeyword: context.keyword || '',
                searchedLocation: context.location || '',
                searchedArea: context.area || '',
                searchedCity: context.city || '',
                searchedState: context.state || '',
                searchedCountry: context.country || '',
                searchedBusinessType: context.businessType || '',
                fullSearchQuery: context.fullSearchQuery || '',
                searchRank: lead.searchRank || undefined,
                semanticKeyword: context.semanticKeyword || context.keyword,
                searchSessionId: context.automationSessionId || context.sessionId || undefined,
                pincode: lead.pincode || undefined,
                postalCode: lead.postalCode || undefined,
                streetAddress: lead.streetAddress || undefined,
                latitude: lead.latitude !== undefined ? lead.latitude : undefined,
                longitude: lead.longitude !== undefined ? lead.longitude : undefined,
                workingHours: lead.workingHours || undefined,
                businessStatus: lead.businessStatus || undefined,
                serviceOptions: lead.serviceOptions && lead.serviceOptions.length > 0 ? lead.serviceOptions : undefined,
                ownerClaimed: lead.ownerClaimed !== undefined ? lead.ownerClaimed : undefined,
                plusCode: lead.plusCode || undefined,
                sourceMetadata: {
                    source: lead.source,
                    placeId: lead.placeId || undefined,
                    extractedAt: new Date().toISOString(),
                    searchedKeyword: context.keyword || '',
                    searchedLocation: context.location || '',
                    searchedCountry: context.country || '',
                    searchedArea: context.area || '',
                    searchedCity: context.city || '',
                    searchedState: context.state || '',
                    semanticKeyword: context.semanticKeyword || context.keyword,
                },
            }));
            const trackedFields = ['companyName', 'website', 'phone', 'email', 'address', 'category', 'secondaryCategories', 'rating', 'reviewsCount', 'totalPhotos', 'pincode', 'postalCode', 'streetAddress', 'latitude', 'longitude', 'workingHours', 'businessStatus', 'serviceOptions', 'ownerClaimed', 'plusCode', 'sourceUrl', 'source'];
            for (const doc of newDocs) {
                const present = trackedFields.filter(f => doc[f] !== undefined && doc[f] !== null && doc[f] !== '');
                const missing = trackedFields.filter(f => doc[f] === undefined || doc[f] === null || doc[f] === '');
                if (missing.length > 0) {
                    logger_1.logger.debug({ company: doc.companyName, present, missing }, '[LeadStorage] Field-level tracking');
                }
            }
            try {
                const inserted = await Lead_1.Lead.insertMany(newDocs, { ordered: false });
                totalStored = inserted.length;
                stored.push(...newLeads);
                if (context.sessionId) {
                    search_status_service_1.searchStatus.incrementSaved(context.sessionId, totalStored);
                }
                if (context.automationSessionId) {
                    monitor_engine_1.monitorEngine.onLeadSaved(context.automationSessionId, `${totalStored} leads`, 'bulk', totalStored);
                    await context.onLeadSaved?.(totalStored, 0, 0);
                }
                if (!context.skipEnrichment && inserted.length > 0) {
                    const leadIds = [];
                    for (let i = 0; i < totalStored; i++) {
                        const leadId = inserted[i]._id?.toString();
                        if (leadId)
                            leadIds.push(leadId);
                        if (context.sessionId) {
                            search_status_service_1.searchStatus.addLiveLead(context.sessionId, newLeads[i].companyName, newLeads[i].source);
                        }
                    }
                    lead_enrichment_pipeline_service_1.leadEnrichmentPipeline.enqueueMultiple(leadIds);
                    enrichment_1.leadEnrichmentOrchestrator.enqueueMultiple(leadIds);
                }
                else if (inserted.length > 0) {
                    for (let i = 0; i < totalStored; i++) {
                        if (context.sessionId) {
                            search_status_service_1.searchStatus.addLiveLead(context.sessionId, newLeads[i].companyName, newLeads[i].source);
                        }
                    }
                }
                logger_1.logger.info({
                    action: 'lead_saved',
                    stored: totalStored,
                    duplicates: totalDuplicates,
                    batchSize,
                    sessionId: context.sessionId,
                }, `[LEAD_SAVED] ${totalStored} leads saved, ${totalDuplicates} duplicates in batch`);
            }
            catch (err) {
                const errMsg = err instanceof Error ? err.message : String(err);
                logger_1.logger.error({ err: errMsg }, 'LeadStorage: Batch insert failed, falling back to individual saves');
                for (const doc of newDocs) {
                    try {
                        await new Lead_1.Lead(doc).save();
                        totalStored++;
                        const leadIdx = newDocs.indexOf(doc);
                        if (leadIdx >= 0)
                            stored.push(newLeads[leadIdx]);
                        if (context.sessionId) {
                            search_status_service_1.searchStatus.incrementSaved(context.sessionId);
                            search_status_service_1.searchStatus.addLiveLead(context.sessionId, doc.companyName, doc.source);
                        }
                    }
                    catch {
                        if (context.sessionId) {
                            search_status_service_1.searchStatus.incrementFailed(context.sessionId);
                        }
                    }
                }
            }
        }
        return { totalStored, totalDuplicates, leads: stored };
    }
    validateLead(lead) {
        if (!lead.companyName || lead.companyName.trim().length < 2)
            return false;
        return true;
    }
    dedupKeyToCondition(key) {
        if (key.startsWith('phone:')) {
            return { phone: key.replace('phone:', '') };
        }
        if (key.startsWith('website:')) {
            return { website: key.replace('website:', '') };
        }
        if (key.startsWith('placeId:')) {
            return { 'sourceMetadata.placeId': key.replace('placeId:', '') };
        }
        if (key.startsWith('sourceUrl:')) {
            return { sourceUrl: key.replace('sourceUrl:', '') };
        }
        if (key.startsWith('nameaddr:')) {
            const payload = key.replace('nameaddr:', '');
            const [namePart, addrPart] = payload.split('|');
            return {
                companyName: { $regex: new RegExp(`^${namePart}$`, 'i') },
                address: { $regex: new RegExp(addrPart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
            };
        }
        if (key.startsWith('coords:')) {
            const [latStr, lngStr] = key.replace('coords:', '').split(',');
            const lat = parseFloat(latStr);
            const lng = parseFloat(lngStr);
            if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
                return {
                    latitude: { $gte: lat - 0.0001, $lte: lat + 0.0001 },
                    longitude: { $gte: lng - 0.0001, $lte: lng + 0.0001 },
                };
            }
        }
        if (key.startsWith('name:')) {
            const parts = key.replace('name:', '').split('|');
            return { companyName: { $regex: new RegExp(`^${parts[0]}$`, 'i') } };
        }
        return null;
    }
    async findDuplicate(keys) {
        if (keys.length === 0)
            return false;
        const conditions = [];
        for (const key of keys) {
            const cond = this.dedupKeyToCondition(key);
            if (cond)
                conditions.push(cond);
        }
        if (conditions.length === 0)
            return false;
        const existing = await Lead_1.Lead.findOne({ $or: conditions }).catch(() => null);
        return !!existing;
    }
    calculateLeadScore(lead) {
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
        if (lead.secondaryCategories && lead.secondaryCategories.length > 0)
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
        if (lead.serviceOptions && lead.serviceOptions.length > 0)
            score += 2;
        if (lead.ownerClaimed)
            score += 2;
        return Math.min(score, 100);
    }
}
exports.LeadStorage = LeadStorage;
exports.leadStorage = new LeadStorage();
//# sourceMappingURL=lead-storage.js.map