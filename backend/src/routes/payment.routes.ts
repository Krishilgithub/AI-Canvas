import { Router } from "express";
import { createSession, webhook } from "../controllers/payment.controller";
import { requireAuth } from "../middleware/auth.middleware";
import express from "express";

const router = Router();

// Webhook route
router.post("/webhook", webhook);

router.post("/create-checkout-session", requireAuth, createSession);

export default router;
