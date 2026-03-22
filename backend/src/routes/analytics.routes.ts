import { Router } from "express";
import { analyticsController } from "../controllers/analytics.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.use(requireAuth); // Protect all analytics routes

router.get("/overview", analyticsController.getOverview);
router.get("/activity", analyticsController.getRecentActivity);
router.get("/stats", analyticsController.getPlatformStats); // Generic stats for chart

export default router;
