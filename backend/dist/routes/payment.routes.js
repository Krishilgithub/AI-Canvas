"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payment_controller_1 = require("../controllers/payment.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Webhook route (no auth — verified by Stripe signature)
router.post("/webhook", payment_controller_1.webhook);
// Checkout session
router.post("/create-checkout-session", auth_middleware_1.requireAuth, payment_controller_1.createSession);
// FIX: Billing portal — lets users manage subscriptions (upgrades, cancellations) themselves
router.post("/create-portal-session", auth_middleware_1.requireAuth, payment_controller_1.createPortal);
exports.default = router;
