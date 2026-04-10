"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const insights_controller_1 = require("../controllers/insights.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// POST /api/v1/insights/autopsy — analyze a post
router.post("/autopsy", auth_middleware_1.requireAuth, insights_controller_1.insightsController.analyzePost);
// GET /api/v1/insights/top-posts/:platform — get top-performing posts for draft seeding
router.get("/top-posts/:platform", auth_middleware_1.requireAuth, insights_controller_1.insightsController.getTopPerformingPosts);
// GET /api/v1/insights/:platform — get stored insights for a platform
router.get("/:platform", auth_middleware_1.requireAuth, insights_controller_1.insightsController.getPlatformInsights);
exports.default = router;
