import { Lead } from '../models/Lead';
import { logger } from '../utils/logger';
import { seoAuditService } from './seo-audit.service';
import { performanceAuditService } from './performance-audit.service';
import { leadScoringService } from './lead-scoring.service';
import { leadOpportunityService } from './lead-opportunity.service';
import { outreachGeneratorService } from './outreach-generator.service';
import { reportGeneratorService } from './report-generator.service';
import { websiteAuditService } from './website-audit.service';

function getResponsiveStatus(score: number | undefined): 'excellent' | 'good' | 'average' | 'poor' | 'critical' {
  if (score === undefined) return 'poor';
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'average';
  if (score >= 25) return 'poor';
  return 'critical';
}

const MAX_CONCURRENT = 2;

export class AIAnalysisEngine {
  private queue: string[] = [];
  private processing = new Set<string>();
  private running = false;

  enqueueAnalysis(leadId: string): void {
    if (this.processing.has(leadId)) return;
    if (this.queue.includes(leadId)) return;
    this.queue.push(leadId);
    logger.debug({ leadId }, 'AIAnalysis: Queued');
    if (!this.running) this.processQueue();
  }

  private async processQueue(): Promise<void> {
    this.running = true;
    while (this.queue.length > 0 && this.processing.size < MAX_CONCURRENT) {
      const leadId = this.queue.shift();
      if (!leadId || this.processing.has(leadId)) continue;
      this.processing.add(leadId);
      this.runAnalysis(leadId).finally(() => {
        this.processing.delete(leadId);
        setImmediate(() => {
          if (this.queue.length > 0 && this.processing.size < MAX_CONCURRENT) this.processQueue();
          else this.running = false;
        });
      });
    }
    if (this.queue.length === 0) this.running = false;
  }

