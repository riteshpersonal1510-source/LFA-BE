"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crawlProfile = crawlProfile;
const logger_1 = require("../../../utils/logger");
const indiamart_parser_1 = require("./indiamart.parser");
const PROFILE_TIMEOUT = 25000;
const MAX_RETRIES = 2;
async function crawlProfile(page, profileUrl, companyName) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            logger_1.logger.info({
                url: profileUrl,
                company: companyName,
                attempt: attempt + 1,
            }, 'IndiaMartProfile: Crawling');
            await page.goto(profileUrl, {
                waitUntil: 'domcontentloaded',
                timeout: PROFILE_TIMEOUT,
            });
            await page.waitForTimeout(2000);
            await page.evaluate(() => {
                const scrollable = document.querySelector('.profile-content, .seller-detail, .company-profile, main, [role="main"], body');
                if (scrollable) {
                    scrollable.scrollTop = scrollable.scrollHeight;
                }
                window.scrollBy(0, 500);
            });
            await page.waitForTimeout(1500);
            const html = await page.content();
            const rawLead = (0, indiamart_parser_1.parseProfilePage)(html, profileUrl);
            if (!rawLead.companyName) {
                rawLead.companyName = companyName;
            }
            const enriched = {
                companyName: rawLead.companyName || companyName,
                phone: rawLead.phone,
                secondaryPhone: rawLead.secondaryPhone,
                email: rawLead.email,
                website: rawLead.website,
                address: rawLead.address,
                city: rawLead.city,
                state: rawLead.state,
                pincode: rawLead.pincode,
                gst: rawLead.gst,
                ownerName: rawLead.ownerName,
                category: rawLead.category,
                products: rawLead.products || [],
                services: rawLead.services || [],
                rating: rawLead.rating,
                reviewsCount: rawLead.reviewsCount,
                yearOfEstablishment: rawLead.yearOfEstablishment,
                employeeCount: rawLead.employeeCount,
                profileUrl,
                sourceUrl: profileUrl,
                socialLinks: rawLead.socialLinks || {},
                images: rawLead.images,
                latitude: rawLead.latitude,
                longitude: rawLead.longitude,
            };
            logger_1.logger.info({
                company: enriched.companyName,
                hasPhone: !!enriched.phone,
                hasWebsite: !!enriched.website,
                hasEmail: !!enriched.email,
                hasGst: !!enriched.gst,
                hasAddress: !!enriched.address,
            }, 'IndiaMartProfile: Extracted');
            return enriched;
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            logger_1.logger.warn({
                err: msg,
                url: profileUrl,
                company: companyName,
                attempt: attempt + 1,
            }, 'IndiaMartProfile: Crawl failed');
            if (attempt < MAX_RETRIES) {
                await page.waitForTimeout(2000 * (attempt + 1));
            }
        }
    }
    logger_1.logger.warn({
        url: profileUrl,
        company: companyName,
    }, 'IndiaMartProfile: All retries exhausted');
    return null;
}
//# sourceMappingURL=indiamart.profile.js.map