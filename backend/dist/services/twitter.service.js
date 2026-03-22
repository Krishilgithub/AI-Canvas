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
exports.twitterService = void 0;
const twitter_api_v2_1 = require("twitter-api-v2");
const db_1 = require("../db");
const crypto_1 = __importDefault(require("crypto"));
class TwitterService {
    constructor() {
        this.client = new twitter_api_v2_1.TwitterApi({
            clientId: process.env.TWITTER_CLIENT_ID || '',
            clientSecret: process.env.TWITTER_CLIENT_SECRET || '',
        });
    }
    // 1. Generate Auth URL (OAuth2 PKCE)
    getAuthUrl(state) {
        // Generate a secure code verifier and challenge
        const codeVerifier = crypto_1.default.randomBytes(32).toString('base64url');
        // In OAuth2 PKCE, we must store the codeVerifier temporarily to verify the callback.
        // For simplicity without a session store in this context, we will append it to the state payload.
        // Ideally this is stored in a secure server-side session.
        const decodedState = JSON.parse(Buffer.from(state, "base64").toString("ascii"));
        decodedState.cv = codeVerifier;
        const newState = Buffer.from(JSON.stringify(decodedState)).toString("base64");
        const { url, codeVerifier: _cv, state: _s } = this.client.generateOAuth2AuthLink(`${process.env.APP_URL || 'http://localhost:4000'}/api/v1/auth/twitter/callback`, {
            scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
            state: newState,
        });
        // We override their generated state to pass our user_id + cv encoded state
        const authUrl = new URL(url);
        authUrl.searchParams.set('state', newState);
        return authUrl.toString();
    }
    // 2. Handle Callback and exchange code for tokens
    exchangeCodeForToken(code, codeVerifier, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
                    throw new Error("Missing Twitter Developer Keys in environment variables.");
                }
                const { client: loggedClient, accessToken, refreshToken, expiresIn } = yield this.client.loginWithOAuth2({
                    code,
                    codeVerifier,
                    redirectUri: `${process.env.APP_URL || 'http://localhost:4000'}/api/v1/auth/twitter/callback`,
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
                console.error('[Twitter OAuth Error]', e);
                throw e;
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
