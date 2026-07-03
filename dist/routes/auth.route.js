"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.post('/login', auth_controller_1.authController.login);
router.post('/logout', auth_middleware_1.authenticate, auth_controller_1.authController.logout);
router.get('/me', auth_middleware_1.authenticate, auth_controller_1.authController.getCurrentUser);
router.patch('/change-password', auth_middleware_1.authenticate, auth_controller_1.authController.changePassword);
exports.default = router;
//# sourceMappingURL=auth.route.js.map