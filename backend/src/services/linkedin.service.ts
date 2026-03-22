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

export class MockLinkedInService implements ILinkedInService {
  getAuthUrl(state: string): string {
    return `http://localhost:3000/api/auth/callback/linkedin?code=mock_code_123&state=${state}`;
  }

  async connectAccount(userId: string, authCode: string): Promise<any> {
    console.log(
      `[MOCK] Connecting LinkedIn account for user ${userId} with code ${authCode}`,
    );

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Return mock token data
    const mockData = {
      user_id: userId,
      platform: Platform.LINKEDIN,
      platform_user_id: `urn:li:person:MOCK_${Math.random().toString(36).substring(7)}`,
      platform_username: "Mock User",
      access_token: "mock_access_token_" + Date.now(),
      refresh_token: "mock_refresh_token_" + Date.now(),
      status: "connected",
      token_expires_at: new Date(Date.now() + 3600 * 1000 * 60).toISOString(), // 60 days
    };

    // Store in DB
    const { data, error } = await supabase
      .from("linked_accounts")
      .upsert(mockData, { onConflict: "user_id, platform" })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async getProfile(userId: string): Promise<any> {
    // Return connection status from DB
    const { data } = await supabase
      .from("linked_accounts")
      .select("*")
      .eq("user_id", userId)
      .eq("platform", Platform.LINKEDIN)
      .single();

    return data || null;
  }

  async createPost(
    userId: string,
    content: string,
    mediaUrls: string[] = [],
  ): Promise<any> {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Simulate success
    return {
      success: true,
      platform_post_id: `urn:li:share:MOCK_${Date.now()}`,
      url: `https://linkedin.com/feed/update/urn:li:share:MOCK_${Date.now()}`,
    };
  }
}

// Real Implementation
export class RealLinkedInService implements ILinkedInService {
  private clientId = process.env.LINKEDIN_CLIENT_ID;
  private clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
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

  async createPost(userId: string, content: string, mediaUrls: string[] = []) {
    // Fetch user account
    const { data: account } = await supabase
      .from("linked_accounts")
      .select("access_token, platform_user_id")
      .eq("user_id", userId)
      .eq("platform", Platform.LINKEDIN)
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

      throw new Error(
        error.response?.data?.message || error.response?.data || error.message
      );
    }
  }
}

// Factory to switch
export const linkedInService =
  process.env.USE_REAL_LINKEDIN === "true"
    ? new RealLinkedInService()
    : new MockLinkedInService();
