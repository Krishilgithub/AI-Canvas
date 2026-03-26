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
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhook = exports.createPortal = exports.createSession = void 0;
const stripe_service_1 = require("../services/stripe.service");
const db_1 = require("../db");
const createSession = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { priceId } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const userEmail = ((_b = req.user) === null || _b === void 0 ? void 0 : _b.email) || "";
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        if (!priceId)
            return res.status(400).json({ error: "priceId is required" });
        const session = yield (0, stripe_service_1.createCheckoutSession)(priceId, userId, userEmail);
        res.json({ url: session.url });
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("[Payment] Create Session Error:", msg);
        res.status(500).json({ error: msg });
    }
});
exports.createSession = createSession;
// FIX: New portal handler — redirects user to Stripe Customer Portal
// where they can manage their own subscription (upgrade, downgrade, cancel)
const createPortal = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        // Look up the user's stripe_customer_id
        const { data: user, error } = yield db_1.supabase
            .from("users")
            .select("stripe_customer_id")
            .eq("id", userId)
            .single();
        if (error || !(user === null || user === void 0 ? void 0 : user.stripe_customer_id)) {
            return res.status(400).json({
                error: "No Stripe customer found. Please complete a checkout first.",
            });
        }
        const portalUrl = yield (0, stripe_service_1.createPortalSession)(user.stripe_customer_id);
        res.json({ url: portalUrl });
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("[Payment] Create Portal Error:", msg);
        res.status(500).json({ error: msg });
    }
});
exports.createPortal = createPortal;
const webhook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const signature = req.headers["stripe-signature"];
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawBody = req.rawBody;
        if (!rawBody)
            throw new Error("Missing raw body");
        yield (0, stripe_service_1.handleWebhook)(signature, rawBody);
        res.json({ received: true });
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("[Payment] Webhook Error:", msg);
        res.status(400).send(`Webhook Error: ${msg}`);
    }
});
exports.webhook = webhook;
