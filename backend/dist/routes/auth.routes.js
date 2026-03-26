"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Start Flow: GET /api/v1/auth/linkedin/connect
router.get("/linkedin/connect", auth_middleware_1.requireAuth, auth_controller_1.authController.getLinkedInAuthUrl);
// Callback: GET /api/v1/auth/linkedin/callback
router.get("/linkedin/callback", auth_controller_1.authController.handleLinkedInCallback);
// Disconnect: DELETE /api/v1/auth/linkedin
router.delete("/linkedin", auth_middleware_1.requireAuth, auth_controller_1.authController.disconnectLinkedIn);
// Twitter
router.get("/twitter/connect", auth_middleware_1.requireAuth, auth_controller_1.authController.getTwitterAuthUrl);
router.get("/twitter/callback", auth_controller_1.authController.handleTwitterCallback);
router.delete("/twitter", auth_middleware_1.requireAuth, auth_controller_1.authController.disconnectTwitter);
// --- INSTAGRAM ---
router.get("/instagram/connect", auth_middleware_1.requireAuth, auth_controller_1.authController.getInstagramAuthUrl);
router.get("/instagram/callback", auth_controller_1.authController.handleInstagramCallback);
router.delete("/instagram", auth_middleware_1.requireAuth, auth_controller_1.authController.disconnectInstagram);
// --- SLACK ---
router.get("/slack/connect", auth_middleware_1.requireAuth, auth_controller_1.authController.getSlackAuthUrl);
router.get("/slack/callback", auth_controller_1.authController.handleSlackCallback);
router.delete("/slack", auth_middleware_1.requireAuth, auth_controller_1.authController.disconnectSlack);
// --- REDDIT ---
router.get("/reddit/connect", auth_middleware_1.requireAuth, auth_controller_1.authController.getRedditAuthUrl);
router.get("/reddit/callback", auth_controller_1.authController.handleRedditCallback);
router.delete("/reddit", auth_middleware_1.requireAuth, auth_controller_1.authController.disconnectReddit);
// --- YOUTUBE ---
router.get("/youtube/connect", auth_middleware_1.requireAuth, auth_controller_1.authController.getYouTubeAuthUrl);
router.get("/youtube/callback", auth_controller_1.authController.handleYouTubeCallback);
router.delete("/youtube", auth_middleware_1.requireAuth, auth_controller_1.authController.disconnectYouTube);
// --- GENERIC / FALLBACK ---
// Connect: GET /api/v1/auth/:platform/connect
router.get("/:platform/connect", auth_middleware_1.requireAuth, auth_controller_1.authController.connectPlatform);
// Callback: GET /api/v1/auth/:platform/callback
router.get("/:platform/callback", auth_controller_1.authController.handlePlatformCallback);
// Disconnect: DELETE /api/v1/auth/:platform
router.delete("/:platform", auth_middleware_1.requireAuth, auth_controller_1.authController.disconnectPlatform);
exports.default = router;
