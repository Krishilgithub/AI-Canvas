import { Request, Response } from "express";
import { linkedInService } from "../services/linkedin.service";
import { twitterService } from "../services/twitter.service";
import { instagramService } from "../services/instagram.service";
import { slackService } from "../services/slack.service";
import { redditService } from "../services/reddit.service";
import { youtubeService } from "../services/youtube.service";
import { supabase } from "../db";
import { AuthRequest } from "../middleware/auth.middleware";

const getFrontendUrl = () => {
  const isProd = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
  return process.env.FRONTEND_URL || (isProd ? "https://ai-canvass.vercel.app" : "http://localhost:3000");
};

export class AuthController {
  // 1. Get Auth URL
  getLinkedInAuthUrl = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      // Encode user_id in state (in prod, sign this to prevent tampering)
      const state = Buffer.from(JSON.stringify({ user_id })).toString("base64");

      const url = linkedInService.getAuthUrl(state);
      res.json({ url });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };

  // 2. Handle Callback
  handleLinkedInCallback = async (req: Request, res: Response) => {
    try {
      const { code, state, error } = req.query;

      if (error) {
        return res.redirect(
          `${getFrontendUrl()}/integrations?error=${error}`,
        );
      }

      if (!code || !state) {
        return res.redirect(
          `${getFrontendUrl()}/integrations?error=invalid_callback`,
        );
      }

      // Decode state
      const decodedState = JSON.parse(
        Buffer.from(state as string, "base64").toString("ascii"),
      );
      const { user_id } = decodedState;

      if (!user_id) {
        return res.redirect(
          `${getFrontendUrl()}/integrations?error=invalid_state`,
        );
      }

      // Connect Account
      await linkedInService.connectAccount(user_id, code as string);

      // Redirect to frontend
      res.redirect(
        `${getFrontendUrl()}/integrations?success=linkedin_connected`,
      );
    } catch (e: any) {
      console.error("LinkedIn Callback Error:", e);
      res.redirect(
        `${getFrontendUrl()}/integrations?error=connection_failed`,
      );
    }
  };

  // 3. Disconnect
  disconnectLinkedIn = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      const { error } = await supabase
        .from("linked_accounts")
        .delete()
        .eq("user_id", user_id)
        .eq("platform", "linkedin");

      if (error) throw error;

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };

  // --- TWITTER ---
  getTwitterAuthUrl = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });
      const state = Buffer.from(JSON.stringify({ user_id })).toString("base64");
      const url = twitterService.getAuthUrl(state);
      res.json({ url });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };

  handleTwitterCallback = async (req: Request, res: Response) => {
    try {
      const { code, state, error } = req.query;
      if (error) return res.redirect(`${getFrontendUrl()}/integrations?error=${error}`);
      if (!code || !state) return res.redirect(`${getFrontendUrl()}/integrations?error=invalid_callback`);

      const decodedState = JSON.parse(Buffer.from(state as string, "base64").toString("ascii"));
      const { user_id, cv } = decodedState;
      if (!user_id || !cv) return res.redirect(`${getFrontendUrl()}/integrations?error=invalid_state`);

      await twitterService.exchangeCodeForToken(code as string, cv as string, user_id);
      res.redirect(`${getFrontendUrl()}/integrations?success=twitter_connected`);
    } catch (e: any) {
      console.error("Twitter Callback Error:", e);
      const msg = encodeURIComponent(e.stack || e.message || "unknown_error");
      res.redirect(`${getFrontendUrl()}/integrations?error=connection_failed_${msg}`);
    }
  };

  disconnectTwitter = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });
      const { error } = await supabase.from("linked_accounts").delete().eq("user_id", user_id).eq("platform", "twitter");
      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };

  // --- INSTAGRAM ---
  getInstagramAuthUrl = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });
      const state = Buffer.from(JSON.stringify({ user_id })).toString("base64");
      const url = instagramService.getAuthUrl(state);
      res.json({ url });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };

  handleInstagramCallback = async (req: Request, res: Response) => {
    try {
      const { code, state, error } = req.query;
      if (error) return res.redirect(`${getFrontendUrl()}/integrations?error=${error}`);
      if (!code || !state) return res.redirect(`${getFrontendUrl()}/integrations?error=invalid_callback`);

      const decodedState = JSON.parse(Buffer.from(state as string, "base64").toString("ascii"));
      const { user_id } = decodedState;
      if (!user_id) return res.redirect(`${getFrontendUrl()}/integrations?error=invalid_state`);

      await instagramService.exchangeCodeForToken(code as string, user_id);
      res.redirect(`${getFrontendUrl()}/integrations?success=instagram_connected`);
    } catch (e: any) {
      console.error("Instagram Callback Error:", e);
      res.redirect(`${getFrontendUrl()}/integrations?error=connection_failed`);
    }
  };

  disconnectInstagram = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });
      const { error } = await supabase.from("linked_accounts").delete().eq("user_id", user_id).eq("platform", "instagram");
      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };

  // --- YOUTUBE ---
  getYouTubeAuthUrl = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });
      const state = Buffer.from(JSON.stringify({ user_id })).toString("base64");
      const url = youtubeService.getAuthUrl(state);
      res.json({ url });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };

  handleYouTubeCallback = async (req: Request, res: Response) => {
    try {
      const { code, state, error } = req.query;
      if (error) return res.redirect(`${getFrontendUrl()}/integrations?error=${error}`);
      if (!code || !state) return res.redirect(`${getFrontendUrl()}/integrations?error=invalid_callback`);

      const decodedState = JSON.parse(Buffer.from(state as string, "base64").toString("ascii"));
      const { user_id } = decodedState;
      if (!user_id) return res.redirect(`${getFrontendUrl()}/integrations?error=invalid_state`);

      await youtubeService.exchangeCodeForToken(code as string, user_id);
      res.redirect(`${getFrontendUrl()}/integrations?success=youtube_connected`);
    } catch (e: any) {
      console.error("YouTube Callback Error:", e);
      res.redirect(`${getFrontendUrl()}/integrations?error=connection_failed`);
    }
  };

  disconnectYouTube = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });
      const { error } = await supabase.from("linked_accounts").delete().eq("user_id", user_id).eq("platform", "youtube");
      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };

  // --- GENERIC PLATFORM HANDLERS ---

  connectPlatform = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      const { platform } = req.params;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      // For generic platforms (Twitter, Instagram, etc.), we simulate the flow
      // In a real app, this would get the OAuth URL for that specific platform.

      // Simulation: Redirect directly to callback with success
      const callbackUrl = `${process.env.APP_URL || "http://localhost:4000"}/api/v1/auth/${platform}/callback?code=mock_code&state=${Buffer.from(JSON.stringify({ user_id })).toString("base64")}`;

      // If we were returning a URL to frontend:
      res.json({ url: callbackUrl });

      // Or if the frontend expects to click a link that goes here, we redirect.
      // But usually we return { url } so frontend can window.location.href = url
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };

  handlePlatformCallback = async (req: Request, res: Response) => {
    try {
      const { platform } = req.params;
      const { code, state, error } = req.query;

      if (error)
        return res.redirect(
          `${getFrontendUrl()}/integrations?error=${error}`,
        );

      const decodedState = JSON.parse(
        Buffer.from(state as string, "base64").toString("ascii"),
      );
      const { user_id } = decodedState;

      if (!user_id)
        return res.redirect(
          `${getFrontendUrl()}/integrations?error=invalid_state`,
        );

      // Verify/Exchange Token (Mocked)
      const mockToken = {
        access_token: `mock_${platform}_token_${Date.now()}`,
        refresh_token: `mock_${platform}_refresh_${Date.now()}`,
        expires_in: 3600,
      };

      // Save to DB
      // Try to save to Supabase. Note: 'platform' enum might fail if not updated.
      // We'll try, and if it fails, we catch it but still redirect success for the "demo" requirement if possible,
      // or just fail.
      await supabase.from("linked_accounts").upsert(
        {
          user_id,
          platform, // This might fail if enum is strict
          access_token: mockToken.access_token,
          refresh_token: mockToken.refresh_token,
          expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
          connection_status: "active",
        },
        { onConflict: "user_id, platform" },
      );

      res.redirect(
        `${getFrontendUrl()}/integrations?success=${platform}_connected`,
      );
    } catch (e: any) {
      console.error(`${req.params.platform} Callback Error:`, e);
      // If it was a DB constraint error, we might still want to show success for the demo if strictly requested.
      // But better to show error so we know.
      res.redirect(
        `${getFrontendUrl()}/integrations?error=connection_failed`,
      );
    }
  };

  disconnectPlatform = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      const { platform } = req.params;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      const { error } = await supabase
        .from("linked_accounts")
        .delete()
        .eq("user_id", user_id)
        .eq("platform", platform);

      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };

  // --- SLACK ---
  getSlackAuthUrl = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });
      const state = Buffer.from(JSON.stringify({ user_id })).toString("base64");
      const url = slackService.getAuthUrl(state);
      res.json({ url });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };

  handleSlackCallback = async (req: Request, res: Response) => {
    try {
      const { code, state, error } = req.query;
      if (error) return res.redirect(`${getFrontendUrl()}/integrations?error=${error}`);
      if (!code || !state) return res.redirect(`${getFrontendUrl()}/integrations?error=invalid_callback`);

      const decodedState = JSON.parse(Buffer.from(state as string, "base64").toString("ascii"));
      const { user_id } = decodedState;
      if (!user_id) return res.redirect(`${getFrontendUrl()}/integrations?error=invalid_state`);

      await slackService.exchangeCodeForToken(code as string, user_id);
      res.redirect(`${getFrontendUrl()}/integrations?success=slack_connected`);
    } catch (e: any) {
      console.error("Slack Callback Error:", e);
      res.redirect(`${getFrontendUrl()}/integrations?error=connection_failed`);
    }
  };

  disconnectSlack = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });
      const { error } = await supabase.from("linked_accounts").delete().eq("user_id", user_id).eq("platform", "slack");
      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };

  // --- REDDIT ---
  getRedditAuthUrl = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });
      const state = Buffer.from(JSON.stringify({ user_id })).toString("base64");
      const url = redditService.getAuthUrl(state);
      res.json({ url });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };

  handleRedditCallback = async (req: Request, res: Response) => {
    try {
      const { code, state, error } = req.query;
      if (error) return res.redirect(`${process.env.FRONTEND_URL}/integrations?error=${error}`);
      if (!code || !state) return res.redirect(`${process.env.FRONTEND_URL}/integrations?error=invalid_callback`);

      const decodedState = JSON.parse(Buffer.from(state as string, "base64").toString("ascii"));
      const { user_id } = decodedState;
      if (!user_id) return res.redirect(`${process.env.FRONTEND_URL}/integrations?error=invalid_state`);

      await redditService.exchangeCodeForToken(code as string, user_id);
      res.redirect(`${process.env.FRONTEND_URL}/integrations?success=reddit_connected`);
    } catch (e: any) {
      console.error("Reddit Callback Error:", e);
      res.redirect(`${process.env.FRONTEND_URL}/integrations?error=connection_failed`);
    }
  };

  disconnectReddit = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });
      const { error } = await supabase.from("linked_accounts").delete().eq("user_id", user_id).eq("platform", "reddit");
      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };
}

export const authController = new AuthController();
