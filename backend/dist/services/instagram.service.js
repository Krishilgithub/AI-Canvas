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
exports.instagramService = void 0;
const axios_1 = __importDefault(require("axios"));
const db_1 = require("../db");
class InstagramService {
    constructor() {
        this.appId = process.env.INSTAGRAM_APP_ID || '';
        this.appSecret = process.env.INSTAGRAM_APP_SECRET || '';
    }
    get redirectUri() {
        const isProd = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
        const appUrl = process.env.APP_URL || (isProd ? "https://ai-canvass.vercel.app" : "http://localhost:4000");
        return `${appUrl}/api/v1/auth/instagram/callback`;
    }
    // 1. Generate Auth URL (Instagram Basic Display or Graph API)
    getAuthUrl(state) {
        // Determine the base URL based on if you use Basic Display API vs Facebook Login for Business
        // We assume standard Instagram Basic Display for this integration
        const baseUrl = "https://api.instagram.com/oauth/authorize";
        const authUrl = new URL(baseUrl);
        authUrl.searchParams.set('client_id', this.appId);
        authUrl.searchParams.set('redirect_uri', this.redirectUri);
        authUrl.searchParams.set('scope', 'user_profile,user_media');
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('state', state);
        return authUrl.toString();
    }
    // 2. Handle Callback and exchange code for tokens
    exchangeCodeForToken(code, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                if (!this.appId || !this.appSecret) {
                    throw new Error("Missing Instagram Developer Keys in environment variables.");
                }
                // Step 1: Exchange code for short-lived access token
                const form = new URLSearchParams();
                form.append('client_id', this.appId);
                form.append('client_secret', this.appSecret);
                form.append('grant_type', 'authorization_code');
                form.append('redirect_uri', this.redirectUri);
                form.append('code', code);
                const response = yield axios_1.default.post('https://api.instagram.com/oauth/access_token', form);
                const { access_token, user_id: igUserId } = response.data;
                // Step 2: Exchange short-lived token for long-lived token (60 days)
                const lgResponse = yield axios_1.default.get('https://graph.instagram.com/access_token', {
                    params: {
                        grant_type: 'ig_exchange_token',
                        client_secret: this.appSecret,
                        access_token: access_token
                    }
                });
                const longLivedToken = lgResponse.data.access_token;
                const expiresInSeconds = lgResponse.data.expires_in;
                // Save tokens to DB
                yield db_1.supabase.from('linked_accounts').upsert({
                    user_id: userId,
                    platform: 'instagram',
                    access_token: longLivedToken,
                    refresh_token: '', // IG long-lived tokens just get refreshed before expiry, no separate refresh token
                    expires_at: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
                    connection_status: 'active',
                }, { onConflict: 'user_id, platform' });
                return true;
            }
            catch (e) {
                console.error('[Instagram OAuth Error]', ((_a = e.response) === null || _a === void 0 ? void 0 : _a.data) || e.message);
                throw e;
            }
        });
    }
    // 3. Post to Instagram
    postToInstagram(userId, content, imageUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (!this.appId || !this.appSecret) {
                throw new Error("Missing Instagram Developer Keys in environment variables. Cannot post.");
            }
            // Official Instagram Graph API structure typically requires publishing via an Instagram Business Account linked to a Facebook Page.
            // Basic Display API cannot publish.
            // If you are using Instagram Graph API:
            // 1. Create a media container
            // 2. Publish the container.
            const { data: accounts, error } = yield db_1.supabase
                .from('linked_accounts')
                .select('access_token')
                .eq('user_id', userId)
                .eq('platform', 'instagram');
            if (error || !accounts || accounts.length === 0) {
                throw new Error('Instagram account not connected');
            }
            const accessToken = accounts[0].access_token;
            try {
                // First, we need the user's instagram account ID using Graph API.
                // This is a complex flow if using Business accounts. For this demonstration, we assume we have the ID or fetch it:
                const accountRes = yield axios_1.default.get(`https://graph.instagram.com/me?fields=id&access_token=${accessToken}`);
                const igId = accountRes.data.id;
                // To post via actual Graph API (requires connected FB page & IG Business Account):
                // 1. Create Container
                const containerRes = yield axios_1.default.post(`https://graph.facebook.com/v19.0/${igId}/media`, {
                    image_url: imageUrl || 'https://example.com/placeholder-needed.jpg', // IG requires images
                    caption: content,
                    access_token: accessToken
                });
                const creationId = containerRes.data.id;
                // 2. Publish Container
                const publishRes = yield axios_1.default.post(`https://graph.facebook.com/v19.0/${igId}/media_publish`, {
                    creation_id: creationId,
                    access_token: accessToken
                });
                return publishRes.data.id;
            }
            catch (apiError) {
                console.error('[Instagram Publish Error]', ((_a = apiError.response) === null || _a === void 0 ? void 0 : _a.data) || apiError.message);
                throw apiError;
            }
        });
    }
}
exports.instagramService = new InstagramService();
