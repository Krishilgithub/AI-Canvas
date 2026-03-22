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
exports.slackService = exports.SlackService = void 0;
const axios_1 = __importDefault(require("axios"));
const db_1 = require("../db");
class SlackService {
    constructor() {
        this.clientId = process.env.SLACK_CLIENT_ID;
        this.clientSecret = process.env.SLACK_CLIENT_SECRET;
        this.redirectUri = `${process.env.APP_URL || 'http://localhost:4000'}/api/v1/auth/slack/callback`;
    }
    // 1. Generate Auth URL
    getAuthUrl(state) {
        if (!this.clientId)
            throw new Error("Missing Slack Client ID");
        // We need chat:write to send messages. incoming-webhook is also popular but we'll use chat:write as user or bot.
        const scopes = 'chat:write,chat:write.public,channels:read,groups:read';
        // In Slack, you can request scopes as a bot with `scope`, or as a user with `user_scope`. 
        // Usually for SaaS posting on behalf of a user, we use user_scope or we install a bot.
        // Let's request standard bot scopes to post into their workspace.
        const url = `https://slack.com/oauth/v2/authorize?client_id=${this.clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(this.redirectUri)}&state=${encodeURIComponent(state)}`;
        return url;
    }
    // 2. Handle Callback
    exchangeCodeForToken(code, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            if (!this.clientId || !this.clientSecret) {
                throw new Error("Missing Slack Credentials");
            }
            try {
                const params = new URLSearchParams();
                params.append('code', code);
                params.append('client_id', this.clientId);
                params.append('client_secret', this.clientSecret);
                params.append('redirect_uri', this.redirectUri);
                const response = yield axios_1.default.post('https://slack.com/api/oauth.v2.access', params, {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                });
                if (!response.data.ok) {
                    throw new Error(`Slack OAuth Error: ${response.data.error}`);
                }
                // Slack returns access_token. For bot tokens, it's usually response.data.access_token.
                // If requested user_scope, there's response.data.authed_user.access_token.
                const accessToken = response.data.access_token;
                // Store in DB
                yield db_1.supabase.from('linked_accounts').upsert({
                    user_id: userId,
                    platform: 'slack',
                    access_token: accessToken,
                    refresh_token: '', // Slack tokens generally don't expire unless rotated/revoked
                    status: 'connected',
                    // We can store team info in metadata
                    metadata: {
                        team_id: (_a = response.data.team) === null || _a === void 0 ? void 0 : _a.id,
                        team_name: (_b = response.data.team) === null || _b === void 0 ? void 0 : _b.name,
                        incoming_webhook: (_c = response.data.incoming_webhook) === null || _c === void 0 ? void 0 : _c.url
                    }
                }, { onConflict: 'user_id, platform' });
                return true;
            }
            catch (e) {
                console.error('[Slack OAuth Error]', ((_d = e.response) === null || _d === void 0 ? void 0 : _d.data) || e.message);
                throw e;
            }
        });
    }
    // 3. Post a Message
    sendMessage(userId, content) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            // 1. Get User's Token from DB
            const { data: accounts, error } = yield db_1.supabase
                .from('linked_accounts')
                .select('access_token, metadata')
                .eq('user_id', userId)
                .eq('platform', 'slack');
            if (error || !accounts || accounts.length === 0) {
                throw new Error('Slack workspace not connected');
            }
            const { access_token, metadata } = accounts[0];
            try {
                // By default we'll post to #general, but ideally the user configured a channel
                // We will try posting to a default channel or the one from the incoming webhook if available.
                if (metadata && metadata.incoming_webhook) {
                    // Use incoming webhook if available
                    yield axios_1.default.post(metadata.incoming_webhook, { text: content });
                    return { success: true };
                }
                else {
                    // Use chat.postMessage (requires a channel ID, we'll try #general)
                    // Note: For a real SaaS, you'd fetch channels and let the user pick one, saving the channel_id to their profile.
                    const res = yield axios_1.default.post('https://slack.com/api/chat.postMessage', {
                        channel: '#general',
                        text: content
                    }, {
                        headers: {
                            'Authorization': `Bearer ${access_token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    if (!res.data.ok) {
                        // Channel not found is a common error if #general doesn't exist or bot isn't in it
                        throw new Error(res.data.error);
                    }
                    return { success: true, ts: res.data.ts };
                }
            }
            catch (apiError) {
                console.error('[Slack Post Error]', ((_a = apiError.response) === null || _a === void 0 ? void 0 : _a.data) || apiError.message);
                throw apiError;
            }
        });
    }
}
exports.SlackService = SlackService;
exports.slackService = new SlackService();
