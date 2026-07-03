"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seoProposalEngine = exports.SEOProposalEngine = void 0;
const proposal_generator_1 = require("./proposal-generator");
class SEOProposalEngine extends proposal_generator_1.ProposalGenerator {
    generateProposal(lead) {
        return this.generateSEOProposal(lead);
    }
}
exports.SEOProposalEngine = SEOProposalEngine;
exports.seoProposalEngine = new SEOProposalEngine();
//# sourceMappingURL=seo-proposal-engine.js.map