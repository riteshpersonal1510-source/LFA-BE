"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.freshnessDetector = exports.FreshnessDetector = void 0;
const cheerio = __importStar(require("cheerio"));
const logger_1 = require("../utils/logger");
class FreshnessDetector {
    async detectFreshness(html, copyrightYear) {
        try {
            const currentYear = new Date().getFullYear();
            const $ = cheerio.load(html);
            const yearsBehind = copyrightYear ? currentYear - copyrightYear : 0;
            const staleCopyright = copyrightYear !== null && yearsBehind > 1;
            const designGeneration = this.detectDesignGeneration($, copyrightYear);
            const modernStandards = this.checkModernStandards($);
            let status;
            if (yearsBehind === 0 && modernStandards) {
                status = 'fresh';
            }
            else if (yearsBehind <= 1 && modernStandards) {
                status = 'moderate';
            }
            else if (yearsBehind <= 3 || !modernStandards) {
                status = 'outdated';
            }
            else {
                status = 'very-outdated';
            }
            const freshness = {
                status,
                copyrightYear,
                yearsBehind,
                staleCopyright,
                designGeneration,
                modernStandards,
            };
            logger_1.logger.info(`Freshness: status=${status}, years=${yearsBehind}, modern=${modernStandards}`);
            return freshness;
        }
        catch (error) {
            logger_1.logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to detect freshness:');
            return this.getDefaultFreshness();
        }
    }
    detectDesignGeneration($, copyrightYear) {
        const currentYear = new Date().getFullYear();
        if (copyrightYear && copyrightYear >= currentYear - 1) {
            return 'modern';
        }
        if (copyrightYear && copyrightYear >= 2020) {
            return '2020s-style';
        }
        if (copyrightYear && copyrightYear >= 2015) {
            return '2015-2019-style';
        }
        if (copyrightYear && copyrightYear >= 2010) {
            return '2010-2014-style';
        }
        const hasFlexbox = $('[style*="display: flex"], [style*="display:flex"]').length > 0;
        const hasGrid = $('[style*="display: grid"], [style*="display:grid"]').length > 0;
        const hasTables = $('table[width], table[border]').length > 0;
        if (hasFlexbox || hasGrid) {
            return 'modern-layout';
        }
        if (hasTables) {
            return 'legacy-table-layout';
        }
        return 'unknown-generation';
    }
    checkModernStandards($) {
        let score = 0;
        const hasViewportMeta = $('meta[name="viewport"]').length > 0;
        if (hasViewportMeta)
            score++;
        const hasHTML5Doctype = $('html').attr('lang') !== undefined;
        if (hasHTML5Doctype)
            score++;
        const hasSemanticElements = $('header, nav, main, section, article, aside, footer').length > 0;
        if (hasSemanticElements)
            score++;
        const hasModernCSS = this.detectModernCSS($);
        if (hasModernCSS)
            score++;
        const hasResponsiveFramework = this.detectResponsiveFramework($);
        if (hasResponsiveFramework)
            score++;
        return score >= 3;
    }
    detectModernCSS($) {
        const inlineStyles = $('style').html() || '';
        const modernPatterns = [
            'flexbox',
            'grid',
            'var(--',
            '@media',
            'transform',
            'transition',
        ];
        for (const pattern of modernPatterns) {
            if (inlineStyles.includes(pattern)) {
                return true;
            }
        }
        return false;
    }
    detectResponsiveFramework($) {
        const frameworks = [
            'bootstrap',
            'tailwind',
            'foundation',
            'bulma',
            'materialize',
        ];
        const classes = $('[class]').map((_, el) => $(el).attr('class') || '').get();
        const allClasses = classes.join(' ').toLowerCase();
        for (const framework of frameworks) {
            if (allClasses.includes(framework)) {
                return true;
            }
        }
        const links = $('link[rel="stylesheet"]');
        for (let i = 0; i < links.length; i++) {
            const href = $(links[i]).attr('href') || '';
            for (const framework of frameworks) {
                if (href.toLowerCase().includes(framework)) {
                    return true;
                }
            }
        }
        return false;
    }
    getDefaultFreshness() {
        return {
            status: 'outdated',
            copyrightYear: null,
            yearsBehind: 0,
            staleCopyright: false,
            designGeneration: 'unknown',
            modernStandards: false,
        };
    }
}
exports.FreshnessDetector = FreshnessDetector;
exports.freshnessDetector = new FreshnessDetector();
//# sourceMappingURL=freshness-detector.js.map