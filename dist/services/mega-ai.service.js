"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.megaAIService = exports.MegaAIService = void 0;
const mega_ai_orchestrator_1 = require("../mega-ai-engine/mega-ai-orchestrator");
class MegaAIService {
    async analyzeLead(leadId) {
        const result = await mega_ai_orchestrator_1.megaAIOrchestrator.runFullPipeline(leadId);
        return result;
    }
    async analyzeMultipleLeads(leadIds) {
        return mega_ai_orchestrator_1.megaAIOrchestrator.runFullPipelineForMultiple(leadIds);
    }
    async analyzePendingLeads(limit = 10) {
        return mega_ai_orchestrator_1.megaAIOrchestrator.runFullPipelineForPendingLeads(limit);
    }
    async getPipelineStats() {
        return mega_ai_orchestrator_1.megaAIOrchestrator.getPipelineStats();
    }
}
exports.MegaAIService = MegaAIService;
exports.megaAIService = new MegaAIService();
//# sourceMappingURL=mega-ai.service.js.map