"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.justdialMapper = void 0;
const logger_1 = require("../../utils/logger");
exports.justdialMapper = {
    async extractBusinessData(page, businessElement) {
        try {
            await businessElement.click();
            await page.waitForTimeout(1000);
            const data = {
                id: crypto.randomUUID(),
                companyName: '',
                phone: '',
                website: '',
                email: '',
                address: '',
                category: '',
                rating: 0,
                reviewsCount: 0,
                sourceUrl: '',
                createdAt: new Date().toISOString(),
            };
            const companyName = await page.$eval('h2.cns_business_name', (el) => el.innerText);
            if (companyName)
                data.companyName = companyName;
            const category = await page.$eval('.cns_jc_cat', (el) => el.innerText);
            if (category)
                data.category = category;
            const phone = await page.$eval('.contact-info', (el) => el.innerText);
            if (phone)
                data.phone = phone.replace(/[^\d+]/g, '');
            const address = await page.$eval('.cns_address', (el) => el.innerText);
            if (address)
                data.address = address;
            const website = await page.$eval('.web-domain', (el) => el.innerText);
            if (website)
                data.website = website;
            const ratingText = await page.$eval('.green-box', (el) => el.innerText);
            if (ratingText) {
                const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
                if (ratingMatch)
                    data.rating = parseFloat(ratingMatch[1]);
            }
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);
            return data;
        }
        catch (error) {
            logger_1.logger.warn('JustdialMapper: Failed to extract business data:', error);
            return null;
        }
    },
};
//# sourceMappingURL=mapper.js.map