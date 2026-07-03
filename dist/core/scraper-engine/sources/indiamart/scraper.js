"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndiaMartScraper = void 0;
const logger_1 = require("../../../../utils/logger");
const indiamart_scraper_1 = require("../../../../modules/scrapers/indiamart/indiamart.scraper");
const scraper = new indiamart_scraper_1.IndiaMartScraper();
class IndiaMartScraper {
    async scrape(options) {
        logger_1.logger.info({ keyword: options.keyword, state: options.state, city: options.city, area: options.area }, 'IndiaMartScraper (ScraperEngine): Delegating to new module');
        return scraper.scrape(options);
    }
}
exports.IndiaMartScraper = IndiaMartScraper;
//# sourceMappingURL=scraper.js.map