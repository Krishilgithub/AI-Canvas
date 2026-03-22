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
exports.linkedInService = exports.RealLinkedInService = exports.MockLinkedInService = void 0;
const constants_1 = require("../constants");
const db_1 = require("../db");
const axios_1 = __importDefault(require("axios"));
class MockLinkedInService {
    getAuthUrl(state) {
        return `http://localhost:3000/api/auth/callback/linkedin?code=mock_code_123&state=${state}`;
    }
    connectAccount(userId, authCode) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`[MOCK] Connecting LinkedIn account for user ${userId} with code ${authCode}`);
            // Simulate API delay
            yield new Promise((resolve) => setTimeout(resolve, 1500));
            // Return mock token data
            const mockData = {
                user_id: userId,
                platform: constants_1.Platform.LINKEDIN,
                platform_user_id: `urn:li:person:MOCK_${Math.random().toString(36).substring(7)}`,
                platform_username: "Mock User",
                access_token: "mock_access_token_" + Date.now(),
                refresh_token: "mock_refresh_token_" + Date.now(),
                status: "connected",
                token_expires_at: new Date(Date.now() + 3600 * 1000 * 60).toISOString(), // 60 days
            };
            // Store in DB
            const { data, error } = yield db_1.supabase
                .from("linked_accounts")
                .upsert(mockData, { onConflict: "user_id, platform" })
                .select()
                .single();
            if (error)
                throw new Error(error.message);
            return data;
        });
    }
    getProfile(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Return connection status from DB
            const { data } = yield db_1.supabase
                .from("linked_accounts")
                .select("*")
                .eq("user_id", userId)
                .eq("platform", constants_1.Platform.LINKEDIN)
                .single();
            return data || null;
        });
    }
    createPost(userId_1, content_1) {
        return __awaiter(this, arguments, void 0, function* (userId, content, mediaUrls = []) {
            yield new Promise((resolve) => setTimeout(resolve, 2000));
            // Simulate success
            return {
                success: true,
                platform_post_id: `urn:li:share:MOCK_${Date.now()}`,
                url: `https://linkedin.com/feed/update/urn:li:share:MOCK_${Date.now()}`,
            };
        });
    }
}
exports.MockLinkedInService = MockLinkedInService;
// Real Implementation
class RealLinkedInService {
    constructor() {
        this.clientId = process.env.LINKEDIN_CLIENT_ID;
        this.clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
        this.redirectUri = process.env.LINKEDIN_REDIRECT_URI || `${process.env.APP_URL || 'http://localhost:4000'}/api/v1/auth/linkedin/callback`;
    }
    getAuthUrl(state) {
        const scope = encodeURIComponent("openid profile w_member_social email");
        return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri || "")}&state=${state}&scope=${scope}`;
    }
    connectAccount(userId, authCode) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.clientId || !this.clientSecret)
                throw new Error("LinkedIn credentials missing");
            // 1. Exchange Code for Token
            const params = new URLSearchParams();
            params.append("grant_type", "authorization_code");
            params.append("code", authCode);
            params.append("redirect_uri", this.redirectUri || "");
            params.append("client_id", this.clientId);
            params.append("client_secret", this.clientSecret);
            const tokenRes = yield axios_1.default.post("https://www.linkedin.com/oauth/v2/accessToken", params, {
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
            });
            const accessToken = tokenRes.data.access_token;
            const expiresIn = tokenRes.data.expires_in;
            const refreshToken = tokenRes.data.refresh_token;
            const refreshTokenExpiresIn = tokenRes.data.refresh_token_expires_in;
            // 2. Fetch User Profile
            const profileRes = yield axios_1.default.get("https://api.linkedin.com/v2/userinfo", {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const profile = profileRes.data;
            // profile.sub is usage as ID
            // 3. Store in DB
            const accountData = {
                user_id: userId,
                platform: constants_1.Platform.LINKEDIN,
                platform_user_id: profile.sub,
                platform_username: profile.name,
                access_token: accessToken,
                refresh_token: refreshToken,
                status: "connected",
                token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
                metadata: {
                    avatar: profile.picture,
                    email: profile.email,
                },
            };
            const { data, error } = yield db_1.supabase
                .from("linked_accounts")
                .upsert(accountData, { onConflict: "user_id, platform" })
                .select()
                .single();
            if (error)
                throw new Error(error.message);
            return data;
        });
    }
    getProfile(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Just check DB for connection
            const { data } = yield db_1.supabase
                .from("linked_accounts")
                .select("*")
                .eq("user_id", userId)
                .eq("platform", constants_1.Platform.LINKEDIN)
                .single();
            return data || null;
        });
    }
    createPost(userId_1, content_1) {
        return __awaiter(this, arguments, void 0, function* (userId, content, mediaUrls = []) {
            var _a, _b, _c, _d, _e, _f, _g;
            // Fetch user account
            const { data: account } = yield db_1.supabase
                .from("linked_accounts")
                .select("access_token, platform_user_id")
                .eq("user_id", userId)
                .eq("platform", constants_1.Platform.LINKEDIN)
                .single();
            if (!account || !account.access_token)
                throw new Error("LinkedIn account not connected");
            // NATIVE PUBLISHING
            const body = {
                author: `urn:li:person:${account.platform_user_id}`,
                lifecycleState: "PUBLISHED",
                specificContent: {
                    "com.linkedin.ugc.ShareContent": {
                        shareCommentary: {
                            text: content,
                        },
                        shareMediaCategory: "NONE",
                    },
                },
                visibility: {
                    "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
                },
            };
            try {
                const res = yield axios_1.default.post("https://api.linkedin.com/v2/ugcPosts", body, {
                    headers: {
                        Authorization: `Bearer ${account.access_token}`,
                        "X-Restli-Protocol-Version": "2.0.0",
                    },
                });
                const postId = res.headers["x-restli-id"] || ((_a = res.data) === null || _a === void 0 ? void 0 : _a.id);
                return {
                    success: true,
                    platform_post_id: postId,
                    url: `https://www.linkedin.com/feed/update/${postId}`,
                };
            }
            catch (error) {
                console.error("[LinkedIn API Error]:", ((_b = error.response) === null || _b === void 0 ? void 0 : _b.data) || error.message);
                const errMsg = ((_d = (_c = error.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.message) || "";
                if (errMsg.includes("Content is a duplicate of")) {
                    const match = errMsg.match(/(urn:li:share:\d+)/);
                    if (match) {
                        return {
                            success: true,
                            platform_post_id: match[1],
                            url: `https://www.linkedin.com/feed/update/${match[1]}`,
                        };
                    }
                }
                throw new Error(((_f = (_e = error.response) === null || _e === void 0 ? void 0 : _e.data) === null || _f === void 0 ? void 0 : _f.message) || ((_g = error.response) === null || _g === void 0 ? void 0 : _g.data) || error.message);
            }
        });
    }
}
exports.RealLinkedInService = RealLinkedInService;
// Factory to switch
exports.linkedInService = process.env.USE_REAL_LINKEDIN === "true"
    ? new RealLinkedInService()
    : new MockLinkedInService();
