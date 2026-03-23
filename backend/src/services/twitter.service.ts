import { TwitterApi } from 'twitter-api-v2';
import { supabase } from '../db';
import crypto from 'crypto';

class TwitterService {
  private client: TwitterApi;

  constructor() {
    this.client = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID || '',
      clientSecret: process.env.TWITTER_CLIENT_SECRET || '',
    });
  }

  // 1. Generate Auth URL (OAuth2 PKCE)
  getAuthUrl(state: string) {
    const isProd = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
    const appUrl = process.env.APP_URL || (isProd ? "https://ai-canvass.vercel.app" : "http://localhost:4000");

    // Let the library generate the secure code verifier and corresponding hashed challenge
    const { url, codeVerifier } = this.client.generateOAuth2AuthLink(
      `${appUrl}/api/v1/auth/twitter/callback`,
      {
        scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
      }
    );

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
  async exchangeCodeForToken(code: string, codeVerifier: string, userId: string) {
    try {
      if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
         throw new Error("Missing Twitter Developer Keys in environment variables.");
      }

      const isProd = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
      const appUrl = process.env.APP_URL || (isProd ? "https://ai-canvass.vercel.app" : "http://localhost:4000");

      const { client: loggedClient, accessToken, refreshToken, expiresIn } = await this.client.loginWithOAuth2({
        code,
        codeVerifier,
        redirectUri: `${appUrl}/api/v1/auth/twitter/callback`,
      });

      // Save tokens to DB
      await supabase.from('linked_accounts').upsert(
        {
          user_id: userId,
          platform: 'twitter',
          access_token: accessToken,
          refresh_token: refreshToken || '',
          expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
          connection_status: 'active',
        },
        { onConflict: 'user_id, platform' }
      );
      
      return true;
    } catch (e: any) {
      console.error('[Twitter OAuth Error]', e?.data || e?.message);
      throw new Error(e?.data?.error_description || e?.message || "Failed to connect to Twitter");
    }
  }

  // 3. Post a Tweet
  async postTweet(userId: string, content: string) {
    if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
       throw new Error("Missing Twitter Developer Keys in environment variables. Cannot post.");
    }

    // 1. Get User's Token from DB
    const { data: accounts, error } = await supabase
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
    let userClient = new TwitterApi(accessToken);

    try {
      // 2. Refresh token logic could go here if twitter-api-v2 indicates expiration, 
      // but for v2 we can just try to post and if it 401s, we refresh.
      const tweetId = await userClient.v2.tweet(content);
      return tweetId;
    } catch (apiError: any) {
      // If unauthorized, attempt refresh
      if (apiError.code === 401 && refreshToken) {
          console.log("Twitter token expired, refreshing...");
          const { client: refreshedClient, accessToken: newAcc, refreshToken: newRef, expiresIn } = await this.client.refreshOAuth2Token(refreshToken);
          
          // Update DB
          await supabase.from('linked_accounts').update({
             access_token: newAcc,
             refresh_token: newRef,
             expires_at: new Date(Date.now() + expiresIn * 1000).toISOString()
          }).eq('user_id', userId).eq('platform', 'twitter');

          const retryTweet = await refreshedClient.v2.tweet(content);
          return retryTweet;
      }
      throw apiError;
    }
  }
}

export const twitterService = new TwitterService();
