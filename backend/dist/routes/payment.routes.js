"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payment_controller_1 = require("../controllers/payment.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Webhook route
router.post("/webhook", payment_controller_1.webhook);
router.post("/create-checkout-session", auth_middleware_1.requireAuth, payment_controller_1.createSession);
exports.default = router;
