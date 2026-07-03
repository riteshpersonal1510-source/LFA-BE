"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contactDiscoveryService = exports.ContactDiscoveryService = void 0;
const SOCIAL_PATTERNS = [
    { key: 'facebook', patterns: ['facebook.com/', 'fb.com/', 'fb.me/'] },
    { key: 'instagram', patterns: ['instagram.com/', 'instagr.am/'] },
    { key: 'linkedin', patterns: ['linkedin.com/company/', 'linkedin.com/in/', 'linkedin.com/showcase/'] },
    { key: 'youtube', patterns: ['youtube.com/@', 'youtube.com/channel/', 'youtube.com/user/', 'youtu.be/'] },
    { key: 'twitter', patterns: ['twitter.com/', 'x.com/'] },
    { key: 'pinterest', patterns: ['pinterest.com/', 'pin.it/'] },
    { key: 'threads', patterns: ['threads.net/@'] },
];
const CONTACT_PAGE_KEYWORDS = [
    '/contact', '/contact-us', '/contactus', '/get-in-touch',
    '/support', '/help', '/reach-us', '/reachus',
    '/connect', '/connect-with-us', '/locations', '/branches',
    '/enquiry', '/inquire', '/feedback',
];
const CONTACT_FORM_INDICATORS = [
    /<form[^>]*action=["'][^"']*contact/i,
    /<form[^>]*action=["'][^"']*submit/i,
    /<form[^>]*action=["'][^"']*enquiry/i,
    /<form[^>]*action=["'][^"']*inquiry/i,
    /<form[^>]*action=["'][^"']*send/i,
    /<input[^>]*type=["']email["']/i,
    /<textarea[^>]*name=["']message["']/i,
    /<input[^>]*name=["']contact["']/i,
    /<input[^>]*name=["']phone["']/i,
    /<button[^>]*type=["']submit["'][^>]*>/i,
];
class ContactDiscoveryService {
    discoverFromPages(pages) {
        const socialLinks = {
            facebook: '', instagram: '', linkedin: '', youtube: '',
            twitter: '', pinterest: '', threads: '', other: [],
        };
        let contactPageUrl = '';
        let hasContactForm = false;
        let contactFormAction = '';
        const allLinks = pages.flatMap(p => p.links);
        const allHtml = pages.map(p => p.html).join('\n');
        const visited = new Set();
        for (const link of allLinks) {
            const lower = link.toLowerCase();
            if (visited.has(link))
                continue;
            visited.add(link);
            if (!contactPageUrl) {
                for (const kw of CONTACT_PAGE_KEYWORDS) {
                    if (lower.includes(kw)) {
                        contactPageUrl = link;
                        break;
                    }
                }
            }
            for (const social of SOCIAL_PATTERNS) {
                if (socialLinks[social.key])
                    continue;
                for (const pattern of social.patterns) {
                    if (lower.includes(pattern)) {
                        socialLinks[social.key] = link;
                        break;
                    }
                }
            }
        }
        if (!contactPageUrl) {
            for (const page of pages) {
                const lowerUrl = page.url.toLowerCase();
                for (const kw of CONTACT_PAGE_KEYWORDS) {
                    if (lowerUrl.includes(kw)) {
                        contactPageUrl = page.url;
                        break;
                    }
                }
                if (contactPageUrl)
                    break;
            }
        }
        for (const indicator of CONTACT_FORM_INDICATORS) {
            const m = allHtml.match(indicator);
            if (m) {
                hasContactForm = true;
                const actionMatch = allHtml.match(/<form[^>]*action=["']([^"']*)["']/i);
                if (actionMatch)
                    contactFormAction = actionMatch[1];
                break;
            }
        }
        return { socialLinks, contactPageUrl, hasContactForm, contactFormAction };
    }
}
exports.ContactDiscoveryService = ContactDiscoveryService;
exports.contactDiscoveryService = new ContactDiscoveryService();
//# sourceMappingURL=contact-discovery.service.js.map