  private async runAnalysis(leadId: string): Promise<void> {
    const startTime = Date.now();
    logger.info({ leadId }, 'AIAnalysis: Started');

    try {
      const lead = await Lead.findById(leadId);
      if (!lead) {
        logger.warn({ leadId }, 'AIAnalysis: Lead not found');
        return;
      }

      await Lead.findByIdAndUpdate(leadId, {
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
          const { browserManager } = await import('../core/scraper-engine/browser-manager');
          const { page } = await browserManager.acquire('ai-analysis');
          try {
            await page.goto(websiteUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
            html = await page.content();
          } finally {
            await browserManager.release(page, 'ai-analysis').catch(() => {});
          }
        } catch {
          logger.warn({ leadId }, 'AIAnalysis: Could not fetch page HTML for SEO/performance audit');
        }
      }

      await Lead.findByIdAndUpdate(leadId, {
        $set: { aiCurrentStep: 'seo-audit', aiProgress: 25, aiCurrentStepIndex: 1 },
      });

      if (html) {
        seoResult = seoAuditService.auditFromHtml(html);
        logger.info({ leadId, seoScore: seoResult.score, issues: seoResult.issues.length }, 'AIAnalysis: SEO audit complete');
      }

      await Lead.findByIdAndUpdate(leadId, {
        $set: { aiCurrentStep: 'performance-audit', aiProgress: 40, aiCurrentStepIndex: 2 },
      });

      if (lead.websiteReachable && websiteUrl) {
        perfResult = await performanceAuditService.auditUrl(websiteUrl);
        logger.info({ leadId, perfScore: perfResult.score, loadTimeMs: perfResult.loadTimeMs }, 'AIAnalysis: Performance audit complete');
      }

      await Lead.findByIdAndUpdate(leadId, {
        $set: { aiCurrentStep: 'opportunity-analysis', aiProgress: 55, aiCurrentStepIndex: 3 },
      });

      const opportunityResult = leadOpportunityService.analyze({
        hasWebsite: lead.hasWebsite,
        websiteReachable: lead.websiteReachable,
        websiteMetadata: lead.websiteMetadata as any,
        seoAudit: seoResult ? { score: seoResult.score } : undefined,
        responsiveScore: lead.responsiveScore,
        phones: lead.phones,
        email: lead.email,
        socialLinks: lead.socialLinks as Record<string, unknown>,
        websiteQuality: lead.websiteQuality as any,
      });

      logger.info({ leadId, opportunity: opportunityResult.opportunity }, 'AIAnalysis: Opportunity analysis complete');

      await Lead.findByIdAndUpdate(leadId, {
        $set: { aiCurrentStep: 'lead-scoring', aiProgress: 70, aiCurrentStepIndex: 4 },
      });

      const scoreResult = leadScoringService.calculate({
        hasWebsite: lead.hasWebsite,
        websiteReachable: lead.websiteReachable,
        email: lead.email,
        phone: lead.phone,
        rating: lead.rating,
        reviewsCount: lead.reviewsCount,
        businessStatus: lead.businessStatus,
        responsiveScore: lead.responsiveScore,
        seoScore: seoResult?.score,
        socialLinks: lead.socialLinks as Record<string, unknown>,
        websiteQuality: lead.websiteQuality as any,
      });

      logger.info({ leadId, score: scoreResult.score, priority: scoreResult.priority }, 'AIAnalysis: Lead scoring complete');

      await Lead.findByIdAndUpdate(leadId, {
        $set: { aiCurrentStep: 'outreach-generation', aiProgress: 85, aiCurrentStepIndex: 5 },
      });

      const outreachResult = outreachGeneratorService.generate({
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
        websiteQuality: lead.websiteQuality as any,
        businessStatus: lead.businessStatus,
      });

      logger.info({ leadId }, 'AIAnalysis: Outreach generation complete');

      const reportResult = reportGeneratorService.generate({
        companyName: lead.companyName,
        category: lead.category,
        city: lead.searchedCity,
        state: lead.searchedState,
        rating: lead.rating,
        reviewsCount: lead.reviewsCount,
        businessStatus: lead.businessStatus,
        website: lead.website,
        websiteReachable: lead.websiteReachable,
        websiteMetadata: lead.websiteMetadata as any,
        responsiveAudit: lead.responsiveAudit as Record<string, unknown>,
        responsiveScore: lead.responsiveScore,
        seoAudit: seoResult ? { score: seoResult.score, issues: seoResult.issues, title: seoResult.title, description: seoResult.metaDescription } : undefined,
        performanceAudit: perfResult ? { score: perfResult.score, loadTimeMs: perfResult.loadTimeMs, issues: perfResult.issues } : undefined,
        websiteQuality: lead.websiteQuality as any,
        leadScore: scoreResult.score,
        priority: scoreResult.priority,
        websiteOpportunity: opportunityResult as any,
      });

      logger.info({ leadId }, 'AIAnalysis: Report generation complete');

      await Lead.findByIdAndUpdate(leadId, {
        $set: { aiCurrentStep: 'website-audit', aiProgress: 95, aiCurrentStepIndex: 6 },
      });

      const websiteAuditResult = websiteAuditService.audit({
        websiteReachable: lead.websiteReachable,
        websiteMetadata: lead.websiteMetadata as any,
        websiteQuality: lead.websiteQuality as any,
        footerAudit: lead.footerAudit as any,
        socialLinks: lead.socialLinks as Record<string, string>,
        emails: lead.emails,
        phones: lead.phones,
        email: lead.email,
        phone: lead.phone,
      });

      logger.info({ leadId, auditScore: websiteAuditResult.score, issues: websiteAuditResult.detectedIssues.length }, 'AIAnalysis: Website audit complete');

      const updateFields: Record<string, unknown> = {
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

      await Lead.findByIdAndUpdate(leadId, { $set: updateFields });

      logger.info({
        leadId,
        durationMs: Date.now() - startTime,
        seoScore: seoResult?.score,
        perfScore: perfResult?.score,
        leadScore: scoreResult.score,
        priority: scoreResult.priority,
        opportunity: opportunityResult.opportunity,
      }, 'AIAnalysis: Completed');
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error({ leadId, err: errMsg }, 'AIAnalysis: Failed');
      try {
        await Lead.findByIdAndUpdate(leadId, {
          $set: {
            aiStatus: 'failed',
            aiError: errMsg,
            processingCompletedAt: new Date(),
          },
        });
      } catch { }
    }
  }
}

export const aiAnalysisEngine = new AIAnalysisEngine();
