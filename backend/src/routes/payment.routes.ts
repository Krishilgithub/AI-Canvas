import { Router } from "express";
import { createSession, createPortal, webhook } from "../controllers/payment.controller";
import { requireAuth } from "../middleware/auth.middleware";
import express from "express";

const router = Router();

// Webhook route (no auth — verified by Stripe signature)
router.post("/webhook", webhook);

// Checkout session
router.post("/create-checkout-session", requireAuth, createSession);

// FIX: Billing portal — lets users manage subscriptions (upgrades, cancellations) themselves
router.post("/create-portal-session", requireAuth, createPortal);

export default router;
