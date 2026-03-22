import axios from 'axios';
import { supabase } from '../db';

export class SlackService {
  private clientId = process.env.SLACK_CLIENT_ID;
  private clientSecret = process.env.SLACK_CLIENT_SECRET;
  private get redirectUri() {
    const isProd = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
    const appUrl = process.env.APP_URL || (isProd ? "https://ai-canvass.vercel.app" : "http://localhost:4000");
    return `${appUrl}/api/v1/auth/slack/callback`;
  }

  // 1. Generate Auth URL
  getAuthUrl(state: string) {
    if (!this.clientId) throw new Error("Missing Slack Client ID");
    // We need chat:write to send messages. incoming-webhook is also popular but we'll use chat:write as user or bot.
    const scopes = 'chat:write,chat:write.public,channels:read,groups:read';
    
    // In Slack, you can request scopes as a bot with `scope`, or as a user with `user_scope`. 
    // Usually for SaaS posting on behalf of a user, we use user_scope or we install a bot.
    // Let's request standard bot scopes to post into their workspace.
    const url = `https://slack.com/oauth/v2/authorize?client_id=${this.clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(this.redirectUri)}&state=${encodeURIComponent(state)}`;
    return url;
  }

  // 2. Handle Callback
  async exchangeCodeForToken(code: string, userId: string) {
    if (!this.clientId || !this.clientSecret) {
      throw new Error("Missing Slack Credentials");
    }

    try {
      const params = new URLSearchParams();
      params.append('code', code);
      params.append('client_id', this.clientId);
      params.append('client_secret', this.clientSecret);
      params.append('redirect_uri', this.redirectUri);

      const response = await axios.post('https://slack.com/api/oauth.v2.access', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      if (!response.data.ok) {
        throw new Error(`Slack OAuth Error: ${response.data.error}`);
      }

      // Slack returns access_token. For bot tokens, it's usually response.data.access_token.
      // If requested user_scope, there's response.data.authed_user.access_token.
      const accessToken = response.data.access_token;
      
      // Store in DB
      await supabase.from('linked_accounts').upsert(
        {
          user_id: userId,
          platform: 'slack',
          access_token: accessToken,
          refresh_token: '', // Slack tokens generally don't expire unless rotated/revoked
          status: 'connected',
          // We can store team info in metadata
          metadata: {
            team_id: response.data.team?.id,
            team_name: response.data.team?.name,
            incoming_webhook: response.data.incoming_webhook?.url
          }
        },
        { onConflict: 'user_id, platform' }
      );

      return true;
    } catch (e: any) {
      console.error('[Slack OAuth Error]', e.response?.data || e.message);
      throw e;
    }
  }

  // 3. Post a Message
  async sendMessage(userId: string, content: string) {
    // 1. Get User's Token from DB
    const { data: accounts, error } = await supabase
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
        await axios.post(metadata.incoming_webhook, { text: content });
        return { success: true };
      } else {
        // Use chat.postMessage (requires a channel ID, we'll try #general)
        // Note: For a real SaaS, you'd fetch channels and let the user pick one, saving the channel_id to their profile.
        const res = await axios.post('https://slack.com/api/chat.postMessage', {
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
    } catch (apiError: any) {
      console.error('[Slack Post Error]', apiError.response?.data || apiError.message);
      throw apiError;
    }
  }
}

export const slackService = new SlackService();
