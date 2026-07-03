"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.phoneExtractionService = exports.PhoneExtractionService = void 0;
const PHONE_PATTERNS = [
    /(?:\+?91[\s.-]?)?[6-9]\d{9}/g,
    /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
    /(?:\+?44[\s.-]?)?\d{4}[\s.-]?\d{3}[\s.-]?\d{4}/g,
    /(?:\+?61[\s.-]?)?\d{4}[\s.-]?\d{3}[\s.-]?\d{3}/g,
    /(?:\+?971[\s.-]?)?\d{1,3}[\s.-]?\d{3,4}[\s.-]?\d{4}/g,
    /(?:\+?65[\s.-]?)?\d{4}[\s.-]?\d{4}/g,
    /(?:\+?971[\s.-]?)?\d{1,2}[\s.-]?\d{3}[\s.-]?\d{4}/g,
];
const WA_LINK_PATTERNS = [
    /wa\.me\/(\d+)/,
    /wa.me\/(\d+)/,
    /api\.whatsapp\.com\/send\?phone=(\d+)/,
    /whatsapp\.com\/send\?phone=(\d+)/,
    /whatsapp\.com\/wa\/\?phone=(\d+)/,
];
class PhoneExtractionService {
    normalizePhone(raw) {
        let cleaned = raw.replace(/[\s\-\(\)\.]/g, '');
        cleaned = cleaned.replace(/^\+/, '');
        const digits = cleaned.replace(/\D/g, '');
        if (digits.length === 10 && /^[6-9]/.test(digits))
            return `+91${digits}`;
        if (digits.length === 11 && digits.startsWith('0'))
            return `+91${digits.slice(1)}`;
        if (digits.length === 12 && digits.startsWith('91'))
            return `+${digits}`;
        if (digits.length === 13 && cleaned.startsWith('91'))
            return `+${digits}`;
        if (digits.length >= 10 && digits.length <= 15)
            return `+${digits}`;
        return raw.trim();
    }
    isValidPhone(phone) {
        const digits = phone.replace(/\D/g, '');
        return digits.length >= 10 && digits.length <= 15;
    }
    extractPhones(text) {
        const found = new Set();
        for (const pattern of PHONE_PATTERNS) {
            const matches = text.match(pattern);
            if (matches) {
                for (const m of matches) {
                    const normalized = this.normalizePhone(m);
                    if (this.isValidPhone(normalized)) {
                        found.add(normalized);
                    }
                }
            }
        }
        return Array.from(found);
    }
    extractWhatsAppLinks(html, links) {
        for (const pattern of WA_LINK_PATTERNS) {
            const m = html.match(pattern);
            if (m) {
                const number = m[1].replace(/\D/g, '');
                if (number.length >= 10)
                    return `+${number}`;
            }
        }
        for (const link of links) {
            const lower = link.toLowerCase();
            if (lower.includes('whatsapp') || lower.includes('wa.me')) {
                for (const pattern of WA_LINK_PATTERNS) {
                    const m = link.match(pattern);
                    if (m) {
                        const number = m[1].replace(/\D/g, '');
                        if (number.length >= 10)
                            return `+${number}`;
                    }
                }
            }
        }
        return '';
    }
    selectPrimaryPhone(phones) {
        if (phones.length === 0)
            return '';
        const byLength = [...phones].sort((a, b) => {
            const aLocal = a.replace(/^\+\d{1,3}/, '');
            const bLocal = b.replace(/^\+\d{1,3}/, '');
            const aIndian = a.startsWith('+91') ? 0 : 1;
            const bIndian = b.startsWith('+91') ? 0 : 1;
            if (aIndian !== bIndian)
                return aIndian - bIndian;
            const aDigits = aLocal.replace(/\D/g, '').length;
            const bDigits = bLocal.replace(/\D/g, '').length;
            return bDigits - aDigits;
        });
        return byLength[0];
    }
    extractFromCrawledPages(pages) {
        const allPhones = new Set();
        let whatsappNumber = '';
        for (const page of pages) {
            const phones = this.extractPhones(page.content);
            for (const p of phones)
                allPhones.add(p);
            if (!whatsappNumber) {
                whatsappNumber = this.extractWhatsAppLinks(page.html, page.links);
            }
        }
        const phones = Array.from(allPhones);
        const primaryPhone = this.selectPrimaryPhone(phones);
        return { phones, primaryPhone, whatsappNumber };
    }
}
exports.PhoneExtractionService = PhoneExtractionService;
exports.phoneExtractionService = new PhoneExtractionService();
//# sourceMappingURL=phone-extraction.service.js.map