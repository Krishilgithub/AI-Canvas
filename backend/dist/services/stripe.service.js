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
exports.handleWebhook = exports.createPortalSession = exports.createCheckoutSession = void 0;
const stripe_1 = __importDefault(require("stripe"));
const db_1 = require("../db");
// ─── Init ─────────────────────────────────────────────────────────────────────
const stripeKey = process.env.STRIPE_SECRET_KEY || "sk_test_dummy";
if (!process.env.STRIPE_SECRET_KEY) {
    console.warn("[Stripe] STRIPE_SECRET_KEY is missing. Stripe functionality will fail.");
}
const stripe = new stripe_1.default(stripeKey, {
    apiVersion: "2026-01-28.clover",
});
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
// ─── Price ID → Tier Mapping ──────────────────────────────────────────────────
// FIX: Was hardcoded "pro" for every plan. Now reads from environment variables
// so the mapping can differ between test and production Stripe environments.
// Add these to your .env:
//   STRIPE_PRICE_PRO=price_xxx
//   STRIPE_PRICE_ENTERPRISE=price_yyy
//
// If a Price ID is not in the map, it defaults to "pro" (existing behaviour).
function tierFromPriceId(priceId) {
    var _a;
    if (!priceId)
        return "pro";
    const priceToTier = {};
    if (process.env.STRIPE_PRICE_PRO)
        priceToTier[process.env.STRIPE_PRICE_PRO] = "pro";
    if (process.env.STRIPE_PRICE_ENTERPRISE)
        priceToTier[process.env.STRIPE_PRICE_ENTERPRISE] = "enterprise";
    return (_a = priceToTier[priceId]) !== null && _a !== void 0 ? _a : "pro"; // default to pro for unknown price ids
}
// ─── Checkout ─────────────────────────────────────────────────────────────────
const createCheckoutSession = (priceId, userId, userEmail) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const session = yield stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [{ price: priceId, quantity: 1 }],
            mode: "subscription",
            success_url: `${FRONTEND_URL}/settings?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${FRONTEND_URL}/settings?canceled=true`,
            customer_email: userEmail,
            metadata: { userId },
            allow_promotion_codes: true,
        });
        return session;
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`Stripe session creation failed: ${msg}`);
    }
});
exports.createCheckoutSession = createCheckoutSession;
// ─── Billing Portal ───────────────────────────────────────────────────────────
// FIX: Added a createPortalSession export so users can manage their own subscriptions
// (upgrades, downgrades, cancellations) via the Stripe Customer Portal.
const createPortalSession = (customerId) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${FRONTEND_URL}/settings?tab=billing`,
    });
    return session.url;
});
exports.createPortalSession = createPortalSession;
// ─── Webhook ──────────────────────────────────────────────────────────────────
const handleWebhook = (signature, rawBody) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret)
        throw new Error("Missing STRIPE_WEBHOOK_SECRET");
    let event;
    try {
        event = stripe.webhooks.constructEvent(rawBody, signature, secret);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`Webhook signature verification failed: ${msg}`);
    }
    switch (event.type) {
        // ── New subscription activated (checkout completed) ──────────────────────
        case "checkout.session.completed": {
            const session = event.data.object;
            const userId = (_a = session.metadata) === null || _a === void 0 ? void 0 : _a.userId;
            if (!userId)
                break;
            // FIX: Retrieve the actual subscription to get the correct Price ID
            let tier = "pro";
            if (session.subscription) {
                const subscription = yield stripe.subscriptions.retrieve(session.subscription);
                const priceId = (_c = (_b = subscription.items.data[0]) === null || _b === void 0 ? void 0 : _b.price) === null || _c === void 0 ? void 0 : _c.id;
                tier = tierFromPriceId(priceId);
            }
            yield db_1.supabase
                .from("users")
                .update({
                subscription_status: "active",
                subscription_tier: tier, // FIX: real tier from Price ID, not hardcoded
                subscription_id: session.subscription,
                stripe_customer_id: session.customer,
            })
                .eq("id", userId);
            console.log(`[Stripe] User ${userId} activated → tier: ${tier}`);
            break;
        }
        // ── Subscription updated (upgrade / downgrade) ────────────────────────────
        case "customer.subscription.updated": {
            const subscription = event.data.object;
            const userId = (_d = subscription.metadata) === null || _d === void 0 ? void 0 : _d.userId;
            if (!userId)
                break;
            const priceId = (_f = (_e = subscription.items.data[0]) === null || _e === void 0 ? void 0 : _e.price) === null || _f === void 0 ? void 0 : _f.id;
            const tier = tierFromPriceId(priceId);
            const status = subscription.status; // active | past_due | canceled etc.
            yield db_1.supabase
                .from("users")
                .update({
                subscription_tier: status === "active" ? tier : "free",
                subscription_status: status,
            })
                .eq("id", userId);
            console.log(`[Stripe] Subscription updated for user ${userId} → ${tier} (${status})`);
            break;
        }
        // ── FIX: Cancellation was a no-op empty break — now properly downgrades user ─
        case "customer.subscription.deleted": {
            const subscription = event.data.object;
            // Find the user by subscription ID (metadata may not exist on deleted events)
            const { data: user } = yield db_1.supabase
                .from("users")
                .select("id")
                .eq("subscription_id", subscription.id)
                .single();
            if (!(user === null || user === void 0 ? void 0 : user.id)) {
                console.warn("[Stripe] Cancellation received but no matching user found for subscription:", subscription.id);
                break;
            }
            // Downgrade to free; preserve their stripe_customer_id for re-subscription
            yield db_1.supabase
                .from("users")
                .update({
                subscription_tier: "free",
                subscription_status: "canceled",
                subscription_id: null,
            })
                .eq("id", user.id);
            console.log(`[Stripe] User ${user.id} subscription canceled → downgraded to free`);
            break;
        }
        // ── Payment failed (past due — warn user) ─────────────────────────────────
        case "invoice.payment_failed": {
            const invoice = event.data.object;
            const customerId = invoice.customer;
            const { data: user } = yield db_1.supabase
                .from("users")
                .select("id")
                .eq("stripe_customer_id", customerId)
                .single();
            if (user === null || user === void 0 ? void 0 : user.id) {
                yield db_1.supabase
                    .from("users")
                    .update({ subscription_status: "past_due" })
                    .eq("id", user.id);
                console.warn(`[Stripe] Payment failed for user ${user.id} — status set to past_due`);
            }
            break;
        }
        default:
            // Unhandled event — ignore silently
            break;
    }
    return { received: true };
});
exports.handleWebhook = handleWebhook;
