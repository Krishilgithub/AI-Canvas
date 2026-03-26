import axios from 'axios';
import { supabase } from '../db';

class InstagramService {
  private appId = process.env.INSTAGRAM_APP_ID || '';
  private appSecret = process.env.INSTAGRAM_APP_SECRET || '';
  private get redirectUri() {
    const isProd = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
    const appUrl = process.env.APP_URL || (isProd ? "https://ai-canvass.vercel.app" : "http://localhost:4000");
    return `${appUrl}/api/v1/auth/instagram/callback`;
  }

  // 1. Generate Auth URL (Instagram Basic Display or Graph API)
  getAuthUrl(state: string) {
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
  async exchangeCodeForToken(code: string, userId: string) {
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

      const response = await axios.post('https://api.instagram.com/oauth/access_token', form);
      const { access_token, user_id: igUserId } = response.data;

      // Step 2: Exchange short-lived token for long-lived token (60 days)
      const lgResponse = await axios.get('https://graph.instagram.com/access_token', {
        params: {
          grant_type: 'ig_exchange_token',
          client_secret: this.appSecret,
          access_token: access_token
        }
      });
      
      const longLivedToken = lgResponse.data.access_token;
      const expiresInSeconds = lgResponse.data.expires_in;

      // Save tokens to DB
      await supabase.from('linked_accounts').upsert(
        {
          user_id: userId,
          platform: 'instagram',
          access_token: longLivedToken,
          refresh_token: '', // IG long-lived tokens just get refreshed before expiry, no separate refresh token
          expires_at: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
          connection_status: 'active',
        },
        { onConflict: 'user_id, platform' }
      );
      
      return true;
    } catch (e: any) {
      console.error('[Instagram OAuth Error]', e.response?.data || e.message);
      throw e;
    }
  }

  // 3. Post to Instagram
  async postToInstagram(userId: string, content: string, imageUrl?: string) {
    if (!this.appId || !this.appSecret) {
       throw new Error("Missing Instagram Developer Keys in environment variables. Cannot post.");
    }

    // Official Instagram Graph API structure typically requires publishing via an Instagram Business Account linked to a Facebook Page.
    // Basic Display API cannot publish.
    // If you are using Instagram Graph API:
    // 1. Create a media container
    // 2. Publish the container.

    const { data: accounts, error } = await supabase
      .from('linked_accounts')
      .select('access_token, token_expires_at')
      .eq('user_id', userId)
      .eq('platform', 'instagram');

    if (error || !accounts || accounts.length === 0) {
      throw new Error('Instagram account not connected');
    }

    let accessToken = accounts[0].access_token;
    
    // Proactively refresh Instagram Long-Lived tokens if they expire in less than 20 days
    if (accounts[0].token_expires_at) {
      const expiresAt = new Date(accounts[0].token_expires_at).getTime();
      const twentyDaysMs = 20 * 24 * 60 * 60 * 1000;
      
      if (expiresAt - Date.now() < twentyDaysMs && expiresAt > Date.now()) {
        try {
          console.log(`[Instagram] Proactively refreshing long-lived token for user ${userId}...`);
          const refreshRes = await axios.get('https://graph.instagram.com/refresh_access_token', {
            params: {
              grant_type: 'ig_refresh_token',
              access_token: accessToken
            }
          });
          
          accessToken = refreshRes.data.access_token;
          const newExpiresInSeconds = refreshRes.data.expires_in;
          
          await supabase.from('linked_accounts').update({
            access_token: accessToken,
            token_expires_at: new Date(Date.now() + newExpiresInSeconds * 1000).toISOString()
          }).eq('user_id', userId).eq('platform', 'instagram');
        } catch (refreshErr) {
          console.error('[Instagram Proactive Refresh Error]', refreshErr);
          // If refresh fails, we still try to post with the old one since it technically hasn't expired yet
        }
      }
    }

    try {
      // First, we need the user's instagram account ID using Graph API.
      // This is a complex flow if using Business accounts. For this demonstration, we assume we have the ID or fetch it:
      const accountRes = await axios.get(`https://graph.instagram.com/me?fields=id&access_token=${accessToken}`);
      const igId = accountRes.data.id;

      // To post via actual Graph API (requires connected FB page & IG Business Account):
      // 1. Create Container
      const containerRes = await axios.post(`https://graph.facebook.com/v19.0/${igId}/media`, {
        image_url: imageUrl || 'https://example.com/placeholder-needed.jpg', // IG requires images
        caption: content,
        access_token: accessToken
      });
      
      const creationId = containerRes.data.id;

      // 2. Publish Container
      const publishRes = await axios.post(`https://graph.facebook.com/v19.0/${igId}/media_publish`, {
        creation_id: creationId,
        access_token: accessToken
      });

      return publishRes.data.id;
    } catch (apiError: any) {
      console.error('[Instagram Publish Error]', apiError.response?.data || apiError.message);
      throw apiError;
    }
  }
}

export const instagramService = new InstagramService();
