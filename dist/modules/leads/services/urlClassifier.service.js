"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.websiteClassificationService = void 0;
exports.classifyWebsiteUrl = classifyWebsiteUrl;
exports.getNormalizedDomain = getNormalizedDomain;
exports.isRealWebsite = isRealWebsite;
exports.isOnlineProfile = isOnlineProfile;
exports.getWebsiteClassification = getWebsiteClassification;
exports.setLeadClassificationFields = setLeadClassificationFields;
const SOCIAL_DOMAINS = {
    'instagram.com': 'instagram',
    'www.instagram.com': 'instagram',
    'facebook.com': 'facebook',
    'www.facebook.com': 'facebook',
    'fb.com': 'facebook',
    'linkedin.com': 'linkedin',
    'www.linkedin.com': 'linkedin',
    'x.com': 'twitter',
    'twitter.com': 'twitter',
    'www.twitter.com': 'twitter',
    'youtube.com': 'youtube',
    'www.youtube.com': 'youtube',
    'youtu.be': 'youtube',
    'tiktok.com': 'tiktok',
    'www.tiktok.com': 'tiktok',
    'pinterest.com': 'pinterest',
    'www.pinterest.com': 'pinterest',
    'in.pinterest.com': 'pinterest',
    'snapchat.com': 'snapchat',
    'www.snapchat.com': 'snapchat',
    'wa.me': 'whatsapp',
    'www.wa.me': 'whatsapp',
    'whatsapp.com': 'whatsapp',
    'www.whatsapp.com': 'whatsapp',
    't.me': 'telegram',
    'telegram.me': 'telegram',
    'www.telegram.me': 'telegram',
    'linktr.ee': 'linktree',
    'www.linktr.ee': 'linktree',
    'threads.net': 'threads',
    'www.threads.net': 'threads',
};
const BUSINESS_GOOGLE_DOMAINS = [
    'business.google.com',
    'www.business.google.com',
];
const GOOGLE_MAPS_DOMAINS = [
    'maps.google.com',
    'www.maps.google.com',
    'google.com/maps',
    'goo.gl/maps',
    'g.page',
];
const MARKETPLACE_DOMAINS = {
    'justdial.com': 'justdial',
    'www.justdial.com': 'justdial',
    'indiamart.com': 'indiamart',
    'www.indiamart.com': 'indiamart',
    'sulekha.com': 'sulekha',
    'www.sulekha.com': 'sulekha',
    'tradeindia.com': 'tradeindia',
    'www.tradeindia.com': 'tradeindia',
    'yellowpages.com': 'yellowpages',
    'yellowpages.in': 'yellowpages_in',
    'www.yellowpages.com': 'yellowpages',
    'amazon.in': 'amazon_in',
    'www.amazon.in': 'amazon_in',
    'flipkart.com': 'flipkart',
    'www.flipkart.com': 'flipkart',
    'meesho.com': 'meesho',
    'www.meesho.com': 'meesho',
};
const DIRECTORY_DOMAINS = [
    'tripadvisor.com',
    'tripadvisor.in',
    'www.tripadvisor.com',
    'www.tripadvisor.in',
    'yelp.com',
    'yelp.in',
    'www.yelp.com',
    'www.yelp.in',
    'clutch.co',
    'www.clutch.co',
    'glassdoor.com',
    'www.glassdoor.com',
    'ambitionbox.com',
    'www.ambitionbox.com',
];
function parseHostname(url) {
    try {
        const normalized = url.startsWith('http') ? url : `https://${url}`;
        return new URL(normalized).hostname.toLowerCase();
    }
    catch {
        return null;
    }
}
function parseHostnamePlusPath(url) {
    try {
        const normalized = url.startsWith('http') ? url : `https://${url}`;
        const parsed = new URL(normalized);
        return (parsed.hostname + parsed.pathname).toLowerCase().replace(/\/+$/, '');
    }
    catch {
        return null;
    }
}
function normalizeUrl(url) {
    let cleaned = url.trim();
    if (!cleaned.match(/^https?:\/\//i)) {
        cleaned = 'https://' + cleaned;
    }
    try {
        const parsed = new URL(cleaned);
        parsed.hash = '';
        let hostname = parsed.hostname.toLowerCase();
        hostname = hostname.replace(/^www\./, '');
        parsed.hostname = hostname;
        return parsed.toString().replace(/\/+$/, '');
    }
    catch {
        if (cleaned.includes(' ') || cleaned.includes('..')) {
            return '';
        }
        return cleaned;
    }
}
function domainMatch(hostname, domainList) {
    return domainList.some(d => hostname === d ||
        hostname === `www.${d}` ||
        hostname.endsWith(`.${d}`) ||
        hostname.startsWith(d));
}
function isProbablyValidDomain(hostname) {
    if (!hostname.includes('.'))
        return false;
    const parts = hostname.split('.');
    const tld = parts[parts.length - 1];
    if (tld.length < 2)
        return false;
    if (/^\d+$/.test(tld))
        return false;
    return true;
}
function matchSocialDomain(url) {
    const hostname = parseHostname(url);
    if (!hostname)
        return null;
    const cleanHost = hostname.replace(/^www\./, '');
    if (SOCIAL_DOMAINS[cleanHost])
        return SOCIAL_DOMAINS[cleanHost];
    if (SOCIAL_DOMAINS[hostname])
        return SOCIAL_DOMAINS[hostname];
    return null;
}
function matchMarketplaceDomain(url) {
    const hostname = parseHostname(url);
    if (!hostname)
        return null;
    const cleanHost = hostname.replace(/^www\./, '');
    if (MARKETPLACE_DOMAINS[cleanHost])
        return MARKETPLACE_DOMAINS[cleanHost];
    if (MARKETPLACE_DOMAINS[hostname])
        return MARKETPLACE_DOMAINS[hostname];
    return null;
}
function isGoogleProfile(hostname, hostnamePlusPath) {
    if (BUSINESS_GOOGLE_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`) || hostname.startsWith(d))) {
        return true;
    }
    if (hostnamePlusPath) {
        for (const pattern of GOOGLE_MAPS_DOMAINS) {
            if (hostnamePlusPath.startsWith(pattern))
                return true;
        }
    }
    return false;
}
function classifyWebsiteUrl(url) {
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
        return {
            originalUrl: null,
            normalizedUrl: null,
            websiteType: 'NO_WEBSITE',
            websiteStatus: 'NO_REAL_WEBSITE',
            hasRealWebsite: false,
            socialProfiles: {},
            displayLabel: 'No Website',
        };
    }
    const normalized = normalizeUrl(url);
    if (!normalized) {
        return {
            originalUrl: url,
            normalizedUrl: null,
            websiteType: 'INVALID_URL',
            websiteStatus: 'INVALID',
            hasRealWebsite: false,
            socialProfiles: {},
            displayLabel: 'Invalid URL',
        };
    }
    const hostname = parseHostname(normalized);
    if (!hostname) {
        return {
            originalUrl: url,
            normalizedUrl: null,
            websiteType: 'INVALID_URL',
            websiteStatus: 'INVALID',
            hasRealWebsite: false,
            socialProfiles: {},
            displayLabel: 'Invalid URL',
        };
    }
    const cleanHost = hostname.replace(/^www\./, '');
    const hostnamePlusPath = parseHostnamePlusPath(normalized);
    if (!isProbablyValidDomain(hostname)) {
        return {
            originalUrl: url,
            normalizedUrl: null,
            websiteType: 'INVALID_URL',
            websiteStatus: 'INVALID',
            hasRealWebsite: false,
            socialProfiles: {},
            displayLabel: 'Invalid URL',
        };
    }
    const socialPlatform = matchSocialDomain(normalized);
    if (socialPlatform) {
        const profiles = {};
        if (socialPlatform === 'linktree' || socialPlatform === 'threads') {
            profiles.other = [normalized];
        }
        else {
            profiles[socialPlatform] = normalized;
        }
        return {
            originalUrl: url,
            normalizedUrl: normalized,
            websiteType: 'SOCIAL_PROFILE',
            websiteStatus: 'NO_REAL_WEBSITE',
            hasRealWebsite: false,
            socialProfiles: profiles,
            displayLabel: 'Social Profile',
        };
    }
    if (isGoogleProfile(cleanHost, hostnamePlusPath)) {
        return {
            originalUrl: url,
            normalizedUrl: normalized,
            websiteType: 'GOOGLE_PROFILE',
            websiteStatus: 'NO_REAL_WEBSITE',
            hasRealWebsite: false,
            socialProfiles: {},
            displayLabel: 'Google Business Profile',
        };
    }
    const marketplacePlatform = matchMarketplaceDomain(normalized);
    if (marketplacePlatform) {
        return {
            originalUrl: url,
            normalizedUrl: normalized,
            websiteType: 'MARKETPLACE_PROFILE',
            websiteStatus: 'NO_REAL_WEBSITE',
            hasRealWebsite: false,
            socialProfiles: {},
            displayLabel: 'Marketplace Listing',
        };
    }
    if (domainMatch(cleanHost, DIRECTORY_DOMAINS)) {
        return {
            originalUrl: url,
            normalizedUrl: normalized,
            websiteType: 'DIRECTORY_PROFILE',
            websiteStatus: 'NO_REAL_WEBSITE',
            hasRealWebsite: false,
            socialProfiles: {},
            displayLabel: 'Directory Listing',
        };
    }
    return {
        originalUrl: url,
        normalizedUrl: normalized,
        websiteType: 'REAL_WEBSITE',
        websiteStatus: 'ACTIVE',
        hasRealWebsite: true,
        socialProfiles: {},
        displayLabel: 'Website',
    };
}
function getNormalizedDomain(url) {
    if (!url)
        return null;
    try {
        const normalized = url.startsWith('http') ? url : `https://${url}`;
        const hostname = new URL(normalized).hostname.toLowerCase();
        return hostname.replace(/^www\./, '');
    }
    catch {
        return null;
    }
}
function isRealWebsite(url) {
    return classifyWebsiteUrl(url).hasRealWebsite;
}
function isOnlineProfile(url) {
    const result = classifyWebsiteUrl(url);
    return result.websiteType === 'SOCIAL_PROFILE'
        || result.websiteType === 'GOOGLE_PROFILE'
        || result.websiteType === 'MARKETPLACE_PROFILE'
        || result.websiteType === 'DIRECTORY_PROFILE';
}
function getWebsiteClassification(url) {
    const classified = classifyWebsiteUrl(url);
    const websiteClassification = classified.websiteType === 'REAL_WEBSITE' ? 'business_website'
        : classified.websiteType === 'SOCIAL_PROFILE' ? 'social_profile'
            : classified.websiteType === 'GOOGLE_PROFILE' ? 'google_business_profile'
                : classified.websiteType === 'MARKETPLACE_PROFILE' || classified.websiteType === 'DIRECTORY_PROFILE' ? 'directory_listing'
                    : 'no_website';
    const socialPlatforms = Object.keys(classified.socialProfiles);
    const primaryPlatform = socialPlatforms.length > 0 ? socialPlatforms[0] : undefined;
    return {
        websiteType: classified.websiteType,
        hasRealWebsite: classified.hasRealWebsite,
        websiteClassification,
        websiteAuditAllowed: classified.hasRealWebsite,
        socialProfiles: classified.socialProfiles,
        socialPlatforms,
        primaryPlatform,
    };
}
function setLeadClassificationFields(leadDoc, website) {
    const classification = getWebsiteClassification(website);
    const classified = classifyWebsiteUrl(website);
    leadDoc.website = classified.normalizedUrl || (website || null);
    leadDoc.websiteType = classification.websiteType;
    leadDoc.websiteClassification = classification.websiteClassification;
    leadDoc.hasWebsite = classification.hasRealWebsite;
    leadDoc.hasRealWebsite = classification.hasRealWebsite;
    leadDoc.normalizedDomain = getNormalizedDomain(website);
    leadDoc.websiteAuditAllowed = classification.websiteAuditAllowed;
    leadDoc.socialProfiles = classification.socialProfiles;
    leadDoc.socialPlatforms = classification.socialPlatforms;
    if (classification.primaryPlatform) {
        leadDoc.primaryPlatform = classification.primaryPlatform;
    }
}
exports.websiteClassificationService = {
    classifyWebsiteUrl,
    isRealWebsite,
    isOnlineProfile,
    getWebsiteClassification,
    getNormalizedDomain,
    setLeadClassificationFields,
};
//# sourceMappingURL=urlClassifier.service.js.map