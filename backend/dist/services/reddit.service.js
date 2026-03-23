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
exports.redditService = exports.RedditService = void 0;
const axios_1 = __importDefault(require("axios"));
const db_1 = require("../db");
class RedditService {
    constructor() {
        this.clientId = process.env.REDDIT_CLIENT_ID;
        this.clientSecret = process.env.REDDIT_CLIENT_SECRET;
    }
    get redirectUri() {
        const isProd = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
        const appUrl = process.env.APP_URL || (isProd ? "https://ai-canvass.vercel.app" : "http://localhost:4000");
        return `${appUrl}/api/v1/auth/reddit/callback`;
    }
    getAuthUrl(state) {
        if (!this.clientId)
            throw new Error("Missing Reddit Client ID");
        // Reddit requires scopes. We need identity to get username and submit to post.
        const scopes = 'identity submit';
        // For Reddit OAuth:
        // https://github.com/reddit-archive/reddit/wiki/OAuth2
        const url = new URL('https://www.reddit.com/api/v1/authorize');
        url.searchParams.append('client_id', this.clientId);
        url.searchParams.append('response_type', 'code');
        url.searchParams.append('state', state);
        url.searchParams.append('redirect_uri', this.redirectUri);
        url.searchParams.append('duration', 'permanent'); // Gets a refresh token
        url.searchParams.append('scope', scopes);
        return url.toString();
    }
    exchangeCodeForToken(code, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (!this.clientId || !this.clientSecret) {
                throw new Error("Missing Reddit Credentials");
            }
            try {
                const params = new URLSearchParams();
                params.append('grant_type', 'authorization_code');
                params.append('code', code);
                params.append('redirect_uri', this.redirectUri);
                const response = yield axios_1.default.post('https://www.reddit.com/api/v1/access_token', params, {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
                    }
                });
                const accessToken = response.data.access_token;
                const refreshToken = response.data.refresh_token;
                const expiresIn = response.data.expires_in;
                // Ensure we got the tokens
                if (!accessToken)
                    throw new Error("Failed to get Reddit access token");
                // Optional: Fetch user's Reddit username to store in metadata
                const meResponse = yield axios_1.default.get('https://oauth.reddit.com/api/v1/me', {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                const username = meResponse.data.name;
                yield db_1.supabase.from('linked_accounts').upsert({
                    user_id: userId,
                    platform: 'reddit',
                    platform_username: username,
                    access_token: accessToken,
                    refresh_token: refreshToken || '', // Reddit sometimes doesn't return this if not requested correctly, but we asked for permanent duration
                    expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
                    status: 'connected',
                }, { onConflict: 'user_id, platform' });
                return true;
            }
            catch (e) {
                console.error('[Reddit OAuth Error]', ((_a = e.response) === null || _a === void 0 ? void 0 : _a.data) || e.message);
                throw e;
            }
        });
    }
    refreshAccessToken(userId, currentRefreshToken) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.clientId || !this.clientSecret)
                throw new Error("Missing Reddit Credentials");
            const params = new URLSearchParams();
            params.append('grant_type', 'refresh_token');
            params.append('refresh_token', currentRefreshToken);
            const response = yield axios_1.default.post('https://www.reddit.com/api/v1/access_token', params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
                }
            });
            const newAccessToken = response.data.access_token;
            // Reddit might not return a new refresh token; if so, keep the old one.
            const newRefreshToken = response.data.refresh_token || currentRefreshToken;
            const expiresIn = response.data.expires_in;
            yield db_1.supabase.from('linked_accounts').update({
                access_token: newAccessToken,
                refresh_token: newRefreshToken,
                expires_at: new Date(Date.now() + expiresIn * 1000).toISOString()
            }).eq('user_id', userId).eq('platform', 'reddit');
            return newAccessToken;
        });
    }
    postToReddit(userId, content) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const { data: accounts, error } = yield db_1.supabase
                .from('linked_accounts')
                .select('access_token, refresh_token, expires_at')
                .eq('user_id', userId)
                .eq('platform', 'reddit');
            if (error || !accounts || accounts.length === 0) {
                throw new Error('Reddit account not connected');
            }
            let { access_token, refresh_token, expires_at } = accounts[0];
            // Check expiration and refresh if needed
            if (new Date(expires_at) < new Date() && refresh_token) {
                access_token = yield this.refreshAccessToken(userId, refresh_token);
            }
            try {
                // For Reddit, you must post to a specific subreddit. 
                // In a real app, this should be selected by the user and saved in the post metadata.
                // For demonstration, we'll try to post to a test subreddit.
                const params = new URLSearchParams();
                params.append('sr', 'test'); // target subreddit
                params.append('kind', 'self'); // text post
                params.append('title', content.split('\n')[0].substring(0, 300));
                params.append('text', content);
                params.append('api_type', 'json'); // Always request JSON format
                params.append('resubmit', 'true'); // Allow resubmitting same content in dev/testing
                const res = yield axios_1.default.post('https://oauth.reddit.com/api/submit', params, {
                    headers: {
                        'Authorization': `Bearer ${access_token}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'User-Agent': 'webapp:ai-saas:v1.0 (by /u/ai-saas-bot)'
                    }
                });
                const jsonData = (_a = res.data) === null || _a === void 0 ? void 0 : _a.json;
                if (((_b = jsonData === null || jsonData === void 0 ? void 0 : jsonData.errors) === null || _b === void 0 ? void 0 : _b.length) > 0) {
                    throw new Error(JSON.stringify(jsonData.errors));
                }
                const postUrl = ((_c = jsonData === null || jsonData === void 0 ? void 0 : jsonData.data) === null || _c === void 0 ? void 0 : _c.url) || 'Unknown URL';
                return { success: true, url: postUrl };
            }
            catch (apiError) {
                console.error('[Reddit Post Error]', ((_d = apiError.response) === null || _d === void 0 ? void 0 : _d.data) || apiError.message);
                throw apiError;
            }
        });
    }
}
exports.RedditService = RedditService;
exports.redditService = new RedditService();
