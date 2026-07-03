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
exports.aiAnalysisEngine = exports.AIAnalysisEngine = void 0;
const Lead_1 = require("../models/Lead");
const logger_1 = require("../utils/logger");
const seo_audit_service_1 = require("./seo-audit.service");
const performance_audit_service_1 = require("./performance-audit.service");
const lead_scoring_service_1 = require("./lead-scoring.service");
const lead_opportunity_service_1 = require("./lead-opportunity.service");
const outreach_generator_service_1 = require("./outreach-generator.service");
const report_generator_service_1 = require("./report-generator.service");
const website_audit_service_1 = require("./website-audit.service");
function getResponsiveStatus(score) {
    if (score === undefined)
        return 'poor';
    if (score >= 90)
        return 'excellent';
    if (score >= 70)
        return 'good';
    if (score >= 50)
        return 'average';
    if (score >= 25)
        return 'poor';
    return 'critical';
}
const MAX_CONCURRENT = 2;
class AIAnalysisEngine {
    constructor() {
        this.queue = [];
        this.processing = new Set();
        this.running = false;
    }
    enqueueAnalysis(leadId) {
        if (this.processing.has(leadId))
            return;
        if (this.queue.includes(leadId))
            return;
        this.queue.push(leadId);
        logger_1.logger.debug({ leadId }, 'AIAnalysis: Queued');
        if (!this.running)
            this.processQueue();
    }
    async processQueue() {
        this.running = true;
        while (this.queue.length > 0 && this.processing.size < MAX_CONCURRENT) {
            const leadId = this.queue.shift();
            if (!leadId || this.processing.has(leadId))
                continue;
            this.processing.add(leadId);
            this.runAnalysis(leadId).finally(() => {
                this.processing.delete(leadId);
                setImmediate(() => {
                    if (this.queue.length > 0 && this.processing.size < MAX_CONCURRENT)
                        this.processQueue();
                    else
                        this.running = false;
                });
            });
        }
        if (this.queue.length === 0)
            this.running = false;
    }
    async runAnalysis(leadId) {
        const startTime = Date.now();
        logger_1.logger.info({ leadId }, 'AIAnalysis: Started');
        try {
            const lead = await Lead_1.Lead.findById(leadId);
            if (!lead) {
                logger_1.logger.warn({ leadId }, 'AIAnalysis: Lead not found');
                return;
            }
            await Lead_1.Lead.findByIdAndUpdate(leadId, {
                $set: {
                    aiStatus: 'processing',
                    aiCurrentStep: 'seo-audit',
                    aiProgress: 10,
                    aiCurrentStepIndex: 0,
                    aiTotalSteps: 6,
                    processingStartedAt: new Date(),
                },
            });
            const websiteUrl = lead.website || '';
            let html = '';
            let seoResult = null;
            let perfResult = null;
            if (lead.websiteReachable && websiteUrl) {
                try {
                    const { browserManager } = await Promise.resolve().then(() => __importStar(require('../core/scraper-engine/browser-manager')));
                    const { page } = await browserManager.acquire('ai-analysis');
                    try {
                        await page.goto(websiteUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
                        html = await page.content();
                    }
                    finally {
                        await browserManager.release(page, 'ai-analysis').catch(() => { });
                    }
                }
                catch {
                    logger_1.logger.warn({ leadId }, 'AIAnalysis: Could not fetch page HTML for SEO/performance audit');
                }
            }
            await Lead_1.Lead.findByIdAndUpdate(leadId, {
                $set: { aiCurrentStep: 'seo-audit', aiProgress: 25, aiCurrentStepIndex: 1 },
            });
            if (html) {
                seoResult = seo_audit_service_1.seoAuditService.auditFromHtml(html);
                logger_1.logger.info({ leadId, seoScore: seoResult.score, issues: seoResult.issues.length }, 'AIAnalysis: SEO audit complete');
            }
            await Lead_1.Lead.findByIdAndUpdate(leadId, {
                $set: { aiCurrentStep: 'performance-audit', aiProgress: 40, aiCurrentStepIndex: 2 },
            });
            if (lead.websiteReachable && websiteUrl) {
                perfResult = await performance_audit_service_1.performanceAuditService.auditUrl(websiteUrl);
                logger_1.logger.info({ leadId, perfScore: perfResult.score, loadTimeMs: perfResult.loadTimeMs }, 'AIAnalysis: Performance audit complete');
            }
            await Lead_1.Lead.findByIdAndUpdate(leadId, {
                $set: { aiCurrentStep: 'opportunity-analysis', aiProgress: 55, aiCurrentStepIndex: 3 },
            });
            const opportunityResult = lead_opportunity_service_1.leadOpportunityService.analyze({
                hasWebsite: lead.hasWebsite,
                websiteReachable: lead.websiteReachable,
                websiteMetadata: lead.websiteMetadata,
                seoAudit: seoResult ? { score: seoResult.score } : undefined,
                responsiveScore: lead.responsiveScore,
                phones: lead.phones,
                email: lead.email,
                socialLinks: lead.socialLinks,
                websiteQuality: lead.websiteQuality,
            });
            logger_1.logger.info({ leadId, opportunity: opportunityResult.opportunity }, 'AIAnalysis: Opportunity analysis complete');
            await Lead_1.Lead.findByIdAndUpdate(leadId, {
                $set: { aiCurrentStep: 'lead-scoring', aiProgress: 70, aiCurrentStepIndex: 4 },
            });
            const scoreResult = lead_scoring_service_1.leadScoringService.calculate({
                hasWebsite: lead.hasWebsite,
                websiteReachable: lead.websiteReachable,
                email: lead.email,
                phone: lead.phone,
                rating: lead.rating,
                reviewsCount: lead.reviewsCount,
                businessStatus: lead.businessStatus,
                responsiveScore: lead.responsiveScore,
                seoScore: seoResult?.score,
                socialLinks: lead.socialLinks,
                websiteQuality: lead.websiteQuality,
            });
            logger_1.logger.info({ leadId, score: scoreResult.score, priority: scoreResult.priority }, 'AIAnalysis: Lead scoring complete');
            await Lead_1.Lead.findByIdAndUpdate(leadId, {
                $set: { aiCurrentStep: 'outreach-generation', aiProgress: 85, aiCurrentStepIndex: 5 },
            });
            const outreachResult = outreach_generator_service_1.outreachGeneratorService.generate({
                companyName: lead.companyName,
                website: lead.website,
                email: lead.email,
                phone: lead.phone,
                category: lead.category,
                city: lead.searchedCity || undefined,
                state: lead.searchedState || undefined,
                rating: lead.rating,
                reviewsCount: lead.reviewsCount,
                websiteReachable: lead.websiteReachable,
                websiteQuality: lead.websiteQuality,
                businessStatus: lead.businessStatus,
            });
            logger_1.logger.info({ leadId }, 'AIAnalysis: Outreach generation complete');
            const reportResult = report_generator_service_1.reportGeneratorService.generate({
                companyName: lead.companyName,
                category: lead.category,
                city: lead.searchedCity,
                state: lead.searchedState,
                rating: lead.rating,
                reviewsCount: lead.reviewsCount,
                businessStatus: lead.businessStatus,
                website: lead.website,
                websiteReachable: lead.websiteReachable,
                websiteMetadata: lead.websiteMetadata,
                responsiveAudit: lead.responsiveAudit,
                responsiveScore: lead.responsiveScore,
                seoAudit: seoResult ? { score: seoResult.score, issues: seoResult.issues, title: seoResult.title, description: seoResult.metaDescription } : undefined,
                performanceAudit: perfResult ? { score: perfResult.score, loadTimeMs: perfResult.loadTimeMs, issues: perfResult.issues } : undefined,
                websiteQuality: lead.websiteQuality,
                leadScore: scoreResult.score,
                priority: scoreResult.priority,
                websiteOpportunity: opportunityResult,
            });
            logger_1.logger.info({ leadId }, 'AIAnalysis: Report generation complete');
            await Lead_1.Lead.findByIdAndUpdate(leadId, {
                $set: { aiCurrentStep: 'website-audit', aiProgress: 95, aiCurrentStepIndex: 6 },
            });
            const websiteAuditResult = website_audit_service_1.websiteAuditService.audit({
                websiteReachable: lead.websiteReachable,
                websiteMetadata: lead.websiteMetadata,
                websiteQuality: lead.websiteQuality,
                footerAudit: lead.footerAudit,
                socialLinks: lead.socialLinks,
                emails: lead.emails,
                phones: lead.phones,
                email: lead.email,
                phone: lead.phone,
            });
            logger_1.logger.info({ leadId, auditScore: websiteAuditResult.score, issues: websiteAuditResult.detectedIssues.length }, 'AIAnalysis: Website audit complete');
            const updateFields = {
                aiStatus: 'completed',
                aiProgress: 100,
                aiCurrentStep: 'completed',
                aiCurrentStepIndex: 7,
                processingCompletedAt: new Date(),
                aiError: null,
                leadScore: scoreResult.score,
                priority: scoreResult.priority,
                scoreReasoning: scoreResult.reasoning,
                scoreBreakdown: scoreResult.breakdown,
                responsiveStatus: getResponsiveStatus(lead.responsiveScore),
                websiteAudit: websiteAuditResult,
            };
            if (seoResult) {
                updateFields.seoAudit = seoResult;
            }
            if (perfResult) {
                updateFields.performanceAudit = perfResult;
            }
            updateFields.websiteOpportunity = opportunityResult;
            const now = new Date().toISOString();
            updateFields.analysisTimestamp = now;
            updateFields.generatedEmail = outreachResult.coldEmail;
            updateFields.generatedWhatsApp = outreachResult.whatsappMessage;
            updateFields.generatedCallScript = outreachResult.callScript;
            updateFields.generatedWebsiteProposal = outreachResult.websiteProposal;
            updateFields.outreachSubject = outreachResult.subject;
            updateFields.analysisReport = reportResult;
            updateFields.recommendations = [
                ...(opportunityResult.recommendedServices || []),
                ...(seoResult?.issues || []).map(i => `SEO: ${i}`),
                ...(perfResult?.issues || []).map(i => `Performance: ${i}`),
            ];
            await Lead_1.Lead.findByIdAndUpdate(leadId, { $set: updateFields });
            logger_1.logger.info({
                leadId,
                durationMs: Date.now() - startTime,
                seoScore: seoResult?.score,
                perfScore: perfResult?.score,
                leadScore: scoreResult.score,
                priority: scoreResult.priority,
                opportunity: opportunityResult.opportunity,
            }, 'AIAnalysis: Completed');
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            logger_1.logger.error({ leadId, err: errMsg }, 'AIAnalysis: Failed');
            try {
                await Lead_1.Lead.findByIdAndUpdate(leadId, {
                    $set: {
                        aiStatus: 'failed',
                        aiError: errMsg,
                        processingCompletedAt: new Date(),
                    },
                });
            }
            catch { }
        }
    }
}
exports.AIAnalysisEngine = AIAnalysisEngine;
exports.aiAnalysisEngine = new AIAnalysisEngine();
//# sourceMappingURL=ai-analysis-engine.service.js.map