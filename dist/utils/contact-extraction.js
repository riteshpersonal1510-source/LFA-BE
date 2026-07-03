"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractEmails = extractEmails;
exports.extractPhones = extractPhones;
exports.normalizePhone = normalizePhone;
exports.isValidEmail = isValidEmail;
exports.isValidPhone = isValidPhone;
exports.extractEmailsFromLinks = extractEmailsFromLinks;
exports.extractPhoneLinks = extractPhoneLinks;
function extractEmails(text) {
    if (!text)
        return [];
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
    const matches = text.match(emailRegex);
    if (!matches)
        return [];
    return [...new Set(matches.map(email => email.toLowerCase().trim()))];
}
function extractPhones(text) {
    if (!text)
        return [];
    const phones = [];
    const intPhoneRegex = /(\+?[\d\s\-\(\)]{10,20})/g;
    const intMatches = text.match(intPhoneRegex);
    if (intMatches) {
        phones.push(...intMatches);
    }
    const stdPhoneRegex = /(?:\+?[1-9]\d{1,3}[\s.-]?)?(?:\(?[2-9]\d{2}\)?[\s.-]?)?[2-9]\d{2}[\s.-]?\d{4}/g;
    const stdMatches = text.match(stdPhoneRegex);
    if (stdMatches) {
        phones.push(...stdMatches);
    }
    const indiaPhoneRegex = /(\+91[\s-]?\d{10}|\d{10})/g;
    const indiaMatches = text.match(indiaPhoneRegex);
    if (indiaMatches) {
        phones.push(...indiaMatches);
    }
    return [...new Set(phones.map(phone => normalizePhone(phone)))];
}
function normalizePhone(phone) {
    if (!phone)
        return '';
    let normalized = phone
        .replace(/[^\d+]/g, '')
        .replace(/^0/, '')
        .replace(/^(\d{3})(\d{3})(\d{4})$/, '+1-$1-$2-$3');
    if (normalized.startsWith('91') && normalized.length === 12) {
        normalized = '+' + normalized;
    }
    else if (normalized.startsWith('1') && normalized.length === 11) {
        normalized = '+' + normalized;
    }
    return normalized;
}
function isValidEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
}
function isValidPhone(phone) {
    const cleaned = phone.replace(/[^\d]/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
}
function extractEmailsFromLinks(html) {
    if (!html)
        return [];
    const emailLinks = [];
    const mailtoRegex = /href=["']mailto:([^"']+)["']/gi;
    let match;
    while ((match = mailtoRegex.exec(html)) !== null) {
        const email = match[1];
        if (isValidEmail(email)) {
            emailLinks.push(email);
        }
    }
    return [...new Set(emailLinks)];
}
function extractPhoneLinks(html) {
    if (!html)
        return [];
    const phoneLinks = [];
    const telRegex = /href=["']tel:([^"']+)["']/gi;
    let match;
    while ((match = telRegex.exec(html)) !== null) {
        phoneLinks.push(match[1]);
    }
    return phoneLinks;
}
//# sourceMappingURL=contact-extraction.js.map