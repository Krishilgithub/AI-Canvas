import { Platform } from "../constants";
import { supabase } from "../db";

import axios from "axios";

// Interface abstracts the posting logic so we can swap Mock vs Real easily
export interface ILinkedInService {
  getAuthUrl(state: string): string;
  connectAccount(userId: string, authCode: string): Promise<any>;
  getProfile(userId: string): Promise<any>;
  createPost(
    userId: string,
    content: string,
    mediaUrls?: string[],
  ): Promise<any>;
}

export class LinkedInService implements ILinkedInService {
  private clientId = process.env.LINKEDIN_CLIENT_ID || "";
  private clientSecret = process.env.LINKEDIN_CLIENT_SECRET || "";
  private get redirectUri() {
    const isProd = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
    const appUrl = process.env.APP_URL || (isProd ? "https://ai-canvass.vercel.app" : "http://localhost:4000");
    return `${appUrl}/api/v1/auth/linkedin/callback`;
  }

  getAuthUrl(state: string): string {
    const scope = encodeURIComponent("openid profile w_member_social email");
    return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri || "")}&state=${state}&scope=${scope}`;
  }

  async connectAccount(userId: string, authCode: string) {
    if (!this.clientId || !this.clientSecret)
      throw new Error("LinkedIn credentials missing");

    // 1. Exchange Code for Token
    const params = new URLSearchParams();
    params.append("grant_type", "authorization_code");
    params.append("code", authCode);
    params.append("redirect_uri", this.redirectUri || "");
    params.append("client_id", this.clientId);
    params.append("client_secret", this.clientSecret);

    const tokenRes = await axios.post(
      "https://www.linkedin.com/oauth/v2/accessToken",
      params,
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      },
    );

    const accessToken = tokenRes.data.access_token;
    const expiresIn = tokenRes.data.expires_in;
    const refreshToken = tokenRes.data.refresh_token;
    const refreshTokenExpiresIn = tokenRes.data.refresh_token_expires_in;

    // 2. Fetch User Profile
    const profileRes = await axios.get("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const profile = profileRes.data;
    // profile.sub is usage as ID

    // 3. Store in DB
    const accountData = {
      user_id: userId,
      platform: Platform.LINKEDIN,
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

    const { data, error } = await supabase
      .from("linked_accounts")
      .upsert(accountData, { onConflict: "user_id, platform" })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async getProfile(userId: string) {
    // Just check DB for connection
    const { data } = await supabase
      .from("linked_accounts")
      .select("*")
      .eq("user_id", userId)
      .eq("platform", Platform.LINKEDIN)
      .single();

    return data || null;
  }

  private async _refreshAccessToken(userId: string, refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    const params = new URLSearchParams();
    params.append("grant_type", "refresh_token");
    params.append("refresh_token", refreshToken);
    params.append("client_id", this.clientId);
    params.append("client_secret", this.clientSecret);
    
    const refreshRes = await axios.post("https://www.linkedin.com/oauth/v2/accessToken", params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const newAccessToken = refreshRes.data.access_token;
    const newExpiresIn = refreshRes.data.expires_in;

    await supabase.from("linked_accounts").update({
      access_token: newAccessToken,
      token_expires_at: new Date(Date.now() + newExpiresIn * 1000).toISOString(),
    }).eq("user_id", userId).eq("platform", Platform.LINKEDIN);

    return { accessToken: newAccessToken, expiresIn: newExpiresIn };
  }

  async createPost(userId: string, content: string, mediaUrls: string[] = []) {
    // Fetch user account
    const { data: account } = await supabase
      .from('linked_accounts')
      .select('access_token, refresh_token, platform_user_id')
      .eq('user_id', userId)
      .eq('platform', Platform.LINKEDIN)
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
      const res = await axios.post("https://api.linkedin.com/v2/ugcPosts", body, {
        headers: {
          Authorization: `Bearer ${account.access_token}`,
          "X-Restli-Protocol-Version": "2.0.0",
        },
      });

      const postId = res.headers["x-restli-id"] || res.data?.id;

      return {
        success: true,
        platform_post_id: postId,
        url: `https://www.linkedin.com/feed/update/${postId}`,
      };
    } catch (error: any) {
      // Token expiration / Unauthorized handler
      if (error.response?.status === 401 && account.refresh_token) {
        console.log(`[LinkedIn] Token expired for user ${userId}. Attempting refresh...`);
        try {
          const params = new URLSearchParams();
          params.append("grant_type", "refresh_token");
          params.append("refresh_token", account.refresh_token);
          params.append("client_id", this.clientId as string);
          params.append("client_secret", this.clientSecret as string);
          
          const refreshRes = await axios.post("https://www.linkedin.com/oauth/v2/accessToken", params, {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
          });

          const newAccessToken = refreshRes.data.access_token;
          const newExpiresIn = refreshRes.data.expires_in;

          await supabase.from("linked_accounts").update({
            access_token: newAccessToken,
            expires_at: new Date(Date.now() + newExpiresIn * 1000).toISOString(),
          }).eq("user_id", userId).eq("platform", Platform.LINKEDIN);

          // Retry post
          const retryRes = await axios.post("https://api.linkedin.com/v2/ugcPosts", body, {
            headers: {
              Authorization: `Bearer ${newAccessToken}`,
              "X-Restli-Protocol-Version": "2.0.0",
            },
          });

          const retryPostId = retryRes.headers["x-restli-id"] || retryRes.data?.id;
          return {
            success: true,
            platform_post_id: retryPostId,
            url: `https://www.linkedin.com/feed/update/${retryPostId}`,
          };
        } catch (refreshErr: any) {
          console.error("[LinkedIn Refresh Error]:", refreshErr.response?.data || refreshErr.message);
          throw new Error("LinkedIn credentials expired. Please reconnect your account.");
        }
      }

      console.error("[LinkedIn API Error]:", error.response?.data || error.message);
      
      const errMsg = error.response?.data?.message || "";
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

      throw new Error(error.response?.data?.message || error.response?.data || error.message);
    }
  }
}

export const linkedInService = new LinkedInService();
