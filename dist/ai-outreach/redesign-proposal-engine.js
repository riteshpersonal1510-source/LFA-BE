"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redesignProposalEngine = exports.RedesignProposalEngine = void 0;
const proposal_generator_1 = require("./proposal-generator");
class RedesignProposalEngine extends proposal_generator_1.ProposalGenerator {
    generateProposal(lead) {
        return this.generateWebsiteRedesignProposal(lead);
    }
}
exports.RedesignProposalEngine = RedesignProposalEngine;
exports.redesignProposalEngine = new RedesignProposalEngine();
//# sourceMappingURL=redesign-proposal-engine.js.map