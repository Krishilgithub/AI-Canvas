"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analytics_controller_1 = require("../controllers/analytics.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.requireAuth); // Protect all analytics routes
router.get("/overview", analytics_controller_1.analyticsController.getOverview);
router.get("/activity", analytics_controller_1.analyticsController.getRecentActivity);
router.get("/stats", analytics_controller_1.analyticsController.getPlatformStats); // Generic stats for chart
exports.default = router;
