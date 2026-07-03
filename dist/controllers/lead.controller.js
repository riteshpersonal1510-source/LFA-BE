"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadController = exports.LeadController = void 0;
const scraper_service_1 = require("../services/scraper.service");
const lead_service_1 = require("../services/lead.service");
const lead_qualification_service_1 = require("../services/lead-qualification.service");
const website_analyzer_service_1 = require("../services/website-analyzer.service");
const lead_audit_trigger_service_1 = require("../services/lead-audit-trigger.service");
const lead_audit_processor_service_1 = require("../services/lead-audit-processor.service");
const lead_migration_service_1 = require("../services/lead-migration.service");
const leadFilter_service_1 = require("../modules/leads/services/leadFilter.service");
const lead_statistics_service_1 = require("../services/lead-statistics.service");
const Lead_1 = require("../models/Lead");
const SearchAnalytics_1 = require("../models/SearchAnalytics");
const website_analysis_service_1 = require("../services/website-analysis.service");
const search_status_service_1 = require("../services/search-status.service");
const api_response_1 = require("../utils/api-response");
const cache_service_1 = require("../services/cache.service");
const logger_1 = require("../utils/logger");
const semantic_search_service_1 = require("../services/semantic-search.service");
class LeadController {
    constructor() {
        this.scraperService = new scraper_service_1.ScraperService();
        this.leadService = new lead_service_1.LeadService();
        this.leadQualificationService = new lead_qualification_service_1.LeadQualificationService();
        this.websiteAnalyzerService = new website_analyzer_service_1.WebsiteAnalyzerService();
    }
    async searchLeads(req, res, _next) {
        try {
            const { keyword, location, state, city, area, country, sources, limit, businessType, sessionId } = req.body;
            if (!keyword) {
                res.status(400).json({
                    success: false,
                    message: 'Keyword is required',
                    error: { keyword: 'missing' },
                });
                return;
            }
            let locationString = location || '';
            if (state && city) {
                locationString = area
                    ? `${area}, ${city}, ${state}`
                    : `${city}, ${state}`;
            }
            const useSemantic = req.body.semanticExpansion !== false;
            const options = {
                keyword,
                location: locationString,
                sources: sources || ['google-maps'],
                limit: limit ? parseInt(limit.toString(), 10) : 1000,
                state,
                city,
                area,
                country,
                businessType: businessType || keyword,
                sessionId,
                semanticExpansion: useSemantic,
                semanticKeyword: req.body.semanticKeyword,
            };
            const startedAt = Date.now();
            logger_1.logger.info({
                keyword: options.keyword,
                location: options.location,
                state,
                city,
                area,
                sources: options.sources,
                limit: options.limit
            }, '[search] request received');
            const result = await this.scraperService.scrapeBusinesses(options);
            const hasStoredData = result.totalStored > 0;
            logger_1.logger.info({
                extracted: result.totalExtracted, stored: result.totalStored,
                duplicates: result.totalDuplicates, success: result.success,
                hasStoredData, durationMs: Date.now() - startedAt,
            }, '[search] scraper completed');
            const leads = result.leads || [];
            const count = leads.length;
            const apiSuccess = result.success || hasStoredData;
            const pagination = {
                page: 1,
                limit: options.limit,
                total: count,
                totalPages: Math.max(1, Math.ceil((count || 1) / options.limit)),
            };
            const sourceCounts = {};
            if (result.results) {
                for (const [src, res] of Object.entries(result.results)) {
                    sourceCounts[src] = res.totalStored || 0;
                }
            }
            let semanticInfo;
            if (useSemantic) {
                try {
                    semanticInfo = semantic_search_service_1.semanticSearchService.getSearchCoverageReport(options.keyword, options.sources || ['google-maps'], state, city, area);
                }
                catch {
                    semanticInfo = undefined;
                }
            }
            if (res.headersSent) {
                return;
            }
            try {
                if (!apiSuccess && result.totalExtracted === 0) {
                    res.status(200).json({
                        success: true,
                        message: result.message || 'No leads found',
                        count: 0,
                        data: [],
                        leads: [],
                        pagination: { ...pagination, total: 0, totalPages: 0 },
                        searchQuery: options.keyword,
                        sources: sourceCounts,
                        totalUniqueLeads: 0,
                        semanticInfo,
                        meta: {
                            extracted: result.totalExtracted,
                            stored: result.totalStored,
                            duplicates: result.totalDuplicates,
                            durationMs: Date.now() - startedAt,
                        },
                    });
                    return;
                }
                if (res.headersSent) {
                    return;
                }
                try {
                    const expandedKeywords = semanticInfo?.expandedKeywordsPreview || [];
                    const keywordBreakdown = {};
                    if (expandedKeywords.length > 0) {
                        const perKeyword = Math.max(1, Math.floor(count / expandedKeywords.length));
                        expandedKeywords.forEach(kw => { keywordBreakdown[kw] = perKeyword; });
                        keywordBreakdown[options.keyword] = count - (perKeyword * expandedKeywords.length);
                    }
                    await SearchAnalytics_1.SearchAnalytics.findOneAndUpdate({ sessionId: options.sessionId || '' }, {
                        $set: {
                            sessionId: options.sessionId || '',
                            keyword: options.keyword,
                            expandedKeywords,
                            state: options.state,
                            city: options.city,
                            area: options.area,
                            location: options.location || '',
                            sources: options.sources || [],
                            totalLeadsFound: result.totalExtracted || 0,
                            totalUniqueLeads: count,
                            totalDuplicatesRemoved: result.totalDuplicates || 0,
                            sourceBreakdown: sourceCounts,
                            keywordBreakdown,
                            status: 'completed',
                            duration: Date.now() - startedAt,
                            completedAt: new Date(),
                        },
                    }, { upsert: true });
                    if (options.sessionId) {
                        search_status_service_1.searchStatus.updateUniqueLeads(options.sessionId, count);
                        search_status_service_1.searchStatus.updateDuplicatesRemoved(options.sessionId, result.totalDuplicates || 0);
                        for (const [src, srcCount] of Object.entries(sourceCounts)) {
                            search_status_service_1.searchStatus.updateSourceBreakdown(options.sessionId, src, srcCount);
                        }
                        for (const [kw, kwCount] of Object.entries(keywordBreakdown)) {
                            search_status_service_1.searchStatus.updateKeywordBreakdown(options.sessionId, kw, kwCount);
                        }
                    }
                }
                catch (analyticsError) {
                    logger_1.logger.error({ analyticsError }, '[search] Failed to store analytics');
                }
                logger_1.logger.info({ count, durationMs: Date.now() - startedAt, apiSuccess }, '[search] API response');
                res.status(200).json({
                    success: true,
                    message: hasStoredData
                        ? `Leads scraped successfully: ${count} saved`
                        : (result.message || 'Scraping completed'),
                    count,
                    data: leads,
                    leads,
                    pagination,
                    searchQuery: options.keyword,
                    sources: sourceCounts,
                    totalUniqueLeads: count,
                    semanticInfo,
                    meta: {
                        extracted: result.totalExtracted,
                        stored: result.totalStored,
                        duplicates: result.totalDuplicates,
                        durationMs: Date.now() - startedAt,
                    },
                });
            }
            catch {
                if (!res.headersSent) {
                    res.status(200).json({
                        success: true,
                        message: hasStoredData ? `Leads scraped successfully: ${count} saved` : 'Search completed',
                        count,
                        data: leads,
                        leads,
                        pagination,
                        searchQuery: options.keyword,
                    });
                }
            }
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Unknown error';
            const errStack = error instanceof Error ? error.stack : undefined;
            logger_1.logger.error({ err: errMsg, stack: errStack, keyword: req.body?.keyword }, '[search] Error in searchLeads');
            if (res.headersSent) {
                return;
            }
            res.status(500).json({
                success: false,
                message: `Search failed: ${errMsg}`,
            });
        }
    }
    async getLeadStatistics(_req, res, _next) {
        try {
            const stats = await lead_statistics_service_1.leadStatisticsService.getLeadStatistics();
            logger_1.logger.info({
                total: stats.totalLeads,
                website: stats.websiteCount,
                phone: stats.withPhoneCount,
                pending: stats.pendingCount,
                sent: stats.sentCount,
            }, '[getLeadStatistics] API response');
            res.status(200).json({
                success: true,
                data: {
                    totalLeads: stats.totalLeads,
                    websiteCount: stats.websiteCount,
                    noWebsiteCount: stats.noWebsiteCount,
                    withPhoneCount: stats.withPhoneCount,
                    withoutPhoneCount: stats.withoutPhoneCount,
                    pendingCount: stats.pendingCount,
                    preparedCount: stats.preparedCount,
                    sentCount: stats.sentCount,
                    skippedCount: stats.skippedCount,
                    failedCount: stats.failedCount,
                    leadIds: stats.leadIds,
                    mongoQuery: stats.mongoQuery,
                    appliedFilters: stats.appliedFilters,
                },
            });
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Unknown error';
            const errStack = error instanceof Error ? error.stack : undefined;
            logger_1.logger.error({ err: errMsg, stack: errStack }, '[getLeadStatistics] Error');
            if (res.headersSent) {
                return;
            }
            res.status(500).json({
                success: false,
                message: `Failed to fetch lead statistics: ${errMsg}`,
            });
        }
    }
    async getLeads(req, res, _next) {
        try {
            const page = parseInt(req.query.page?.toString() || '1', 10);
            const limit = parseInt(req.query.limit?.toString() || '10', 10);
            const result = await leadFilter_service_1.leadFilterService.getFilteredLeads({
                page,
                limit,
                search: req.query.search?.toString() || req.query.keyword?.toString(),
                category: req.query.category?.toString(),
                source: req.query.source?.toString(),
                sources: req.query.sources?.toString()?.split(','),
                state: req.query.state?.toString(),
                city: req.query.city?.toString(),
                area: req.query.area?.toString(),
                businessType: req.query.businessType?.toString(),
                status: req.query.status?.toString(),
                quality: req.query.quality?.toString(),
                confidence: req.query.confidence ? parseFloat(req.query.confidence.toString()) : undefined,
                minConfidence: req.query.minConfidence ? parseFloat(req.query.minConfidence.toString()) : undefined,
                maxConfidence: req.query.maxConfidence ? parseFloat(req.query.maxConfidence.toString()) : undefined,
                hasWebsite: req.query.hasWebsite === 'true' ? true : req.query.hasWebsite === 'false' ? false : undefined,
                hasPhone: req.query.hasPhone === 'true' ? true : req.query.hasPhone === 'false' ? false : undefined,
                hasEmail: req.query.hasEmail === 'true' ? true : req.query.hasEmail === 'false' ? false : undefined,
                socialOnly: req.query.socialOnly === 'true',
                verifiedOnly: req.query.verifiedOnly === 'true',
                hasWhatsApp: req.query.hasWhatsApp === 'true' ? true : req.query.hasWhatsApp === 'false' ? false : undefined,
                validationStatus: req.query.validationStatus?.toString(),
                qualificationLevel: req.query.qualificationLevel?.toString(),
                websiteType: req.query.websiteType?.toString(),
                searchSessionId: req.query.searchSessionId?.toString(),
                enrichmentStatus: req.query.enrichmentStatus?.toString(),
                sortField: req.query.sortField?.toString(),
                sortOrder: req.query.sortOrder?.toString(),
            });
            logger_1.logger.info({ count: result.leads.length, total: result.pagination.total }, '[getLeads] API response');
            res.status(200).json({
                success: true,
                currentPage: result.pagination.page,
                totalPages: result.pagination.totalPages,
                totalLeads: result.pagination.total,
                limit: result.pagination.limit,
                data: result.leads,
            });
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Unknown error';
            const errStack = error instanceof Error ? error.stack : undefined;
            logger_1.logger.error({ err: errMsg, stack: errStack }, '[getLeads] Error');
            if (res.headersSent) {
                return;
            }
            res.status(500).json({
                success: false,
                message: `Failed to fetch leads: ${errMsg}`,
            });
        }
    }
    async getFilterOptions(req, res, _next) {
        try {
            const options = await leadFilter_service_1.leadFilterService.getFilterOptions({
                state: req.query.state?.toString(),
                city: req.query.city?.toString(),
                area: req.query.area?.toString(),
            });
            res.status(200).json({ success: true, data: options });
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error({ err: errMsg }, '[getFilterOptions] Error');
            res.status(500).json({ success: false, message: `Failed to fetch filter options: ${errMsg}` });
        }
    }
    async getFilterCounts(req, res, _next) {
        try {
            const category = req.query.category?.toString();
            const state = req.query.state?.toString();
            const city = req.query.city?.toString();
            const cacheKey = `filterCounts:${category || ''}:${state || ''}:${city || ''}`;
            const cached = cache_service_1.cacheService.get(cacheKey);
            if (cached) {
                res.status(200).json({ success: true, data: cached });
                return;
            }
            const baseQuery = {};
            if (category)
                baseQuery.category = { $regex: category, $options: 'i' };
            if (state)
                baseQuery.searchedState = { $regex: state, $options: 'i' };
            if (city)
                baseQuery.searchedCity = { $regex: city, $options: 'i' };
            const [total, withWebsite, withPhone, withEmail, validated] = await Promise.all([
                Lead_1.Lead.countDocuments(baseQuery),
                Lead_1.Lead.countDocuments({ ...baseQuery, website: { $exists: true, $nin: [null, ''] } }),
                Lead_1.Lead.countDocuments({ ...baseQuery, phone: { $exists: true, $nin: [null, ''] } }),
                Lead_1.Lead.countDocuments({ ...baseQuery, email: { $exists: true, $nin: [null, ''] } }),
                Lead_1.Lead.countDocuments({ ...baseQuery, validationStatus: 'validated' }),
            ]);
            const data = { total, withWebsite, withPhone, withEmail, validated };
            cache_service_1.cacheService.set(cacheKey, data, 15000);
            res.status(200).json({ success: true, data });
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error({ err: errMsg }, '[getFilterCounts] Error');
            res.status(500).json({ success: false, message: `Failed to fetch filter counts: ${errMsg}` });
        }
    }
    async getLead(req, res, next) {
        try {
            const lead = await this.leadService.getLeadById(req.params.id);
            if (!lead) {
                api_response_1.APIResponse.error(res, 'Lead not found', null, 404);
                return;
            }
            if (lead.website) {
                const analysis = website_analysis_service_1.websiteAnalysisService.analyze(lead.website);
                if (lead.analysisEligible !== analysis.analysisEligible || lead.normalizedDomain !== analysis.normalizedDomain) {
                    await Lead_1.Lead.findByIdAndUpdate(req.params.id, {
                        analysisEligible: analysis.analysisEligible,
                        normalizedDomain: analysis.normalizedDomain || undefined,
                        hasWebsite: analysis.hasWebsite,
                        hasRealWebsite: analysis.analysisEligible,
                    });
                    logger_1.logger.info(`[LeadController] Synced lead ${lead._id}: analysisEligible=${analysis.analysisEligible}, domain=${analysis.normalizedDomain}`);
                }
            }
            else if (lead.analysisEligible !== false) {
                await Lead_1.Lead.findByIdAndUpdate(req.params.id, {
                    analysisEligible: false,
                    normalizedDomain: undefined,
                    hasWebsite: false,
                    hasRealWebsite: false,
                });
            }
            const updatedLead = await this.leadService.getLeadById(req.params.id);
            api_response_1.APIResponse.success(res, updatedLead, 'Lead fetched successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async createLead(req, res, next) {
        try {
            const lead = await this.leadService.createLead(req.body);
            api_response_1.APIResponse.success(res, lead, 'Lead created successfully', 201);
        }
        catch (error) {
            next(error);
        }
    }
    async updateLead(req, res, next) {
        try {
            const lead = await this.leadService.updateLead(req.params.id, req.body);
            if (!lead) {
                api_response_1.APIResponse.error(res, 'Lead not found', null, 404);
                return;
            }
            api_response_1.APIResponse.success(res, lead, 'Lead updated successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async deleteLead(req, res, next) {
        try {
            const deleted = await this.leadService.deleteLead(req.params.id);
            if (!deleted) {
                api_response_1.APIResponse.error(res, 'Lead not found', null, 404);
                return;
            }
            api_response_1.APIResponse.success(res, null, 'Lead deleted successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async getCategories(_req, res, next) {
        try {
            const categories = await this.leadService.getDistinctCategories();
            api_response_1.APIResponse.success(res, categories, 'Categories fetched successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async deleteAllLeads(_req, res, next) {
        try {
            const result = await this.leadService.deleteAllLeads();
            api_response_1.APIResponse.success(res, result, 'All leads deleted successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async analyzeLead(req, res, next) {
        try {
            const { leadId } = req.body;
            if (!leadId) {
                api_response_1.APIResponse.error(res, 'leadId is required', null, 400);
                return;
            }
            const lead = await this.leadService.getLeadById(leadId);
            if (!lead) {
                api_response_1.APIResponse.error(res, 'Lead not found', null, 404);
                return;
            }
            if (!lead.website) {
                api_response_1.APIResponse.error(res, 'Lead has no website', null, 400);
                return;
            }
            const leadAnalysis = await this.websiteAnalyzerService.analyzeLead(leadId, lead.website);
            lead.websiteStatus = leadAnalysis.websiteStatus;
            lead.leadScore = leadAnalysis.leadScore;
            lead.qualificationLevel = leadAnalysis.qualificationLevel;
            lead.sslEnabled = leadAnalysis.analysisData.sslEnabled;
            lead.responseTime = leadAnalysis.analysisData.responseTime;
            lead.metaTitle = leadAnalysis.analysisData.metaTitle;
            lead.metaDescription = leadAnalysis.analysisData.metaDescription;
            lead.hasContactPage = leadAnalysis.analysisData.hasContactPage;
            lead.hasSocialLinks = leadAnalysis.analysisData.hasSocialLinks;
            lead.analyzedAt = new Date(leadAnalysis.analyzedAt);
            await lead.save();
            api_response_1.APIResponse.success(res, lead, 'Lead analyzed successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async bulkAnalyzeLeads(req, res, next) {
        try {
            const { limit = 50 } = req.body;
            const leads = await this.leadService.getAllLeads({
                limit: 1000,
            });
            if (leads.leads.length === 0) {
                api_response_1.APIResponse.success(res, { totalAnalyzed: 0, results: [] }, 'No leads found');
                return;
            }
            const leadsWithWebsites = leads.leads.filter((lead) => !!lead.website).slice(0, limit);
            if (leadsWithWebsites.length === 0) {
                api_response_1.APIResponse.success(res, { totalAnalyzed: 0, results: [] }, 'No leads with websites found');
                return;
            }
            const leadsToAnalyze = leadsWithWebsites.map((lead) => ({
                id: lead.id,
                website: lead.website,
            }));
            const result = await this.websiteAnalyzerService.analyzeBulk(leadsToAnalyze, { limit });
            for (const analysis of result.results) {
                await this.leadService.updateLead(analysis.leadId, {
                    websiteStatus: analysis.websiteStatus,
                    leadScore: analysis.leadScore,
                    qualificationLevel: analysis.qualificationLevel,
                    sslEnabled: analysis.analysisData.sslEnabled,
                    responseTime: analysis.analysisData.responseTime,
                    metaTitle: analysis.analysisData.metaTitle,
                    metaDescription: analysis.analysisData.metaDescription,
                    hasContactPage: analysis.analysisData.hasContactPage,
                    hasSocialLinks: analysis.analysisData.hasSocialLinks,
                    analyzedAt: new Date(analysis.analyzedAt),
                });
            }
            api_response_1.APIResponse.success(res, result, 'Bulk analysis completed');
        }
        catch (error) {
            next(error);
        }
    }
    async getQualificationStats(_req, res, next) {
        try {
            const stats = await this.leadQualificationService.getQualificationStats();
            api_response_1.APIResponse.success(res, stats, 'Qualification stats fetched successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async requalifyUnanalyzedLeads(req, res, next) {
        try {
            const { limit = 50 } = req.body;
            const result = await this.leadQualificationService.requalifyUnanalyzedLeads({ limit });
            api_response_1.APIResponse.success(res, result, 'Re-qualification completed');
        }
        catch (error) {
            next(error);
        }
    }
    async triggerLeadAudits(req, res, next) {
        try {
            const { leadId } = req.body;
            if (!leadId) {
                api_response_1.APIResponse.error(res, 'leadId is required', null, 400);
                return;
            }
            logger_1.logger.info(`[LeadController] Audit request for lead ${leadId}`);
            const result = await lead_audit_trigger_service_1.leadAuditTriggerService.triggerMissingAuditsForLead(leadId, false);
            logger_1.logger.info(`[LeadController] Audit completed: responsive=${result.responsiveAuditStatus}, intelligence=${result.businessIntelligenceStatus}`);
            api_response_1.APIResponse.success(res, result, 'Audit trigger completed');
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), '[LeadController] Trigger audit error');
            next(error);
        }
    }
    async triggerBulkAudits(req, res, next) {
        try {
            const { leadIds } = req.body;
            if (!Array.isArray(leadIds) || leadIds.length === 0) {
                api_response_1.APIResponse.error(res, 'leadIds array is required', null, 400);
                return;
            }
            const results = await lead_audit_trigger_service_1.leadAuditTriggerService.triggerMissingAuditsForMultipleLeads(leadIds);
            api_response_1.APIResponse.success(res, results, 'Bulk audit trigger initiated');
        }
        catch (error) {
            next(error);
        }
    }
    async triggerAllMissingAudits(req, res, next) {
        try {
            const { limit = 100 } = req.body;
            const result = await lead_audit_trigger_service_1.leadAuditTriggerService.triggerAllMissingAudits({ limit });
            api_response_1.APIResponse.success(res, result, 'All missing audits triggered');
        }
        catch (error) {
            next(error);
        }
    }
    async reprocessAllLeads(_req, res, next) {
        try {
            const { Lead } = await Promise.resolve().then(() => __importStar(require('../models/Lead')));
            const leads = await Lead.find({
                website: { $exists: true, $nin: [null, ''] },
            })
                .select('_id website')
                .lean();
            if (leads.length === 0) {
                api_response_1.APIResponse.success(res, { enqueued: 0 }, 'No leads with websites found');
                return;
            }
            await lead_audit_processor_service_1.leadAuditProcessor.enqueueMany(leads.map(l => ({
                leadId: l._id.toString(),
                website: l.website,
            })));
            api_response_1.APIResponse.success(res, {
                enqueued: leads.length,
                message: `${leads.length} leads enqueued for reprocessing`,
            }, 'Reprocess all leads initiated');
        }
        catch (error) {
            next(error);
        }
    }
    async reclassifyLeads(_req, res, next) {
        try {
            const result = await lead_migration_service_1.leadMigrationService.reclassifyAllLeads();
            api_response_1.APIResponse.success(res, result, 'Lead URL reclassification complete');
        }
        catch (error) {
            next(error);
        }
    }
    async getClassificationStats(_req, res, next) {
        try {
            const stats = await lead_migration_service_1.leadMigrationService.getClassificationStats();
            api_response_1.APIResponse.success(res, stats, 'Classification stats retrieved');
        }
        catch (error) {
            next(error);
        }
    }
    async getKeywordStats(req, res, next) {
        try {
            const { keyword, state, city, area } = req.query;
            const query = {};
            if (keyword) {
                query.$or = [
                    { semanticKeyword: { $regex: keyword, $options: 'i' } },
                    { searchedKeyword: { $regex: keyword, $options: 'i' } },
                ];
            }
            if (state)
                query.searchedState = { $regex: state, $options: 'i' };
            if (city)
                query.searchedCity = { $regex: city, $options: 'i' };
            if (area)
                query.searchedArea = { $regex: area, $options: 'i' };
            const totalLeads = await Lead_1.Lead.countDocuments(query);
            const leads = await Lead_1.Lead.find(query).lean();
            const keywordCounts = {};
            const sourceCounts = {};
            const domainCounts = {};
            for (const lead of leads) {
                const kw = lead.semanticKeyword || lead.searchedKeyword || 'unknown';
                keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
                const src = lead.source || 'unknown';
                sourceCounts[src] = (sourceCounts[src] || 0) + 1;
                if (lead.website) {
                    try {
                        const hostname = new URL(lead.website.startsWith('http') ? lead.website : `https://${lead.website}`).hostname.replace(/^www\./, '');
                        domainCounts[hostname] = (domainCounts[hostname] || 0) + 1;
                    }
                    catch {
                    }
                }
            }
            const uniqueWebsites = new Set();
            for (const lead of leads) {
                if (lead.website) {
                    try {
                        const hostname = new URL(lead.website.startsWith('http') ? lead.website : `https://${lead.website}`).hostname.replace(/^www\./, '');
                        uniqueWebsites.add(hostname);
                    }
                    catch {
                    }
                }
            }
            const classificationStats = await lead_migration_service_1.leadMigrationService.getClassificationStats();
            api_response_1.APIResponse.success(res, {
                keyword: keyword,
                state,
                city,
                area,
                totalLeads,
                uniqueWebsites: uniqueWebsites.size,
                keywordCounts,
                sourceCounts,
                domainCounts,
                classificationStats,
            }, 'Keyword stats retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    }
    async getSearchHistory(req, res, next) {
        try {
            const { SearchHistory } = await Promise.resolve().then(() => __importStar(require('../models/SearchHistory')));
            const page = parseInt(req.query.page?.toString() || '1', 10);
            const limit = parseInt(req.query.limit?.toString() || '10', 10);
            const search = req.query.search?.toString();
            const filterState = req.query.state?.toString();
            const filterKeyword = req.query.keyword?.toString();
            const filterDate = req.query.date?.toString();
            const filterStatus = req.query.status?.toString();
            const query = {};
            if (filterStatus) {
                const statuses = filterStatus.split(',').map(s => s.trim().toUpperCase());
                query.status = { $in: statuses };
            }
            if (filterState) {
                query.state = { $regex: filterState, $options: 'i' };
            }
            if (filterKeyword) {
                query.keyword = { $regex: filterKeyword, $options: 'i' };
            }
            if (search) {
                query.$or = [
                    { keyword: { $regex: search, $options: 'i' } },
                    { state: { $regex: search, $options: 'i' } },
                    { city: { $regex: search, $options: 'i' } },
                    { area: { $regex: search, $options: 'i' } },
                    { country: { $regex: search, $options: 'i' } },
                ];
            }
            if (filterDate) {
                const startOfDay = new Date(filterDate);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(filterDate);
                endOfDay.setHours(23, 59, 59, 999);
                query.startedAt = { $gte: startOfDay, $lte: endOfDay };
            }
            const skip = (page - 1) * limit;
            const [total, records] = await Promise.all([
                SearchHistory.countDocuments(query),
                SearchHistory.find(query)
                    .sort({ startedAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
            ]);
            logger_1.logger.info({ total, page, limit, filterStatus }, '[getSearchHistory] SearchHistory records fetched');
            const dataWithSrNo = records.map((r, idx) => ({
                srNo: skip + idx + 1,
                searchSessionId: r.searchSessionId,
                keyword: r.keyword,
                category: r.category,
                state: r.state,
                city: r.city,
                area: r.area,
                country: r.country,
                sources: r.sources,
                status: r.status,
                searchState: r.searchState,
                startedAt: r.startedAt,
                completedAt: r.completedAt,
                stoppedAt: r.stoppedAt,
                duration: r.duration || 0,
                totalLeads: r.businessesSaved || r.currentSaved || r.totalLeads || 0,
                businessesFound: r.businessesFound || r.currentFound || 0,
                businessesSaved: r.businessesSaved || r.currentSaved || 0,
                duplicates: r.duplicates || r.currentDuplicates || 0,
                rejected: r.rejected || r.rejectedCount || 0,
                progress: r.progress || 0,
                maxProgressReached: r.maxProgressReached || 0,
                currentBusiness: r.currentBusiness || '',
                lastProcessedBusiness: r.lastProcessedBusiness || '',
                failureReason: r.failureReason || r.error || '',
                failureClassification: r.failureClassification,
                errorMetadata: r.errorMetadata,
                isRunning: r.isRunning,
                lastHeartbeat: r.lastHeartbeat,
                lastUpdateTime: r.lastUpdateTime,
                sourceBreakdown: r.sourceBreakdown || {},
                createdAt: r.createdAt,
                updatedAt: r.updatedAt,
                latestSearchDate: r.completedAt || r.stoppedAt || r.startedAt,
                firstSearchDate: r.startedAt,
            }));
            const totalPages = Math.ceil(total / limit);
            res.status(200).json({
                success: true,
                data: dataWithSrNo,
                pagination: { page, limit, total, totalPages },
            });
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Unknown error';
            const errStack = error instanceof Error ? error.stack : '';
            logger_1.logger.error({ err: errMsg, stack: errStack }, '[getSearchHistory] Error fetching search history');
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    message: `Failed to fetch search history: ${errMsg}`,
                });
            }
            next(error);
        }
    }
}
exports.LeadController = LeadController;
exports.leadController = new LeadController();
//# sourceMappingURL=lead.controller.js.map