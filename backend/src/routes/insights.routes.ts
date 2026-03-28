import { Router } from "express";
import { insightsController } from "../controllers/insights.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

// POST /api/v1/insights/autopsy — analyze a post
router.post("/autopsy", requireAuth, insightsController.analyzePost);

// GET /api/v1/insights/top-posts/:platform — get top-performing posts for draft seeding
router.get("/top-posts/:platform", requireAuth, insightsController.getTopPerformingPosts);

// GET /api/v1/insights/:platform — get stored insights for a platform
router.get("/:platform", requireAuth, insightsController.getPlatformInsights);

export default router;
