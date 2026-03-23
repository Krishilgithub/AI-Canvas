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
exports.twitterService = void 0;
const twitter_api_v2_1 = require("twitter-api-v2");
const db_1 = require("../db");
class TwitterService {
    constructor() {
        this.client = new twitter_api_v2_1.TwitterApi({
            clientId: process.env.TWITTER_CLIENT_ID || '',
            clientSecret: process.env.TWITTER_CLIENT_SECRET || '',
        });
    }
    // 1. Generate Auth URL (OAuth2 PKCE)
    getAuthUrl(state) {
        const isProd = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
        const appUrl = process.env.APP_URL || (isProd ? "https://ai-canvass.vercel.app" : "http://localhost:4000");
        // Let the library generate the secure code verifier and corresponding hashed challenge
        const { url, codeVerifier } = this.client.generateOAuth2AuthLink(`${appUrl}/api/v1/auth/twitter/callback`, {
            scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
        });
        // We take their generated codeVerifier, and securely stash it in our base64 payload
        const decodedState = JSON.parse(Buffer.from(state, "base64").toString("ascii"));
        decodedState.cv = codeVerifier;
        const newState = Buffer.from(JSON.stringify(decodedState)).toString("base64");
        // Override the URL's state with our custom payload
        const authUrl = new URL(url);
        authUrl.searchParams.set('state', newState);
        return authUrl.toString();
    }
    // 2. Handle Callback and exchange code for tokens
    exchangeCodeForToken(code, codeVerifier, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
                    throw new Error("Missing Twitter Developer Keys in environment variables.");
                }
                const isProd = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
                const appUrl = process.env.APP_URL || (isProd ? "https://ai-canvass.vercel.app" : "http://localhost:4000");
                const { client: loggedClient, accessToken, refreshToken, expiresIn } = yield this.client.loginWithOAuth2({
                    code,
                    codeVerifier,
                    redirectUri: `${appUrl}/api/v1/auth/twitter/callback`,
                });
                // Save tokens to DB
                yield db_1.supabase.from('linked_accounts').upsert({
                    user_id: userId,
                    platform: 'twitter',
                    access_token: accessToken,
                    refresh_token: refreshToken || '',
                    expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
                    connection_status: 'active',
                }, { onConflict: 'user_id, platform' });
                return true;
            }
            catch (e) {
                console.error('[Twitter OAuth Error]', (e === null || e === void 0 ? void 0 : e.data) || (e === null || e === void 0 ? void 0 : e.message));
                throw new Error(((_a = e === null || e === void 0 ? void 0 : e.data) === null || _a === void 0 ? void 0 : _a.error_description) || (e === null || e === void 0 ? void 0 : e.message) || "Failed to connect to Twitter");
            }
        });
    }
    // 3. Post a Tweet
    postTweet(userId, content) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
                throw new Error("Missing Twitter Developer Keys in environment variables. Cannot post.");
            }
            // 1. Get User's Token from DB
            const { data: accounts, error } = yield db_1.supabase
                .from('linked_accounts')
                .select('access_token, refresh_token')
                .eq('user_id', userId)
                .eq('platform', 'twitter');
            if (error || !accounts || accounts.length === 0) {
                throw new Error('Twitter account not connected');
            }
            let accessToken = accounts[0].access_token;
            let refreshToken = accounts[0].refresh_token;
            // We instantiate a user client
            let userClient = new twitter_api_v2_1.TwitterApi(accessToken);
            try {
                // 2. Refresh token logic could go here if twitter-api-v2 indicates expiration, 
                // but for v2 we can just try to post and if it 401s, we refresh.
                const tweetId = yield userClient.v2.tweet(content);
                return tweetId;
            }
            catch (apiError) {
                // If unauthorized, attempt refresh
                if (apiError.code === 401 && refreshToken) {
                    console.log("Twitter token expired, refreshing...");
                    const { client: refreshedClient, accessToken: newAcc, refreshToken: newRef, expiresIn } = yield this.client.refreshOAuth2Token(refreshToken);
                    // Update DB
                    yield db_1.supabase.from('linked_accounts').update({
                        access_token: newAcc,
                        refresh_token: newRef,
                        expires_at: new Date(Date.now() + expiresIn * 1000).toISOString()
                    }).eq('user_id', userId).eq('platform', 'twitter');
                    const retryTweet = yield refreshedClient.v2.tweet(content);
                    return retryTweet;
                }
                throw apiError;
            }
        });
    }
}
exports.twitterService = new TwitterService();
