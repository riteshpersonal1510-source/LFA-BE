"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadFiltersRoute = void 0;
const express_1 = require("express");
const lead_filters_controller_1 = require("../controllers/lead-filters.controller");
const router = (0, express_1.Router)();
router.get('/states', lead_filters_controller_1.leadFiltersController.getStates.bind(lead_filters_controller_1.leadFiltersController));
router.get('/cities', lead_filters_controller_1.leadFiltersController.getCities.bind(lead_filters_controller_1.leadFiltersController));
router.get('/areas', lead_filters_controller_1.leadFiltersController.getAreas.bind(lead_filters_controller_1.leadFiltersController));
exports.leadFiltersRoute = router;
//# sourceMappingURL=lead-filters.route.js.map