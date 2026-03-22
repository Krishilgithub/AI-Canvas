"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const automation_controller_1 = require("../controllers/automation.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const automation_schema_1 = require("../schemas/automation.schema");
const post_schema_1 = require("../schemas/post.schema");
const router = express_1.default.Router();
const controller = new automation_controller_1.AutomationController();
// Config
router.post("/config", auth_middleware_1.requireAuth, (0, validation_middleware_1.validate)(automation_schema_1.saveConfigSchema), controller.saveConfig);
router.get("/config", auth_middleware_1.requireAuth, (0, validation_middleware_1.validate)(automation_schema_1.getConfigSchema), controller.getConfig);
// Trends
router.get("/trends", auth_middleware_1.requireAuth, controller.getTrends);
router.post("/scan", auth_middleware_1.requireAuth, controller.scanTrends); // Added missing route
// Automation Triggers
router.post("/create-draft", auth_middleware_1.requireAuth, (0, validation_middleware_1.validate)(automation_schema_1.createDraftSchema), controller.createDraft);
// App Data
router.get("/posts", auth_middleware_1.requireAuth, (0, validation_middleware_1.validate)(automation_schema_1.getPostsSchema), controller.getPosts);
router.get("/analytics/export", auth_middleware_1.requireAuth, controller.exportAnalytics);
router.get("/analytics", auth_middleware_1.requireAuth, controller.getAnalytics);
router.get("/logs", auth_middleware_1.requireAuth, controller.getLogs);
router.get("/profile", auth_middleware_1.requireAuth, controller.getProfile);
router.post("/profile", auth_middleware_1.requireAuth, controller.updateProfile);
router.get("/connections", auth_middleware_1.requireAuth, controller.getConnections);
router.put("/posts/:id", auth_middleware_1.requireAuth, (0, validation_middleware_1.validate)(post_schema_1.updatePostSchema), controller.updatePost);
router.post("/posts", auth_middleware_1.requireAuth, (0, validation_middleware_1.validate)(post_schema_1.createPostSchema), controller.createPost);
router.delete("/posts/:id", auth_middleware_1.requireAuth, controller.deletePost);
router.post("/posts/:id/retry", auth_middleware_1.requireAuth, controller.retryPost);
// Actions
// Team
router.get("/team", auth_middleware_1.requireAuth, controller.getTeamMembers);
router.post("/team/invite", auth_middleware_1.requireAuth, controller.inviteTeamMember);
router.delete("/team/:id", auth_middleware_1.requireAuth, controller.removeTeamMember);
router.post("/trigger-post", auth_middleware_1.requireAuth, (0, validation_middleware_1.validate)(automation_schema_1.triggerPostSchema), controller.triggerPost);
router.post("/seed", auth_middleware_1.requireAuth, controller.seedData);
router.post("/generate-manual", auth_middleware_1.requireAuth, controller.generateManualPost);
router.get("/quota", auth_middleware_1.requireAuth, controller.getQuotaStatus);
exports.default = router;
