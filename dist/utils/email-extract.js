"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractEmailsFromHtml = extractEmailsFromHtml;
exports.extractEmailsFromText = extractEmailsFromText;
exports.isBusinessEmail = isBusinessEmail;
exports.isSocialEmail = isSocialEmail;
exports.getEmailType = getEmailType;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const COMMON_EMAIL_PREFIXES = [
    'info', 'contact', 'support', 'sales', 'hello', 'care', 'enquiry',
    'inquiry', 'help', 'admin', 'office', 'business', 'connect',
    'reach', 'team', 'mail', 'feedback', 'service', 'career',
    'hr', 'jobs', 'partner', 'marketing',
];
const SOCIAL_EMAIL_DOMAINS = [
    'gmail.com', 'yahoo.com', 'yahoo.co.in', 'outlook.com', 'hotmail.com',
    'rediffmail.com', 'rediff.com', 'live.com', 'ymail.com', 'inbox.com',
    'protonmail.com', 'proton.me', 'zoho.com', 'fastmail.com',
    'aol.com', 'mail.com', 'icloud.com',
];
function extractEmailsFromHtml(html, source = 'website') {
    const matches = html.match(EMAIL_REGEX) || [];
    const seen = new Set();
    const results = [];
    for (const email of matches) {
        const lower = email.toLowerCase();
        if (seen.has(lower))
            continue;
        seen.add(lower);
        if (isCommonEmail(lower))
            continue;
        const confidence = determineEmailConfidence(lower, source, html);
        const context = extractContext(html, email);
        results.push({ email, source, confidence, context });
    }
    return results;
}
function extractEmailsFromText(text, source = 'unknown') {
    const matches = text.match(EMAIL_REGEX) || [];
    const seen = new Set();
    const results = [];
    for (const email of matches) {
        const lower = email.toLowerCase();
        if (seen.has(lower))
            continue;
        seen.add(lower);
        if (isCommonEmail(lower))
            continue;
        const confidence = determineEmailConfidence(lower, source, text);
        results.push({ email, source, confidence });
    }
    return results;
}
function isCommonEmail(email) {
    const [local, domain] = email.split('@');
    if (!domain)
        return false;
    if (SOCIAL_EMAIL_DOMAINS.includes(domain))
        return false;
    const knownRoles = [
        'abuse', 'noreply', 'no-reply', 'donotreply', 'do-not-reply',
        'spam', 'postmaster', 'hostmaster', 'webmaster',
    ];
    return knownRoles.includes(local.toLowerCase());
}
function determineEmailConfidence(email, source, _content) {
    const [local, domain] = email.split('@');
    if (!domain)
        return 'low';
    const isBusinessDomain = !SOCIAL_EMAIL_DOMAINS.includes(domain);
    const isProfessionalPrefix = COMMON_EMAIL_PREFIXES.includes(local.toLowerCase());
    const isNameEmail = /^[a-z]+\.[a-z]+$/.test(local) || /^[a-z]+$/.test(local);
    if (isBusinessDomain && source !== 'unknown')
        return 'high';
    if (isBusinessDomain && isProfessionalPrefix)
        return 'high';
    if (isBusinessDomain && isNameEmail)
        return 'medium';
    if (isBusinessDomain)
        return 'medium';
    if (isNameEmail || isProfessionalPrefix)
        return 'medium';
    return 'low';
}
function extractContext(html, email) {
    const idx = html.indexOf(email);
    if (idx === -1)
        return undefined;
    const start = Math.max(0, idx - 80);
    const end = Math.min(html.length, idx + email.length + 80);
    const snippet = html.slice(start, end)
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return snippet;
}
function isBusinessEmail(email) {
    const domain = email.split('@')[1];
    if (!domain)
        return false;
    return !SOCIAL_EMAIL_DOMAINS.includes(domain);
}
function isSocialEmail(email) {
    const domain = email.split('@')[1];
    if (!domain)
        return false;
    return SOCIAL_EMAIL_DOMAINS.includes(domain);
}
function getEmailType(email) {
    if (isBusinessEmail(email))
        return 'business';
    if (isSocialEmail(email))
        return 'social';
    return 'unknown';
}
//# sourceMappingURL=email-extract.js.map