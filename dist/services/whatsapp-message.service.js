"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsAppMessageService = exports.WhatsAppMessageService = void 0;
const Lead_1 = require("../models/Lead");
const urlClassifier_service_1 = require("../modules/leads/services/urlClassifier.service");
const phone_normalizer_service_1 = require("./phone-normalizer.service");
function isRealBusinessWebsite(url, _lead) {
    return (0, urlClassifier_service_1.classifyWebsiteUrl)(url).hasRealWebsite;
}
function buildWebsiteMessage(_companyName) {
    return `Hi,

I am Ritesh Gajjar from Opti Matrix Solutions.

We provide a wide range of digital services, including:

• Website Development
• Custom Web Application Development
• Mobile Application Development (Android & iOS)
• eCommerce Solutions & Online Stores
• Responsive Web Design & UI/UX Design
• CMS & Open-Source Development
• Search Engine Optimization (SEO)
• Digital Marketing & Social Media Marketing (SMM)
• Website Maintenance & Technical Support

We noticed that your website has opportunities for improvement in performance, user experience, and online visibility.

Could you please let us know a convenient time for a quick discussion?

Best Regards,
Ritesh Gajjar
Opti Matrix Solutions`;
}
function buildNoWebsiteMessage(_companyName) {
    return `Hi,

I am Ritesh Gajjar from Opti Matrix Solutions.

We provide a wide range of digital services including:

• Website Development
• Mobile App Development
• eCommerce Solutions
• SEO & Digital Marketing
• UI/UX Design
• Website Maintenance

We noticed that your business currently does not have a professional website.

A dedicated website can help improve visibility, credibility, and customer reach.

Could you please let us know a convenient time for a quick discussion?

Best Regards,
Ritesh Gajjar
Opti Matrix Solutions`;
}
function buildWhatsAppUrl(phone, message) {
    const encoded = encodeURIComponent(message);
    const digits = phone.replace(/\D/g, '');
    return `https://web.whatsapp.com/send?phone=${digits}&text=${encoded}`;
}
class WhatsAppMessageService {
    async generateMessages(leadIds) {
        const leads = await Lead_1.Lead.find({ _id: { $in: leadIds } }).lean();
        const messages = [];
        const skipped = [];
        for (const lead of leads) {
            const leadId = lead._id.toString();
            const leadRecord = lead;
            const rawPhone = lead.phone;
            const { normalizedPhone, isValid, reason } = rawPhone
                ? phone_normalizer_service_1.phoneNormalizer.normalize(rawPhone)
                : { normalizedPhone: '', isValid: false, reason: 'No phone number' };
            if (!isValid) {
                const skipReason = `Invalid phone: ${reason} (raw: ${JSON.stringify(rawPhone)})`;
                skipped.push({
                    leadId,
                    companyName: lead.companyName || 'Unknown',
                    reason: skipReason,
                });
                await Lead_1.Lead.findByIdAndUpdate(leadId, {
                    $set: {
                        'whatsappOutreach.status': 'skipped',
                        'whatsappOutreach.lastError': skipReason,
                        'whatsappOutreach.validationReason': reason,
                        'normalizedPhone': normalizedPhone,
                        'isWhatsAppValid': false,
                    },
                }).catch(() => { });
                continue;
            }
            const hasWebsite = isRealBusinessWebsite(lead.website, leadRecord);
            const templateType = hasWebsite ? 'website' : 'no-website';
            const message = hasWebsite ? buildWebsiteMessage(lead.companyName || '') : buildNoWebsiteMessage(lead.companyName || '');
            const whatsappUrl = buildWhatsAppUrl(normalizedPhone, message);
            messages.push({
                leadId,
                companyName: lead.companyName || 'Unknown',
                phone: rawPhone || '',
                normalizedPhone,
                message,
                templateType,
                hasWebsite,
                whatsappUrl,
                skipReason: null,
            });
            await Lead_1.Lead.findByIdAndUpdate(leadId, {
                $set: {
                    'whatsappOutreach.status': 'prepared',
                    'whatsappOutreach.templateType': templateType,
                    'whatsappOutreach.lastOpenedAt': new Date().toISOString(),
                    'whatsappOutreach.lastError': null,
                    'normalizedPhone': normalizedPhone,
                    'isWhatsAppValid': true,
                    'validationReason': null,
                    'campaignStatus': 'pending',
                    'lastSent': null,
                    'attempts': 0,
                },
            }).catch(() => { });
        }
        return { messages, skipped };
    }
}
exports.WhatsAppMessageService = WhatsAppMessageService;
exports.whatsAppMessageService = new WhatsAppMessageService();
//# sourceMappingURL=whatsapp-message.service.js.map