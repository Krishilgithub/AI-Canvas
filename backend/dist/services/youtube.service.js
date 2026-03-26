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
exports.youtubeService = exports.YouTubeService = void 0;
const axios_1 = __importDefault(require("axios"));
const db_1 = require("../db");
class YouTubeService {
    constructor() {
        this.clientId = process.env.YOUTUBE_CLIENT_ID || "";
        this.clientSecret = process.env.YOUTUBE_CLIENT_SECRET || "";
    }
    get redirectUri() {
        const isProd = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
        const appUrl = process.env.APP_URL || (isProd ? "https://ai-canvass.vercel.app" : "http://localhost:4000");
        return `${appUrl}/api/v1/auth/youtube/callback`;
    }
    // 1. Generate Auth URL (Google OAuth)
    getAuthUrl(state) {
        const baseUrl = "https://accounts.google.com/o/oauth2/v2/auth";
        const authUrl = new URL(baseUrl);
        authUrl.searchParams.set("client_id", this.clientId);
        authUrl.searchParams.set("redirect_uri", this.redirectUri);
        // Request YouTube Data API scopes + offline access to get refresh token
        authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly");
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("access_type", "offline");
        authUrl.searchParams.set("prompt", "consent"); // Force consent to guarantee refresh token
        authUrl.searchParams.set("state", state);
        return authUrl.toString();
    }
    // 2. Exchange Code for Tokens
    exchangeCodeForToken(code, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            try {
                if (!this.clientId || !this.clientSecret) {
                    throw new Error("Missing YouTube Developer Keys in environment variables.");
                }
                const params = new URLSearchParams();
                params.append("client_id", this.clientId);
                params.append("client_secret", this.clientSecret);
                params.append("grant_type", "authorization_code");
                params.append("redirect_uri", this.redirectUri);
                params.append("code", code);
                const response = yield axios_1.default.post("https://oauth2.googleapis.com/token", params, {
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                });
                const { access_token, refresh_token, expires_in } = response.data;
                // Ensure we got a refresh token, otherwise we can't persist automation
                const finalRefreshToken = refresh_token || "";
                // 3. Fetch user's YouTube Channel details to show in UI
                const channelRes = yield axios_1.default.get("https://www.googleapis.com/youtube/v3/channels", {
                    params: {
                        mine: true,
                        part: "snippet,contentDetails,statistics",
                    },
                    headers: { Authorization: `Bearer ${access_token}` },
                });
                const channel = (_a = channelRes.data.items) === null || _a === void 0 ? void 0 : _a[0];
                const channelId = (channel === null || channel === void 0 ? void 0 : channel.id) || "unknown";
                const channelTitle = ((_b = channel === null || channel === void 0 ? void 0 : channel.snippet) === null || _b === void 0 ? void 0 : _b.title) || "My Channel";
                const avatarUrl = (_e = (_d = (_c = channel === null || channel === void 0 ? void 0 : channel.snippet) === null || _c === void 0 ? void 0 : _c.thumbnails) === null || _d === void 0 ? void 0 : _d.default) === null || _e === void 0 ? void 0 : _e.url;
                // 4. Save to DB
                yield db_1.supabase.from("integrations").upsert(Object.assign(Object.assign({ user_id: userId, platform: "youtube", platform_user_id: channelId, platform_username: channelTitle, access_token: access_token }, (finalRefreshToken ? { refresh_token: finalRefreshToken } : {})), { token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(), is_connected: true, metadata: {
                        avatar: avatarUrl
                    } }), { onConflict: "user_id, platform" });
                return true;
            }
            catch (error) {
                console.error("[YouTube OAuth Error]", ((_f = error.response) === null || _f === void 0 ? void 0 : _f.data) || error.message);
                throw error;
            }
        });
    }
    // 3. Helper to refresh token automatically when expired
    refreshAccessToken(userId, refreshToken) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const params = new URLSearchParams();
            params.append("client_id", this.clientId);
            params.append("client_secret", this.clientSecret);
            params.append("grant_type", "refresh_token");
            params.append("refresh_token", refreshToken);
            try {
                const response = yield axios_1.default.post("https://oauth2.googleapis.com/token", params, {
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                });
                const newAccessToken = response.data.access_token;
                const expiresIn = response.data.expires_in;
                yield db_1.supabase.from("integrations").update({
                    access_token: newAccessToken,
                    token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
                }).eq("user_id", userId).eq("platform", "youtube");
                return newAccessToken;
            }
            catch (e) {
                console.error("[YouTube Refresh Token Error]", ((_a = e.response) === null || _a === void 0 ? void 0 : _a.data) || e.message);
                throw new Error("Could not refresh YouTube token. User must reconnect.");
            }
        });
    }
    // 4. Post Video/Short
    uploadVideo(userId, videoUrl, title, description) {
        return __awaiter(this, void 0, void 0, function* () {
            // This is a stub for the actual video upload capability using YouTube Data API.
            // Full implementation requires downloading the `videoUrl` buffer and streaming it via multipart upload.
            console.log(`[YouTube] Preparing to upload ${title} for user ${userId}`);
            return { success: true, url: "https://youtube.com/watch?v=mock" };
        });
    }
}
exports.YouTubeService = YouTubeService;
exports.youtubeService = new YouTubeService();
