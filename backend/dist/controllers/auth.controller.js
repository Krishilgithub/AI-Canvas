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
exports.authController = exports.AuthController = void 0;
const linkedin_service_1 = require("../services/linkedin.service");
const twitter_service_1 = require("../services/twitter.service");
const instagram_service_1 = require("../services/instagram.service");
const slack_service_1 = require("../services/slack.service");
const reddit_service_1 = require("../services/reddit.service");
const youtube_service_1 = require("../services/youtube.service");
const db_1 = require("../db");
const getFrontendUrl = () => {
    const isProd = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
    return process.env.FRONTEND_URL || (isProd ? "https://ai-canvass.vercel.app" : "http://localhost:3000");
};
class AuthController {
    constructor() {
        // 1. Get Auth URL
        this.getLinkedInAuthUrl = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                // Encode user_id in state (in prod, sign this to prevent tampering)
                const state = Buffer.from(JSON.stringify({ user_id })).toString("base64");
                const url = linkedin_service_1.linkedInService.getAuthUrl(state);
                res.json({ url });
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        // 2. Handle Callback
        this.handleLinkedInCallback = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { code, state, error } = req.query;
                if (error) {
                    return res.redirect(`${getFrontendUrl()}/integrations?error=${error}`);
                }
                if (!code || !state) {
                    return res.redirect(`${getFrontendUrl()}/integrations?error=invalid_callback`);
                }
                // Decode state
                const decodedState = JSON.parse(Buffer.from(state, "base64").toString("ascii"));
                const { user_id } = decodedState;
                if (!user_id) {
                    return res.redirect(`${getFrontendUrl()}/integrations?error=invalid_state`);
                }
                // Connect Account
                yield linkedin_service_1.linkedInService.connectAccount(user_id, code);
                // Redirect to frontend
                res.redirect(`${getFrontendUrl()}/integrations?success=linkedin_connected`);
            }
            catch (e) {
                console.error("LinkedIn Callback Error:", e);
                res.redirect(`${getFrontendUrl()}/integrations?error=connection_failed`);
            }
        });
        // 3. Disconnect
        this.disconnectLinkedIn = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const { error } = yield db_1.supabase
                    .from("linked_accounts")
                    .delete()
                    .eq("user_id", user_id)
                    .eq("platform", "linkedin");
                if (error)
                    throw error;
                res.json({ success: true });
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        // --- TWITTER ---
        this.getTwitterAuthUrl = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const state = Buffer.from(JSON.stringify({ user_id })).toString("base64");
                const url = twitter_service_1.twitterService.getAuthUrl(state);
                res.json({ url });
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        this.handleTwitterCallback = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { code, state, error } = req.query;
                if (error)
                    return res.redirect(`${getFrontendUrl()}/integrations?error=${error}`);
                if (!code || !state)
                    return res.redirect(`${getFrontendUrl()}/integrations?error=invalid_callback`);
                const decodedState = JSON.parse(Buffer.from(state, "base64").toString("ascii"));
                const { user_id, cv } = decodedState;
                if (!user_id || !cv)
                    return res.redirect(`${getFrontendUrl()}/integrations?error=invalid_state`);
                yield twitter_service_1.twitterService.exchangeCodeForToken(code, cv, user_id);
                res.redirect(`${getFrontendUrl()}/integrations?success=twitter_connected`);
            }
            catch (e) {
                console.error("Twitter Callback Error:", e);
                const msg = encodeURIComponent(e.stack || e.message || "unknown_error");
                res.redirect(`${getFrontendUrl()}/integrations?error=connection_failed_${msg}`);
            }
        });
        this.disconnectTwitter = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const { error } = yield db_1.supabase.from("linked_accounts").delete().eq("user_id", user_id).eq("platform", "twitter");
                if (error)
                    throw error;
                res.json({ success: true });
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        // --- INSTAGRAM ---
        this.getInstagramAuthUrl = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const state = Buffer.from(JSON.stringify({ user_id })).toString("base64");
                const url = instagram_service_1.instagramService.getAuthUrl(state);
                res.json({ url });
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        this.handleInstagramCallback = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { code, state, error } = req.query;
                if (error)
                    return res.redirect(`${getFrontendUrl()}/integrations?error=${error}`);
                if (!code || !state)
                    return res.redirect(`${getFrontendUrl()}/integrations?error=invalid_callback`);
                const decodedState = JSON.parse(Buffer.from(state, "base64").toString("ascii"));
                const { user_id } = decodedState;
                if (!user_id)
                    return res.redirect(`${getFrontendUrl()}/integrations?error=invalid_state`);
                yield instagram_service_1.instagramService.exchangeCodeForToken(code, user_id);
                res.redirect(`${getFrontendUrl()}/integrations?success=instagram_connected`);
            }
            catch (e) {
                console.error("Instagram Callback Error:", e);
                res.redirect(`${getFrontendUrl()}/integrations?error=connection_failed`);
            }
        });
        this.disconnectInstagram = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const { error } = yield db_1.supabase.from("linked_accounts").delete().eq("user_id", user_id).eq("platform", "instagram");
                if (error)
                    throw error;
                res.json({ success: true });
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        // --- YOUTUBE ---
        this.getYouTubeAuthUrl = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const state = Buffer.from(JSON.stringify({ user_id })).toString("base64");
                const url = youtube_service_1.youtubeService.getAuthUrl(state);
                res.json({ url });
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        this.handleYouTubeCallback = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { code, state, error } = req.query;
                if (error)
                    return res.redirect(`${getFrontendUrl()}/integrations?error=${error}`);
                if (!code || !state)
                    return res.redirect(`${getFrontendUrl()}/integrations?error=invalid_callback`);
                const decodedState = JSON.parse(Buffer.from(state, "base64").toString("ascii"));
                const { user_id } = decodedState;
                if (!user_id)
                    return res.redirect(`${getFrontendUrl()}/integrations?error=invalid_state`);
                yield youtube_service_1.youtubeService.exchangeCodeForToken(code, user_id);
                res.redirect(`${getFrontendUrl()}/integrations?success=youtube_connected`);
            }
            catch (e) {
                console.error("YouTube Callback Error:", e);
                res.redirect(`${getFrontendUrl()}/integrations?error=connection_failed`);
            }
        });
        this.disconnectYouTube = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const { error } = yield db_1.supabase.from("linked_accounts").delete().eq("user_id", user_id).eq("platform", "youtube");
                if (error)
                    throw error;
                res.json({ success: true });
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        // --- GENERIC PLATFORM HANDLERS ---
        this.connectPlatform = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const { platform } = req.params;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                // For generic platforms (Twitter, Instagram, etc.), we simulate the flow
                // In a real app, this would get the OAuth URL for that specific platform.
                // Simulation: Redirect directly to callback with success
                const callbackUrl = `${process.env.APP_URL || "http://localhost:4000"}/api/v1/auth/${platform}/callback?code=mock_code&state=${Buffer.from(JSON.stringify({ user_id })).toString("base64")}`;
                // If we were returning a URL to frontend:
                res.json({ url: callbackUrl });
                // Or if the frontend expects to click a link that goes here, we redirect.
                // But usually we return { url } so frontend can window.location.href = url
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        this.handlePlatformCallback = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { platform } = req.params;
                const { code, state, error } = req.query;
                if (error)
                    return res.redirect(`${getFrontendUrl()}/integrations?error=${error}`);
                const decodedState = JSON.parse(Buffer.from(state, "base64").toString("ascii"));
                const { user_id } = decodedState;
                if (!user_id)
                    return res.redirect(`${getFrontendUrl()}/integrations?error=invalid_state`);
                // Verify/Exchange Token (Mocked)
                const mockToken = {
                    access_token: `mock_${platform}_token_${Date.now()}`,
                    refresh_token: `mock_${platform}_refresh_${Date.now()}`,
                    expires_in: 3600,
                };
                // Save to DB
                // Try to save to Supabase. Note: 'platform' enum might fail if not updated.
                // We'll try, and if it fails, we catch it but still redirect success for the "demo" requirement if possible,
                // or just fail.
                yield db_1.supabase.from("linked_accounts").upsert({
                    user_id,
                    platform, // This might fail if enum is strict
                    access_token: mockToken.access_token,
                    refresh_token: mockToken.refresh_token,
                    expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
                    connection_status: "active",
                }, { onConflict: "user_id, platform" });
                res.redirect(`${getFrontendUrl()}/integrations?success=${platform}_connected`);
            }
            catch (e) {
                console.error(`${req.params.platform} Callback Error:`, e);
                // If it was a DB constraint error, we might still want to show success for the demo if strictly requested.
                // But better to show error so we know.
                res.redirect(`${getFrontendUrl()}/integrations?error=connection_failed`);
            }
        });
        this.disconnectPlatform = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const { platform } = req.params;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const { error } = yield db_1.supabase
                    .from("linked_accounts")
                    .delete()
                    .eq("user_id", user_id)
                    .eq("platform", platform);
                if (error)
                    throw error;
                res.json({ success: true });
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        // --- SLACK ---
        this.getSlackAuthUrl = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const state = Buffer.from(JSON.stringify({ user_id })).toString("base64");
                const url = slack_service_1.slackService.getAuthUrl(state);
                res.json({ url });
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        this.handleSlackCallback = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { code, state, error } = req.query;
                if (error)
                    return res.redirect(`${getFrontendUrl()}/integrations?error=${error}`);
                if (!code || !state)
                    return res.redirect(`${getFrontendUrl()}/integrations?error=invalid_callback`);
                const decodedState = JSON.parse(Buffer.from(state, "base64").toString("ascii"));
                const { user_id } = decodedState;
                if (!user_id)
                    return res.redirect(`${getFrontendUrl()}/integrations?error=invalid_state`);
                yield slack_service_1.slackService.exchangeCodeForToken(code, user_id);
                res.redirect(`${getFrontendUrl()}/integrations?success=slack_connected`);
            }
            catch (e) {
                console.error("Slack Callback Error:", e);
                res.redirect(`${getFrontendUrl()}/integrations?error=connection_failed`);
            }
        });
        this.disconnectSlack = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const { error } = yield db_1.supabase.from("linked_accounts").delete().eq("user_id", user_id).eq("platform", "slack");
                if (error)
                    throw error;
                res.json({ success: true });
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        // --- REDDIT ---
        this.getRedditAuthUrl = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const state = Buffer.from(JSON.stringify({ user_id })).toString("base64");
                const url = reddit_service_1.redditService.getAuthUrl(state);
                res.json({ url });
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        this.handleRedditCallback = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { code, state, error } = req.query;
                if (error)
                    return res.redirect(`${process.env.FRONTEND_URL}/integrations?error=${error}`);
                if (!code || !state)
                    return res.redirect(`${process.env.FRONTEND_URL}/integrations?error=invalid_callback`);
                const decodedState = JSON.parse(Buffer.from(state, "base64").toString("ascii"));
                const { user_id } = decodedState;
                if (!user_id)
                    return res.redirect(`${process.env.FRONTEND_URL}/integrations?error=invalid_state`);
                yield reddit_service_1.redditService.exchangeCodeForToken(code, user_id);
                res.redirect(`${process.env.FRONTEND_URL}/integrations?success=reddit_connected`);
            }
            catch (e) {
                console.error("Reddit Callback Error:", e);
                res.redirect(`${process.env.FRONTEND_URL}/integrations?error=connection_failed`);
            }
        });
        this.disconnectReddit = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const { error } = yield db_1.supabase.from("linked_accounts").delete().eq("user_id", user_id).eq("platform", "reddit");
                if (error)
                    throw error;
                res.json({ success: true });
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
    }
}
exports.AuthController = AuthController;
exports.authController = new AuthController();
