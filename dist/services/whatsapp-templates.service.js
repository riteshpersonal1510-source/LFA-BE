"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsAppTemplatesService = exports.WhatsAppTemplatesService = void 0;
const WhatsAppTemplate_1 = require("../models/WhatsAppTemplate");
const logger_1 = require("../utils/logger");
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
async function invalidateAiTemplateCache() {
    try {
        const response = await fetch(`${AI_SERVICE_URL}/api/v1/whatsapp/templates/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(5000),
        });
        if (response.ok) {
            logger_1.logger.info('[WhatsAppTemplates] AI service template cache invalidated');
        }
        else {
            logger_1.logger.warn({ status: response.status }, '[WhatsAppTemplates] AI service cache invalidation failed');
        }
    }
    catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        logger_1.logger.warn({ err: errMsg }, '[WhatsAppTemplates] AI service cache invalidation error (non-blocking)');
    }
}
const DEFAULT_WEBSITE_TEMPLATE = `Hi {{businessName}},

I came across your website {{website}} and was impressed by your online presence. I specialize in helping businesses like yours grow with modern web solutions and digital marketing strategies.

Would you be open to a quick chat about how we can take your online presence to the next level?

Looking forward to hearing from you!

Best regards,
{{senderName}}
{{senderPhone}}`;
const DEFAULT_NO_WEBSITE_TEMPLATE = `Hi {{businessName}},

I noticed your business on {{category}} and wanted to reach out. I specialize in website development and digital marketing, helping businesses like yours establish a strong online presence.

A professional website can help you attract more customers and grow your business. Would you be interested in discussing how we can create a website for your business?

Looking forward to hearing from you!

Best regards,
{{senderName}}
{{senderPhone}}`;
class WhatsAppTemplatesService {
    constructor() {
        this.templateCache = new Map();
    }
    getDefaultWebsiteMessage() {
        return DEFAULT_WEBSITE_TEMPLATE;
    }
    getDefaultNoWebsiteMessage() {
        return DEFAULT_NO_WEBSITE_TEMPLATE;
    }
    async getTemplates() {
        let websiteTemplate = await WhatsAppTemplate_1.WhatsAppTemplate.findOne({ type: 'website' }).lean();
        let noWebsiteTemplate = await WhatsAppTemplate_1.WhatsAppTemplate.findOne({ type: 'no_website' }).lean();
        if (!websiteTemplate) {
            await WhatsAppTemplate_1.WhatsAppTemplate.findOneAndUpdate({ type: 'website' }, { message: this.getDefaultWebsiteMessage(), name: 'Website Template' }, { upsert: true });
            websiteTemplate = await WhatsAppTemplate_1.WhatsAppTemplate.findOne({ type: 'website' }).lean();
        }
        if (!noWebsiteTemplate) {
            await WhatsAppTemplate_1.WhatsAppTemplate.findOneAndUpdate({ type: 'no_website' }, { message: this.getDefaultNoWebsiteMessage(), name: 'No Website Template' }, { upsert: true });
            noWebsiteTemplate = await WhatsAppTemplate_1.WhatsAppTemplate.findOne({ type: 'no_website' }).lean();
        }
        return {
            website: { name: websiteTemplate?.name ?? 'Website Template', message: websiteTemplate?.message ?? this.getDefaultWebsiteMessage() },
            no_website: { name: noWebsiteTemplate?.name ?? 'No Website Template', message: noWebsiteTemplate?.message ?? this.getDefaultNoWebsiteMessage() },
        };
    }
    async getTemplatesForCampaign(campaignId) {
        const cached = this.templateCache.get(campaignId);
        if (cached) {
            return cached;
        }
        const templates = await this.getTemplates();
        const entry = {
            website: templates.website.message,
            no_website: templates.no_website.message,
        };
        this.templateCache.set(campaignId, entry);
        return entry;
    }
    refreshCache(campaignId) {
        if (campaignId) {
            this.templateCache.delete(campaignId);
        }
        else {
            this.templateCache.clear();
        }
    }
    async updateTemplate(type, message, name) {
        const templateName = name || (type === 'website' ? 'Website Template' : 'No Website Template');
        await WhatsAppTemplate_1.WhatsAppTemplate.findOneAndUpdate({ type }, { message, name: templateName }, { upsert: true });
        this.refreshCache();
        await invalidateAiTemplateCache();
    }
    async resetToDefaults() {
        await WhatsAppTemplate_1.WhatsAppTemplate.findOneAndUpdate({ type: 'website' }, { message: this.getDefaultWebsiteMessage(), name: 'Website Template' }, { upsert: true });
        await WhatsAppTemplate_1.WhatsAppTemplate.findOneAndUpdate({ type: 'no_website' }, { message: this.getDefaultNoWebsiteMessage(), name: 'No Website Template' }, { upsert: true });
        this.refreshCache();
        await invalidateAiTemplateCache();
    }
    sanitizeMessage(message) {
        return message.trim();
    }
    getCharCount(message) {
        return message.length;
    }
    isOverLimit(message, limit = 4000) {
        return message.length > limit;
    }
    replacePlaceholders(message, lead, senderInfo) {
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
        const timeStr = now.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
        });
        const replacements = {
            '{{businessName}}': lead.businessName || lead.companyName || '',
            '{{ownerName}}': lead.ownerName || '',
            '{{city}}': lead.city || '',
            '{{area}}': lead.area || '',
            '{{state}}': lead.state || '',
            '{{website}}': lead.website || '',
            '{{phone}}': lead.phone || '',
            '{{category}}': lead.category || '',
            '{{rating}}': lead.rating !== undefined && lead.rating !== null ? String(lead.rating) : '',
            '{{leadScore}}': lead.leadScore !== undefined && lead.leadScore !== null ? String(lead.leadScore) : '',
            '{{companyName}}': lead.companyName || lead.businessName || '',
            '{{senderName}}': senderInfo?.name || '',
            '{{senderPhone}}': senderInfo?.phone || '',
            '{{senderEmail}}': senderInfo?.email || '',
            '{{senderWebsite}}': senderInfo?.website || '',
            '{{currentDate}}': dateStr,
            '{{currentTime}}': timeStr,
        };
        let result = message;
        for (const [placeholder, value] of Object.entries(replacements)) {
            result = result.split(placeholder).join(value);
        }
        return result;
    }
    getSampleLeadData() {
        return {
            businessName: 'ABC Gym',
            ownerName: 'Rahul Sharma',
            city: 'Ahmedabad',
            area: 'SG Highway',
            state: 'Gujarat',
            website: 'https://abcgym.com',
            phone: '+91 98765 43210',
            category: 'Fitness Center',
            rating: 4.5,
            leadScore: 92,
            companyName: 'ABC Gym',
        };
    }
}
exports.WhatsAppTemplatesService = WhatsAppTemplatesService;
exports.whatsAppTemplatesService = new WhatsAppTemplatesService();
//# sourceMappingURL=whatsapp-templates.service.js.map