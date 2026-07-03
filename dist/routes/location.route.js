"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const location_controller_1 = require("../controllers/location.controller");
const error_handler_1 = require("../utils/error-handler");
const router = (0, express_1.Router)();
router.get('/countries', (0, error_handler_1.asyncHandler)(location_controller_1.getCountries));
router.get('/countries/:countryId/states', (0, error_handler_1.asyncHandler)(location_controller_1.getStates));
router.get('/states/:stateId/cities', (0, error_handler_1.asyncHandler)(location_controller_1.getCities));
router.get('/cities/:cityId/areas', (0, error_handler_1.asyncHandler)(location_controller_1.getAreas));
router.post('/validate-location', (0, error_handler_1.asyncHandler)(location_controller_1.validateLocation));
exports.default = router;
//# sourceMappingURL=location.route.js.map