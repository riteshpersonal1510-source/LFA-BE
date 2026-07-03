"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const source_controller_1 = require("../controllers/source.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.post('/search', auth_middleware_1.authenticate, source_controller_1.sourceController.searchBySources);
router.get('/', auth_middleware_1.authenticate, source_controller_1.sourceController.getSources);
router.get('/status', auth_middleware_1.authenticate, source_controller_1.sourceController.getSourceStatus);
router.patch('/enable/:sourceName', auth_middleware_1.authenticate, source_controller_1.sourceController.enableSource);
router.patch('/disable/:sourceName', auth_middleware_1.authenticate, source_controller_1.sourceController.disableSource);
exports.default = router;
//# sourceMappingURL=source.route.js.map