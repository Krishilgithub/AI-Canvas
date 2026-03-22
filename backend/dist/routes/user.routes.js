"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Profile Routes
router.get("/profile", auth_middleware_1.requireAuth, user_controller_1.userController.getProfile);
router.post("/profile", auth_middleware_1.requireAuth, user_controller_1.userController.updateProfile);
// API Key Routes
router.post("/profile/api-key", auth_middleware_1.requireAuth, user_controller_1.userController.generateApiKey);
// Subscription Routes
router.get("/profile/subscription", auth_middleware_1.requireAuth, user_controller_1.userController.getSubscription);
exports.default = router;
