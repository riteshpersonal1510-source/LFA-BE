import { Lead } from '../models/Lead';
import { classifyWebsiteUrl } from '../modules/leads/services/urlClassifier.service';
import { phoneNormalizer } from './phone-normalizer.service';

export interface GeneratedMessage {
  leadId: string;
  companyName: string;
  phone: string;
  normalizedPhone: string;
  message: string;
  templateType: 'website' | 'no-website';
  hasWebsite: boolean;
  whatsappUrl: string;
  skipReason: string | null;
}

function isRealBusinessWebsite(url: string | null | undefined, _lead?: Record<string, unknown>): boolean {
  return classifyWebsiteUrl(url).hasRealWebsite;
}

function buildWebsiteMessage(_companyName: string): string {
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

function buildNoWebsiteMessage(_companyName: string): string {
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

function buildWhatsAppUrl(phone: string, message: string): string {
  const encoded = encodeURIComponent(message);
  const digits = phone.replace(/\D/g, '');
  return `https://web.whatsapp.com/send?phone=${digits}&text=${encoded}`;
}

export class WhatsAppMessageService {
  async generateMessages(leadIds: string[]): Promise<{
    messages: GeneratedMessage[];
    skipped: Array<{ leadId: string; companyName: string; reason: string }>;
  }> {
    const leads = await Lead.find({ _id: { $in: leadIds } }).lean();

    const messages: GeneratedMessage[] = [];
    const skipped: Array<{ leadId: string; companyName: string; reason: string }> = [];

    for (const lead of leads) {
      const leadId = (lead._id as { toString(): string }).toString();
      const leadRecord = lead as Record<string, unknown>;
      const rawPhone = lead.phone as string | undefined;
      const { normalizedPhone, isValid, reason } = rawPhone
        ? phoneNormalizer.normalize(rawPhone)
        : { normalizedPhone: '', isValid: false, reason: 'No phone number' };

      if (!isValid) {
        const skipReason = `Invalid phone: ${reason} (raw: ${JSON.stringify(rawPhone)})`;
        skipped.push({
          leadId,
          companyName: lead.companyName || 'Unknown',
          reason: skipReason,
        });
        await Lead.findByIdAndUpdate(leadId, {
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

      const hasWebsite = isRealBusinessWebsite(lead.website as string | null | undefined, leadRecord);
      const templateType: 'website' | 'no-website' = hasWebsite ? 'website' : 'no-website';
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

      await Lead.findByIdAndUpdate(leadId, {
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

export const whatsAppMessageService = new WhatsAppMessageService();
