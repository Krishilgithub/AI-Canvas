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
exports.userController = exports.UserController = void 0;
const db_1 = require("../db");
const crypto_1 = __importDefault(require("crypto"));
class UserController {
    constructor() {
        /**
         * Get User Profile with Subscription & API Key (Masked)
         */
        this.getProfile = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const { data, error } = yield db_1.supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", user_id)
                    .single();
                if (error)
                    throw error;
                // Mask API Key for security
                const maskedApiKey = data.api_key
                    ? `${data.api_key.substring(0, 8)}...${data.api_key.substring(data.api_key.length - 4)}`
                    : null;
                res.json(Object.assign(Object.assign({}, data), { api_key: maskedApiKey, has_api_key: !!data.api_key }));
            }
            catch (e) {
                console.error("Get Profile Error:", e);
                res.status(500).json({ error: e.message });
            }
        });
        /**
         * Update User Profile (Bio, Name, Notifications)
         */
        this.updateProfile = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const { full_name, bio } = req.body;
                const { error } = yield db_1.supabase
                    .from("profiles")
                    .update({
                    full_name,
                    bio,
                    updated_at: new Date().toISOString(),
                })
                    .eq("id", user_id);
                if (error)
                    throw error;
                res.json({ success: true });
            }
            catch (e) {
                console.error("Update Profile Error:", e);
                res.status(500).json({ error: e.message });
            }
        });
        /**
         * Generate or Regenerate API Key
         */
        this.generateApiKey = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                // Generate a secure random key
                const newApiKey = `sk_live_${crypto_1.default.randomBytes(24).toString("hex")}`;
                const { error } = yield db_1.supabase
                    .from("profiles")
                    .update({
                    api_key: newApiKey,
                    updated_at: new Date().toISOString(),
                })
                    .eq("id", user_id);
                if (error)
                    throw error;
                // Return the raw key ONLY ONCE upon generation
                res.json({ api_key: newApiKey });
            }
            catch (e) {
                console.error("Generate API Key Error:", e);
                res.status(500).json({ error: e.message });
            }
        });
        /**
         * Get Subscription Details (Mock for now, ready for Stripe)
         */
        this.getSubscription = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const { data, error } = yield db_1.supabase
                    .from("profiles")
                    .select("subscription_tier, subscription_status, billing_cycle_end")
                    .eq("id", user_id)
                    .single();
                if (error)
                    throw error;
                res.json({
                    plan: data.subscription_tier || "free",
                    status: data.subscription_status || "active",
                    next_billing: data.billing_cycle_end ||
                        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                });
            }
            catch (e) {
                console.error("Get Subscription Error:", e);
                res.status(500).json({ error: e.message });
            }
        });
        /**
         * Permanently Delete Account
         * Uses Supabase admin API to destroy the auth user, which cascades and deletes all owned data
         */
        this.deleteAccount = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                // Supabase admin deletes instantly wipe auth.users and triggers cascading deletions
                const { error } = yield db_1.supabase.auth.admin.deleteUser(user_id);
                if (error)
                    throw error;
                res.json({ success: true });
            }
            catch (e) {
                console.error("Delete Account Error:", e);
                res.status(500).json({ error: e.message });
            }
        });
        /**
         * Get Public Portfolio
         * Unauthenticated endpoint to fetch user's public info and top posts
         */
        this.getPublicPortfolio = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const { data: profile, error: profileErr } = yield db_1.supabase
                    .from("profiles")
                    .select("id, full_name, bio, role, niche")
                    .eq("id", id)
                    .single();
                if (profileErr || !profile)
                    return res.status(404).json({ error: "Portfolio not found" });
                const { data: posts, error: postsErr } = yield db_1.supabase
                    .from("generated_posts")
                    .select("id, content, published_at, ai_metadata")
                    .eq("user_id", id)
                    .eq("status", "published")
                    .order("published_at", { ascending: false })
                    .limit(10);
                if (postsErr)
                    throw postsErr;
                res.json({
                    profile,
                    posts: posts || []
                });
            }
            catch (e) {
                console.error("Get Public Portfolio Error:", e);
                res.status(500).json({ error: "Failed to load portfolio" });
            }
        });
    }
}
exports.UserController = UserController;
exports.userController = new UserController();
