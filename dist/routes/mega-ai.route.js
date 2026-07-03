"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mega_ai_controller_1 = require("../controllers/mega-ai.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const validate_objectid_middleware_1 = require("../middlewares/validate-objectid.middleware");
const router = (0, express_1.Router)();
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
router.post('/analyze/:leadId', auth_middleware_1.authenticate, (0, validate_objectid_middleware_1.validateObjectId)('leadId'), (req, res) => {
    mega_ai_controller_1.megaAIController.analyzeLead(req, res);
});
router.post('/analyze-bulk', auth_middleware_1.authenticate, (req, res) => {
    mega_ai_controller_1.megaAIController.analyzeMultipleLeads(req, res);
});
router.post('/analyze-pending', auth_middleware_1.authenticate, asyncHandler(async (req, res) => {
    await mega_ai_controller_1.megaAIController.analyzePendingLeads(req, res);
}));
router.get('/pipeline-stats', auth_middleware_1.authenticate, asyncHandler(async (req, res) => {
    await mega_ai_controller_1.megaAIController.getPipelineStats(req, res);
}));
router.get('/status/:leadId', auth_middleware_1.authenticate, (0, validate_objectid_middleware_1.validateObjectId)('leadId'), asyncHandler(async (req, res) => {
    await mega_ai_controller_1.megaAIController.getLeadAIStatus(req, res);
}));
router.post('/refresh/:leadId', auth_middleware_1.authenticate, (0, validate_objectid_middleware_1.validateObjectId)('leadId'), asyncHandler(async (req, res) => {
    await mega_ai_controller_1.megaAIController.refreshAnalysis(req, res);
}));
exports.default = router;
//# sourceMappingURL=mega-ai.route.js.map