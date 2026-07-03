"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseSource = void 0;
const logger_1 = require("../utils/logger");
const Lead_1 = require("../models/Lead");
const website_analysis_service_1 = require("../services/website-analysis.service");
const urlClassifier_service_1 = require("../modules/leads/services/urlClassifier.service");
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
function classifyLeadWebsite(leadDoc, website) {
    if (!website)
        return;
    const analysis = website_analysis_service_1.websiteAnalysisService.getLeadFields(website);
    leadDoc.website = analysis.website;
    leadDoc.hasWebsite = analysis.hasWebsite;
    leadDoc.normalizedDomain = analysis.normalizedDomain;
    leadDoc.analysisEligible = analysis.analysisEligible;
    leadDoc.hasRealWebsite = analysis.analysisEligible;
    leadDoc.websiteType = analysis.websiteType;
    leadDoc.websiteAuditAllowed = analysis.analysisEligible;
    if (!analysis.analysisEligible) {
        const classification = (0, urlClassifier_service_1.classifyWebsiteUrl)(website);
        if (classification.normalizedUrl && classification.websiteType !== 'INVALID_URL') {
            const existingSocial = (leadDoc.socialLinks || {});
            const platform = classification.socialProfiles;
            for (const [key, value] of Object.entries(platform)) {
                if (key === 'other' && Array.isArray(value)) {
                    const existing = existingSocial.other || [];
                    existingSocial.other = [...existing, ...value];
                }
                else if (typeof value === 'string' && value) {
                    existingSocial[key] = value;
                }
            }
            if (classification.websiteType === 'MARKETPLACE_PROFILE' && classification.normalizedUrl) {
                const existingMarketplace = (leadDoc.marketplaceLinks || {});
                const hostname = classification.normalizedUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
                for (const [domain, platform] of Object.entries(MARKETPLACE_PLATFORM_MAP)) {
                    if (hostname.includes(domain)) {
                        existingMarketplace[platform] = classification.normalizedUrl;
                        break;
                    }
                }
            }
        }
    }
}
class BaseSource {
    constructor(sourceName, config) {
        this.sourceName = sourceName;
        this.config = {
            sourceName,
            baseUrl: '',
            selectors: {
                businessCard: '',
                companyName: '',
            },
            timeout: 30000,
            maxRetries: 3,
            headless: true,
            ...config,
        };
    }
    getName() {
        return this.sourceName;
    }
    getConfig() {
        return this.config;
    }
    async testConnection() {
        try {
            await this.scrape({
                keyword: 'test',
                location: 'test',
                limit: 1,
            });
            return true;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.warn({ err: message, source: this.sourceName }, 'Source connection test failed');
            return false;
        }
    }
    async storeLeads(leads, context) {
        const persistedLeads = [];
        let totalStored = 0;
        let totalDuplicates = 0;
        const validLeads = leads.filter(l => l && l.companyName?.trim());
        if (validLeads.length === 0) {
            return { totalStored: 0, totalDuplicates: 0, leads: [] };
        }
        const allConditions = [];
        const leadIndexMap = [];
        for (let i = 0; i < validLeads.length; i++) {
            const lead = validLeads[i];
            const companyName = lead.companyName.trim();
            const dupConditions = [];
            if (lead.phone && lead.phone.length >= 10) {
                dupConditions.push({ companyName, phone: lead.phone });
            }
            if (lead.website && lead.website.trim().length > 0) {
                dupConditions.push({ website: lead.website.trim() });
            }
            if (lead.address && lead.address.trim().length > 0) {
                dupConditions.push({ companyName, address: lead.address.trim() });
            }
            if (dupConditions.length === 0) {
                dupConditions.push({ companyName, source: this.sourceName });
            }
            allConditions.push({ $or: dupConditions });
            leadIndexMap.push({ index: i, condition: dupConditions[0] });
        }
        const existingLeads = await Lead_1.Lead.find({ $or: allConditions }).lean();
        const phoneMap = new Map();
        const websiteMap = new Map();
        const companySourceMap = new Map();
        for (const el of existingLeads) {
            const lead = el;
            if (lead.phone)
                phoneMap.set(`${lead.companyName}:${lead.phone}`, lead);
            if (lead.website)
                websiteMap.set(lead.website.trim().toLowerCase(), lead);
            if (lead.companyName && lead.source) {
                companySourceMap.set(`${lead.companyName}:${lead.source}`, lead);
            }
        }
        const inserts = [];
        const updates = [];
        for (const { index } of leadIndexMap) {
            const lead = validLeads[index];
            const companyName = lead.companyName.trim();
            const phoneKey = lead.phone ? `${companyName}:${lead.phone}` : '';
            const websiteKey = lead.website?.trim().toLowerCase() || '';
            const companySourceKey = `${companyName}:${this.sourceName}`;
            const existing = phoneMap.get(phoneKey) || websiteMap.get(websiteKey) || companySourceMap.get(companySourceKey);
            if (existing) {
                let changed = false;
                const fieldUpdates = [];
                if (lead.website && existing.website !== lead.website) {
                    fieldUpdates.push({ field: 'website', value: lead.website });
                }
                if (lead.phone && existing.phone !== lead.phone) {
                    fieldUpdates.push({ field: 'phone', value: lead.phone });
                }
                if (lead.email && existing.email !== lead.email) {
                    fieldUpdates.push({ field: 'email', value: lead.email });
                }
                if (lead.address && existing.address !== lead.address) {
                    fieldUpdates.push({ field: 'address', value: lead.address });
                }
                if (lead.category && existing.category !== lead.category) {
                    fieldUpdates.push({ field: 'category', value: lead.category });
                }
                if (lead.rating !== undefined && existing.rating !== lead.rating) {
                    fieldUpdates.push({ field: 'rating', value: lead.rating });
                }
                if (lead.reviewsCount !== undefined && existing.reviewsCount !== lead.reviewsCount) {
                    fieldUpdates.push({ field: 'reviewsCount', value: lead.reviewsCount });
                }
                if (lead.sourceUrl && existing.sourceUrl !== lead.sourceUrl) {
                    fieldUpdates.push({ field: 'sourceUrl', value: lead.sourceUrl });
                }
                if (lead.relevanceScore !== undefined && existing.relevanceScore !== lead.relevanceScore) {
                    fieldUpdates.push({ field: 'relevanceScore', value: lead.relevanceScore });
                }
                if (lead.validatedCategory && existing.validatedCategory !== lead.validatedCategory) {
                    fieldUpdates.push({ field: 'validatedCategory', value: lead.validatedCategory });
                }
                for (const fu of fieldUpdates) {
                    existing[fu.field] = fu.value;
                    changed = true;
                }
                if (lead.sources && lead.sources.length > 0) {
                    changed = true;
                }
                if (context?.keyword) {
                    existing.searchedKeyword = context.keyword;
                    changed = true;
                }
                if (context?.location) {
                    existing.searchedLocation = context.location;
                    changed = true;
                }
                if (context?.area) {
                    existing.searchedArea = context.area;
                    changed = true;
                }
                if (context?.city) {
                    existing.searchedCity = context.city;
                    changed = true;
                }
                if (context?.state) {
                    existing.searchedState = context.state;
                    changed = true;
                }
                if (context?.businessType) {
                    existing.searchedBusinessType = context.businessType;
                    changed = true;
                }
                if (context?.fullSearchQuery) {
                    existing.fullSearchQuery = context.fullSearchQuery;
                    changed = true;
                }
                if (lead.semanticCategory) {
                    existing.semanticCategory = lead.semanticCategory;
                    changed = true;
                }
                if (lead.semanticCategoryName) {
                    existing.semanticCategoryName = lead.semanticCategoryName;
                    changed = true;
                }
                if (lead.matchedKeyword) {
                    existing.matchedKeyword = lead.matchedKeyword;
                    changed = true;
                }
                if (lead.originalSearchedKeyword) {
                    existing.originalSearchedKeyword = lead.originalSearchedKeyword;
                    changed = true;
                }
                if (lead.searchGroup) {
                    existing.searchGroup = lead.searchGroup;
                    changed = true;
                }
                if (lead.semanticMatchReason) {
                    existing.semanticMatchReason = lead.semanticMatchReason;
                    changed = true;
                }
                if (lead.expandedFromKeyword) {
                    existing.expandedFromKeyword = lead.expandedFromKeyword;
                    changed = true;
                }
                existing.extractionSource = this.sourceName;
                existing.sourceMetadata = {
                    ...(existing.sourceMetadata || {}),
                    source: this.sourceName,
                    extractedAt: new Date().toISOString(),
                    searchedKeyword: context?.keyword || existing.searchedKeyword || '',
                    searchedLocation: context?.location || existing.searchedLocation || '',
                };
                existing.leadScore = this.calculateLeadScore({
                    ...lead,
                    companyName,
                    website: lead.website || existing.website || undefined,
                    phone: lead.phone || existing.phone || undefined,
                    address: lead.address || existing.address || undefined,
                    category: lead.category || existing.category || undefined,
                });
                changed = true;
                totalDuplicates++;
                persistedLeads.push(this.toLeadData(existing, lead));
                if (changed) {
                    updates.push({ _id: existing._id.toString(), lead, existing, changed });
                }
            }
            else {
                const newLeadData = {
                    companyName,
                    website: lead.website || undefined,
                    phone: lead.phone || undefined,
                    email: lead.email || undefined,
                    address: lead.address || undefined,
                    category: lead.category || undefined,
                    source: this.sourceName,
                    rating: lead.rating || undefined,
                    reviewsCount: lead.reviewsCount || undefined,
                    leadScore: lead.leadScore ?? this.calculateLeadScore(lead),
                    sourceUrl: lead.sourceUrl,
                    extractionSource: this.sourceName,
                    relevanceScore: lead.relevanceScore,
                    locationConfidence: lead.locationConfidence,
                    categoryConfidence: lead.categoryConfidence,
                    finalConfidence: lead.finalConfidence,
                    validationStatus: lead.validationStatus,
                    rejectionReason: lead.rejectionReason,
                    aiMatchType: lead.aiMatchType,
                    aiWarnings: lead.aiWarnings,
                    aiQuality: lead.aiQuality,
                    semanticCategory: lead.semanticCategory || '',
                    semanticCategoryName: lead.semanticCategoryName || '',
                    matchedKeyword: lead.matchedKeyword || '',
                    originalSearchedKeyword: lead.originalSearchedKeyword || '',
                    searchGroup: lead.searchGroup || '',
                    semanticMatchReason: lead.semanticMatchReason || '',
                    expandedFromKeyword: lead.expandedFromKeyword || '',
                    searchedKeyword: context?.keyword || '',
                    searchedLocation: context?.location || '',
                    searchedArea: context?.area || '',
                    searchedCity: context?.city || '',
                    searchedState: context?.state || '',
                    searchedBusinessType: context?.businessType || '',
                    fullSearchQuery: context?.fullSearchQuery || '',
                    sourceMetadata: {
                        source: this.sourceName,
                        extractedAt: new Date().toISOString(),
                        searchedKeyword: context?.keyword || '',
                        searchedLocation: context?.location || '',
                        searchedArea: context?.area || '',
                        searchedCity: context?.city || '',
                        searchedState: context?.state || '',
                        searchedBusinessType: context?.businessType || '',
                        fullSearchQuery: context?.fullSearchQuery || '',
                    },
                };
                classifyLeadWebsite(newLeadData, lead.website);
                inserts.push(newLeadData);
            }
        }
        if (inserts.length > 0) {
            const batchSize = 100;
            for (let i = 0; i < inserts.length; i += batchSize) {
                const batch = inserts.slice(i, i + batchSize);
                const created = await Lead_1.Lead.insertMany(batch, { ordered: false });
                for (let j = 0; j < created.length; j++) {
                    const idx = i + j;
                    if (idx < validLeads.length) {
                        persistedLeads.push(this.toLeadData(created[j], validLeads[idx]));
                    }
                }
            }
            totalStored = inserts.length;
        }
        if (updates.length > 0) {
            const bulkOps = updates.map(u => ({
                updateOne: {
                    filter: { _id: u._id },
                    update: { $set: u.existing },
                },
            }));
            const batchSize = 100;
            for (let i = 0; i < bulkOps.length; i += batchSize) {
                const batch = bulkOps.slice(i, i + batchSize);
                await Lead_1.Lead.bulkWrite(batch).catch((err) => {
                    logger_1.logger.warn({ err: err.message }, 'Store leads bulk update failed');
                });
            }
        }
        logger_1.logger.info({ totalStored, totalDuplicates, totalLeads: leads.length }, 'storeLeads completed');
        return { totalStored, totalDuplicates, leads: persistedLeads };
    }
    toLeadData(document, scrapedLead) {
        return {
            id: document._id.toString(),
            companyName: document.companyName,
            website: document.website ?? undefined,
            phone: document.phone ?? undefined,
            email: document.email ?? undefined,
            address: document.address ?? undefined,
            category: document.category ?? undefined,
            rating: document.rating ?? undefined,
            reviewsCount: document.reviewsCount ?? undefined,
            source: document.source,
            sourceUrl: document.sourceUrl ?? undefined,
            leadScore: document.leadScore ?? undefined,
            href: scrapedLead.href,
            placeId: scrapedLead.placeId,
            createdAt: document.createdAt?.toISOString() ?? new Date().toISOString(),
        };
    }
    isDuplicate(business, existing) {
        return existing.some((b) => b.companyName === business.companyName && b.phone === business.phone);
    }
    calculateLeadScore(data) {
        let score = 30;
        if (data.website)
            score += 20;
        if (data.phone)
            score += 15;
        if (data.email)
            score += 15;
        if (data.address)
            score += 5;
        if (data.category)
            score += 5;
        if (data.rating && data.rating >= 4.5)
            score += 10;
        else if (data.rating && data.rating >= 4.0)
            score += 5;
        return Math.min(score, 100);
    }
}
exports.BaseSource = BaseSource;
//# sourceMappingURL=base-source.js.map