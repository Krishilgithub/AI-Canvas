import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

// Start Flow: GET /api/v1/auth/linkedin/connect
router.get("/linkedin/connect", requireAuth, authController.getLinkedInAuthUrl);

// Callback: GET /api/v1/auth/linkedin/callback
router.get("/linkedin/callback", authController.handleLinkedInCallback);

// Disconnect: DELETE /api/v1/auth/linkedin
router.delete("/linkedin", requireAuth, authController.disconnectLinkedIn);

// Twitter
router.get("/twitter/connect", requireAuth, authController.getTwitterAuthUrl);
router.get("/twitter/callback", authController.handleTwitterCallback);
router.delete("/twitter", requireAuth, authController.disconnectTwitter);

// --- INSTAGRAM ---
router.get("/instagram/connect", requireAuth, authController.getInstagramAuthUrl);
router.get("/instagram/callback", authController.handleInstagramCallback);
router.delete("/instagram", requireAuth, authController.disconnectInstagram);

// --- SLACK ---
router.get("/slack/connect", requireAuth, authController.getSlackAuthUrl);
router.get("/slack/callback", authController.handleSlackCallback);
router.delete("/slack", requireAuth, authController.disconnectSlack);

// --- REDDIT ---
router.get("/reddit/connect", requireAuth, authController.getRedditAuthUrl);
router.get("/reddit/callback", authController.handleRedditCallback);
router.delete("/reddit", requireAuth, authController.disconnectReddit);

// --- GENERIC / FALLBACK ---
// Connect: GET /api/v1/auth/:platform/connect
router.get("/:platform/connect", requireAuth, authController.connectPlatform);

// Callback: GET /api/v1/auth/:platform/callback
router.get("/:platform/callback", authController.handlePlatformCallback);

// Disconnect: DELETE /api/v1/auth/:platform
router.delete("/:platform", requireAuth, authController.disconnectPlatform);

export default router;
