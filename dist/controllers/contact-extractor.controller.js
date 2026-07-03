"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contactExtractorController = exports.ContactExtractorController = void 0;
const contact_extractor_service_1 = require("../services/contact-extractor.service");
const website_crawler_service_1 = require("../services/website-crawler.service");
const social_extractor_service_1 = require("../services/social-extractor.service");
const owner_detector_service_1 = require("../services/owner-detector.service");
const contact_page_detector_service_1 = require("../services/contact-page-detector.service");
const api_response_1 = require("../utils/api-response");
const lead_service_1 = require("../services/lead.service");
const logger_1 = require("../utils/logger");
class ContactExtractorController {
    constructor() {
        this.leadService = new lead_service_1.LeadService();
    }
    async extractContacts(req, res, next) {
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
            api_response_1.APIResponse.success(res, {
                leadId,
                status: 'processing',
                message: 'Contact extraction started in background',
            }, 'Contact extraction queued');
            setImmediate(async () => {
                try {
                    const extractionResult = await contact_extractor_service_1.contactExtractorService.extractContacts(lead.website);
                    const updateData = {
                        emails: extractionResult.emails,
                        phones: extractionResult.phones,
                        socialLinks: {
                            ...(lead.socialLinks || {}),
                            ...extractionResult.socialLinks,
                        },
                        contactPages: extractionResult.contactPages,
                        ownerNames: extractionResult.ownerNames,
                        extractionStatus: extractionResult.extractionStatus,
                        extractedAt: new Date(),
                    };
                    if (extractionResult.extractionStatus === 'success') {
                        updateData.aiLeadScore = lead.leadScore;
                        updateData.aiQualificationLevel = lead.qualificationLevel;
                    }
                    await this.leadService.updateLead(leadId, updateData);
                    logger_1.logger.info({ leadId, status: extractionResult.extractionStatus }, 'Contact extraction completed in background');
                }
                catch (bgError) {
                    logger_1.logger.error({ leadId, err: bgError instanceof Error ? bgError.message : String(bgError) }, 'Background contact extraction failed');
                }
            });
        }
        catch (error) {
            next(error);
        }
    }
    async bulkExtractContacts(req, res, next) {
        try {
            const { limit = 50 } = req.body;
            const leads = await this.leadService.getAllLeads({
                limit: 1000,
            });
            if (leads.leads.length === 0) {
                api_response_1.APIResponse.success(res, {
                    totalProcessed: 0,
                    successful: 0,
                    failed: 0,
                    results: [],
                }, 'No leads found for extraction');
                return;
            }
            const leadsWithWebsites = leads.leads
                .filter((lead) => !!lead.website)
                .slice(0, limit);
            if (leadsWithWebsites.length === 0) {
                api_response_1.APIResponse.success(res, {
                    totalProcessed: 0,
                    successful: 0,
                    failed: 0,
                    results: [],
                }, 'No leads with websites found');
                return;
            }
            const extractionResult = await contact_extractor_service_1.contactExtractorService.bulkExtractContacts(leadsWithWebsites.map((lead) => ({ id: lead.id, website: lead.website })));
            for (const result of extractionResult.results) {
                if (result.result.extractionStatus === 'success') {
                    await this.leadService.updateLead(result.leadId, {
                        emails: result.result.emails,
                        phones: result.result.phones,
                        socialLinks: {
                            facebook: result.result.socialLinks.facebook,
                            instagram: result.result.socialLinks.instagram,
                            linkedin: result.result.socialLinks.linkedin,
                            twitter: result.result.socialLinks.twitter,
                            youtube: result.result.socialLinks.youtube,
                        },
                        contactPages: result.result.contactPages,
                        ownerNames: result.result.ownerNames,
                        extractionStatus: result.result.extractionStatus,
                        extractedAt: new Date(),
                    });
                }
            }
            api_response_1.APIResponse.success(res, {
                totalProcessed: extractionResult.totalProcessed,
                successful: extractionResult.successful,
                failed: extractionResult.failed,
                results: extractionResult.results.map(r => ({
                    leadId: r.leadId,
                    emails: r.result.emails,
                    phones: r.result.phones,
                    socialLinks: r.result.socialLinks,
                    extractionStatus: r.result.extractionStatus,
                })),
            }, 'Bulk extraction completed');
        }
        catch (error) {
            next(error);
        }
    }
    async crawlWebsite(req, res, next) {
        try {
            const { leadId } = req.body;
            if (!leadId) {
                api_response_1.APIResponse.error(res, 'leadId is required', null, 400);
                return;
            }
            const lead = await this.leadService.getLeadById(leadId);
            if (!lead || !lead.website) {
                api_response_1.APIResponse.error(res, 'Lead or website not found', null, 404);
                return;
            }
            const crawlResult = await website_crawler_service_1.websiteCrawlerService.crawlAndExtractContacts(lead.website);
            await this.leadService.updateLead(leadId, {
                emails: crawlResult.emails,
                phones: crawlResult.phones,
                socialLinks: {
                    ...(lead.socialLinks || {}),
                    ...crawlResult.socialLinks,
                },
                extractedAt: new Date(),
            });
            api_response_1.APIResponse.success(res, {
                leadId,
                crawledPages: crawlResult.crawledPages,
                emails: crawlResult.emails,
                phones: crawlResult.phones,
                socialLinks: crawlResult.socialLinks,
            }, 'Website crawl completed');
        }
        catch (error) {
            next(error);
        }
    }
    async extractSocialLinks(req, res, next) {
        try {
            const { leadId } = req.body;
            if (!leadId) {
                api_response_1.APIResponse.error(res, 'leadId is required', null, 400);
                return;
            }
            const lead = await this.leadService.getLeadById(leadId);
            if (!lead || !lead.website) {
                api_response_1.APIResponse.error(res, 'Lead or website not found', null, 404);
                return;
            }
            const socialLinks = await social_extractor_service_1.socialExtractorService.extractSocialLinks(lead.website);
            await this.leadService.updateLead(leadId, {
                socialLinks: {
                    ...(lead.socialLinks || {}),
                    ...socialLinks,
                },
                extractedAt: new Date(),
            });
            api_response_1.APIResponse.success(res, {
                leadId,
                socialLinks,
            }, 'Social links extracted');
        }
        catch (error) {
            next(error);
        }
    }
    async detectOwner(req, res, next) {
        try {
            const { leadId } = req.body;
            if (!leadId) {
                api_response_1.APIResponse.error(res, 'leadId is required', null, 400);
                return;
            }
            const lead = await this.leadService.getLeadById(leadId);
            if (!lead || !lead.website) {
                api_response_1.APIResponse.error(res, 'Lead or website not found', null, 404);
                return;
            }
            const ownerResult = await owner_detector_service_1.ownerDetectorService.detectOwner(lead.website);
            await this.leadService.updateLead(leadId, {
                ownerNames: ownerResult.ownerNames,
                extractedAt: new Date(),
            });
            api_response_1.APIResponse.success(res, {
                leadId,
                ...ownerResult,
            }, 'Owner detection completed');
        }
        catch (error) {
            next(error);
        }
    }
    async detectContactPages(req, res, next) {
        try {
            const { leadId } = req.body;
            if (!leadId) {
                api_response_1.APIResponse.error(res, 'leadId is required', null, 400);
                return;
            }
            const lead = await this.leadService.getLeadById(leadId);
            if (!lead || !lead.website) {
                api_response_1.APIResponse.error(res, 'Lead or website not found', null, 404);
                return;
            }
            const contactPages = await contact_page_detector_service_1.contactPageDetectorService.detectContactPages(lead.website);
            await this.leadService.updateLead(leadId, {
                contactPages: contactPages.map(page => page.url),
                extractedAt: new Date(),
            });
            api_response_1.APIResponse.success(res, {
                leadId,
                contactPages,
            }, 'Contact pages detected');
        }
        catch (error) {
            next(error);
        }
    }
    async fullExtraction(req, res, next) {
        try {
            const { leadId } = req.body;
            if (!leadId) {
                api_response_1.APIResponse.error(res, 'leadId is required', null, 400);
                return;
            }
            const lead = await this.leadService.getLeadById(leadId);
            if (!lead || !lead.website) {
                api_response_1.APIResponse.error(res, 'Lead or website not found', null, 404);
                return;
            }
            const [contactResult, socialResult, ownerResult, contactPageResult] = await Promise.all([
                contact_extractor_service_1.contactExtractorService.extractContacts(lead.website),
                social_extractor_service_1.socialExtractorService.extractSocialLinks(lead.website),
                owner_detector_service_1.ownerDetectorService.detectOwner(lead.website),
                contact_page_detector_service_1.contactPageDetectorService.detectContactPages(lead.website),
            ]);
            const updateData = {
                emails: contactResult.emails,
                phones: contactResult.phones,
                socialLinks: {
                    ...(lead.socialLinks || {}),
                    ...contactResult.socialLinks,
                    ...socialResult,
                },
                contactPages: [...new Set([...contactResult.contactPages, ...contactPageResult.map(p => p.url)])],
                ownerNames: [...new Set([...contactResult.ownerNames, ...ownerResult.ownerNames])],
                extractionStatus: contactResult.extractionStatus,
                extractedAt: new Date(),
            };
            await this.leadService.updateLead(leadId, updateData);
            api_response_1.APIResponse.success(res, {
                leadId,
                contactExtraction: contactResult,
                socialLinks: socialResult,
                ownerInfo: ownerResult,
                contactPages: contactPageResult,
            }, 'Full extraction completed');
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ContactExtractorController = ContactExtractorController;
exports.contactExtractorController = new ContactExtractorController();
//# sourceMappingURL=contact-extractor.controller.js.map