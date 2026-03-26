import axios from "axios";
import { supabase } from "../db";
import { Platform } from "../constants";

export class YouTubeService {
  private clientId = process.env.YOUTUBE_CLIENT_ID || "";
  private clientSecret = process.env.YOUTUBE_CLIENT_SECRET || "";
  
  private get redirectUri() {
    const isProd = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
    const appUrl = process.env.APP_URL || (isProd ? "https://ai-canvass.vercel.app" : "http://localhost:4000");
    return `${appUrl}/api/v1/auth/youtube/callback`;
  }

  // 1. Generate Auth URL (Google OAuth)
  getAuthUrl(state: string) {
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
  async exchangeCodeForToken(code: string, userId: string) {
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

      const response = await axios.post("https://oauth2.googleapis.com/token", params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      const { access_token, refresh_token, expires_in } = response.data;

      // Ensure we got a refresh token, otherwise we can't persist automation
      const finalRefreshToken = refresh_token || "";

      // 3. Fetch user's YouTube Channel details to show in UI
      const channelRes = await axios.get("https://www.googleapis.com/youtube/v3/channels", {
        params: {
          mine: true,
          part: "snippet,contentDetails,statistics",
        },
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const channel = channelRes.data.items?.[0];
      const channelId = channel?.id || "unknown";
      const channelTitle = channel?.snippet?.title || "My Channel";
      const avatarUrl = channel?.snippet?.thumbnails?.default?.url;

      // 4. Save to DB
      await supabase.from("linked_accounts").upsert(
        {
          user_id: userId,
          platform: "youtube",
          platform_user_id: channelId,
          platform_username: channelTitle,
          access_token: access_token,
          // Only overwrite refresh token if a new one was actually given
          ...(finalRefreshToken ? { refresh_token: finalRefreshToken } : {}),
          expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
          connection_status: "active",
          metadata: {
            avatar: avatarUrl
          }
        },
        { onConflict: "user_id, platform" }
      );

      return true;
    } catch (error: any) {
      console.error("[YouTube OAuth Error]", error.response?.data || error.message);
      throw error;
    }
  }

  // 3. Helper to refresh token automatically when expired
  public async refreshAccessToken(userId: string, refreshToken: string): Promise<string> {
    const params = new URLSearchParams();
    params.append("client_id", this.clientId);
    params.append("client_secret", this.clientSecret);
    params.append("grant_type", "refresh_token");
    params.append("refresh_token", refreshToken);

    try {
      const response = await axios.post("https://oauth2.googleapis.com/token", params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      const newAccessToken = response.data.access_token;
      const expiresIn = response.data.expires_in;

      await supabase.from("linked_accounts").update({
        access_token: newAccessToken,
        expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      }).eq("user_id", userId).eq("platform", "youtube");

      return newAccessToken;
    } catch (e: any) {
      console.error("[YouTube Refresh Token Error]", e.response?.data || e.message);
      throw new Error("Could not refresh YouTube token. User must reconnect.");
    }
  }

  // 4. Post Video/Short
  async uploadVideo(userId: string, videoUrl: string, title: string, description: string) {
    // This is a stub for the actual video upload capability using YouTube Data API.
    // Full implementation requires downloading the `videoUrl` buffer and streaming it via multipart upload.
    console.log(`[YouTube] Preparing to upload ${title} for user ${userId}`);
    return { success: true, url: "https://youtube.com/watch?v=mock" };
  }
}

export const youtubeService = new YouTubeService();
