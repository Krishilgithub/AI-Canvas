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
exports.webhook = exports.createSession = void 0;
const stripe_service_1 = require("../services/stripe.service");
const createSession = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { priceId } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const userEmail = ((_b = req.user) === null || _b === void 0 ? void 0 : _b.email) || "";
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const session = yield (0, stripe_service_1.createCheckoutSession)(priceId, userId, userEmail);
        res.json({ url: session.url });
    }
    catch (error) {
        console.error("Create Session Error:", error);
        res.status(500).json({ error: error.message });
    }
});
exports.createSession = createSession;
const webhook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const signature = req.headers["stripe-signature"];
    try {
        // Use rawBody captured in server.ts middleware
        const rawBody = req.rawBody;
        if (!rawBody)
            throw new Error("Missing raw body");
        yield (0, stripe_service_1.handleWebhook)(signature, rawBody);
        res.json({ received: true });
    }
    catch (error) {
        console.error("Webhook Error:", error.message);
        res.status(400).send(`Webhook Error: ${error.message}`);
    }
});
exports.webhook = webhook;
