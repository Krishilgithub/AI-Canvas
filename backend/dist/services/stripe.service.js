"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleWebhook = exports.createCheckoutSession = void 0;
const stripe_1 = __importDefault(require("stripe"));
const db_1 = require("../db");
const stripeKey = process.env.STRIPE_SECRET_KEY || "sk_test_dummy";
if (!process.env.STRIPE_SECRET_KEY) {
    console.warn("⚠️ STRIPE_SECRET_KEY is missing. Stripe functionality will fail.");
}
const stripe = new stripe_1.default(stripeKey, {
    apiVersion: "2026-01-28.clover",
});
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const createCheckoutSession = (priceId, userId, userEmail) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const session = yield stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: "subscription",
            success_url: `${FRONTEND_URL}/settings?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${FRONTEND_URL}/settings?canceled=true`,
            customer_email: userEmail,
            metadata: {
                userId,
            },
            allow_promotion_codes: true,
        });
        return session;
    }
    catch (error) {
        throw new Error(`Stripe session creation failed: ${error.message}`);
    }
});
exports.createCheckoutSession = createCheckoutSession;
const handleWebhook = (signature, rawBody) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret)
        throw new Error("Missing STRIPE_WEBHOOK_SECRET");
    let event;
    try {
        event = stripe.webhooks.constructEvent(rawBody, signature, secret);
    }
    catch (err) {
        throw new Error(`Webhook signature verification failed: ${err.message}`);
    }
    // Handle specific events
    switch (event.type) {
        case "checkout.session.completed":
            const session = event.data.object;
            const userId = (_a = session.metadata) === null || _a === void 0 ? void 0 : _a.userId;
            if (userId) {
                // Update user subscription in Supabase
                yield db_1.supabase
                    .from("users")
                    .update({
                    subscription_status: "active",
                    subscription_tier: "pro", // Simplified logic
                    subscription_id: session.subscription,
                })
                    .eq("id", userId);
            }
            break;
        // Handle subscription updates/cancellations as needed
        case "customer.subscription.deleted":
            // Handle cancellation
            break;
    }
    return { received: true };
});
exports.handleWebhook = handleWebhook;
