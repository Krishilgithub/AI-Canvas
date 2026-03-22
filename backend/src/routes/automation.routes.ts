import express from "express";
import { AutomationController } from "../controllers/automation.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import {
  saveConfigSchema,
  getConfigSchema,
  triggerPostSchema,
  createDraftSchema,
  getPostsSchema,
} from "../schemas/automation.schema";
import { updatePostSchema, createPostSchema } from "../schemas/post.schema";

const router = express.Router();
const controller = new AutomationController();

// Config
router.post(
  "/config",
  requireAuth,
  validate(saveConfigSchema),
  controller.saveConfig,
);
router.get(
  "/config",
  requireAuth,
  validate(getConfigSchema),
  controller.getConfig,
);

// Trends
router.get("/trends", requireAuth, controller.getTrends);
router.post("/scan", requireAuth, controller.scanTrends); // Added missing route

// Automation Triggers
router.post(
  "/create-draft",
  requireAuth,
  validate(createDraftSchema),
  controller.createDraft,
);

// App Data
router.get(
  "/posts",
  requireAuth,
  validate(getPostsSchema),
  controller.getPosts,
);
router.get("/analytics/export", requireAuth, controller.exportAnalytics);
router.get("/analytics", requireAuth, controller.getAnalytics);
router.get("/logs", requireAuth, controller.getLogs);
router.get("/profile", requireAuth, controller.getProfile);
router.post("/profile", requireAuth, controller.updateProfile);
router.get("/connections", requireAuth, controller.getConnections);
router.put(
  "/posts/:id",
  requireAuth,
  validate(updatePostSchema),
  controller.updatePost,
);
router.post(
  "/posts",
  requireAuth,
  validate(createPostSchema),
  controller.createPost,
);
router.delete("/posts/:id", requireAuth, controller.deletePost);
router.post("/posts/:id/retry", requireAuth, controller.retryPost);

// Actions

// Team
router.get("/team", requireAuth, controller.getTeamMembers);
router.post("/team/invite", requireAuth, controller.inviteTeamMember);
router.delete("/team/:id", requireAuth, controller.removeTeamMember);
router.post("/trigger-post", requireAuth, validate(triggerPostSchema), controller.triggerPost);
router.post("/seed", requireAuth, controller.seedData);
router.post("/generate-manual", requireAuth, controller.generateManualPost);
router.get("/quota", requireAuth, controller.getQuotaStatus);

// Vercel Cron endpoints (Auth handled inside via CRON_SECRET)
router.get("/cron/process-posts", controller.processCronJobs);
router.get("/cron/weekly-digest", controller.processWeeklyDigestCron);

export default router;
