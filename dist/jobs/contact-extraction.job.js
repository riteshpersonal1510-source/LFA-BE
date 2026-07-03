"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contactExtractionJob = exports.ContactExtractionJob = void 0;
const logger_1 = require("../utils/logger");
const contact_extractor_service_1 = require("../services/contact-extractor.service");
const Lead_1 = require("../models/Lead");
const Automation_1 = require("../models/Automation");
class ContactExtractionJob {
    async execute(options) {
        const { automationId, leadIds } = options;
        logger_1.logger.info(`ContactExtractionJob: Starting extraction for ${leadIds.length} leads`);
        const jobExecution = await this.createJobExecution(automationId, 'contact-extraction', {
            leadIdsCount: leadIds.length,
        });
        let extractedCount = 0;
        let failedCount = 0;
        const errors = [];
        for (const leadId of leadIds) {
            try {
                const lead = await Lead_1.Lead.findById(leadId);
                if (!lead || !lead.website) {
                    failedCount++;
                    errors.push(`Lead ${leadId}: No website`);
                    continue;
                }
                const extractionResult = await contact_extractor_service_1.contactExtractorService.extractContacts(lead.website);
                await Lead_1.Lead.findByIdAndUpdate(leadId, {
                    emails: extractionResult.emails,
                    phones: extractionResult.phones,
                    socialLinks: {
                        facebook: extractionResult.socialLinks.facebook,
                        instagram: extractionResult.socialLinks.instagram,
                        linkedin: extractionResult.socialLinks.linkedin,
                        twitter: extractionResult.socialLinks.twitter,
                        youtube: extractionResult.socialLinks.youtube,
                    },
                    contactPages: extractionResult.contactPages,
                    ownerNames: extractionResult.ownerNames,
                    extractionStatus: extractionResult.extractionStatus,
                    extractedAt: new Date(),
                });
                extractedCount++;
                jobExecution.logs.push(`Extracted ${lead.companyName}: ${extractionResult.emails.length} emails, ${extractionResult.phones.length} phones`);
                await jobExecution.save();
            }
            catch (error) {
                logger_1.logger.warn(`ContactExtractionJob: Failed for lead ${leadId}:`, error.message);
                failedCount++;
                errors.push(error.message);
            }
        }
        await this.updateJobExecution(jobExecution.id, {
            status: 'completed',
            totalLeadsGenerated: extractedCount,
            completedAt: new Date(),
        });
        logger_1.logger.info(`ContactExtractionJob: Completed - ${extractedCount} extracted, ${failedCount} failed`);
        return {
            success: extractedCount > 0,
            extractedCount,
            failedCount,
            errors,
        };
    }
    async createJobExecution(automationId, jobType, metadata) {
        const jobExecution = new Automation_1.JobExecution({
            automationId,
            jobType,
            status: 'running',
            startedAt: new Date(),
            metadata,
            logs: [],
        });
        return await jobExecution.save();
    }
    async updateJobExecution(jobExecutionId, updates) {
        await Automation_1.JobExecution.findByIdAndUpdate(jobExecutionId, updates);
    }
}
exports.ContactExtractionJob = ContactExtractionJob;
exports.contactExtractionJob = new ContactExtractionJob();
//# sourceMappingURL=contact-extraction.job.js.map