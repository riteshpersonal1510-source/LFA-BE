"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JustdialParser = void 0;
const logger_1 = require("../../utils/logger");
class JustdialParser {
    parse(_html, _sourceUrl) {
        const leads = [];
        logger_1.logger.info('JustdialParser: Parsing HTML');
        return leads;
    }
    parseBusiness(_card) {
        try {
            const data = {
                id: crypto.randomUUID(),
                companyName: '',
                phone: '',
                email: '',
                address: '',
                category: '',
                rating: 0,
                reviewsCount: 0,
                source: 'justdial',
                sourceUrl: '',
                createdAt: new Date().toISOString(),
            };
            return data;
        }
        catch (error) {
            logger_1.logger.warn('JustdialParser: Failed to parse business:', error);
            return null;
        }
    }
    extractPhones(text) {
        const phoneRegex = /[\+]?[(]?[0-9]{3}[)]?[-\s\.\s]?[0-9]{3}[-\s\.\s]?[0-9]{4,6}/g;
        const matches = text.match(phoneRegex);
        return matches || [];
    }
    extractEmails(text) {
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const matches = text.match(emailRegex);
        return matches || [];
    }
    extractWebsites(text) {
        const websiteRegex = /https?:\/\/[^\s]+/g;
        const matches = text.match(websiteRegex);
        return matches || [];
    }
}
exports.JustdialParser = JustdialParser;
//# sourceMappingURL=parser.js.map