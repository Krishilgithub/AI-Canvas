import { Response, Request } from "express";
import { supabase } from "../db";
import { AuthRequest } from "../middleware/auth.middleware";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";


export class UserController {
  /**
   * Get User Profile with Subscription & API Key (Masked)
   */
  getProfile = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user_id)
        .single();

      if (error) throw error;

      // Mask API Key for security
      const maskedApiKey = data.api_key
        ? `${data.api_key.substring(0, 8)}...${data.api_key.substring(data.api_key.length - 4)}`
        : null;

      res.json({
        ...data,
        api_key: maskedApiKey,
        has_api_key: !!data.api_key,
        preferred_ai_model: data.preferred_ai_model || "gemini",
      });
    } catch (e: any) {
      console.error("Get Profile Error:", e);
      res.status(500).json({ error: e.message });
    }
  };

  /**
   * Update User Profile (Bio, Name, Notifications)
   */
  updateProfile = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      const { full_name, bio, notification_preferences, avatar_url, preferred_ai_model } = req.body;

      const updatePayload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (full_name !== undefined) updatePayload.full_name = full_name;
      if (bio !== undefined) updatePayload.bio = bio;
      if (notification_preferences !== undefined) updatePayload.notification_preferences = notification_preferences;
      if (avatar_url !== undefined) updatePayload.avatar_url = avatar_url;
      if (preferred_ai_model !== undefined) updatePayload.preferred_ai_model = preferred_ai_model;

      const { error } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", user_id);

      if (error) throw error;

      res.json({ success: true });
    } catch (e: unknown) {
      console.error("Update Profile Error:", e);
      res.status(500).json({ error: e instanceof Error ? e.message : "Update failed" });
    }
  };

  /**
   * Generate or Regenerate API Key
   */
  generateApiKey = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      // Generate a secure random key
      const newApiKey = `sk_live_${crypto.randomBytes(24).toString("hex")}`;

      const { error } = await supabase
        .from("profiles")
        .update({
          api_key: newApiKey,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user_id);

      if (error) throw error;

      // Return the raw key ONLY ONCE upon generation
      res.json({ api_key: newApiKey });
    } catch (e: any) {
      console.error("Generate API Key Error:", e);
      res.status(500).json({ error: e.message });
    }
  };

  /**
   * Get Subscription Details (Mock for now, ready for Stripe)
   */
  getSubscription = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      const { data, error } = await supabase
        .from("profiles")
        .select("subscription_tier, subscription_status, billing_cycle_end")
        .eq("id", user_id)
        .single();

      if (error) throw error;

      res.json({
        plan: data.subscription_tier || "free",
        status: data.subscription_status || "active",
        next_billing:
          data.billing_cycle_end ||
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    } catch (e: any) {
      console.error("Get Subscription Error:", e);
      res.status(500).json({ error: e.message });
    }
  };

  /**
   * Permanently Delete Account
   * Uses Supabase admin API to destroy the auth user, which cascades and deletes all owned data
   */
  deleteAccount = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      // Supabase admin deletes instantly wipe auth.users and triggers cascading deletions
      const { error } = await supabase.auth.admin.deleteUser(user_id);

      if (error) throw error;

      res.json({ success: true });
    } catch (e: any) {
      console.error("Delete Account Error:", e);
      res.status(500).json({ error: e.message });
    }
  };

  /**
   * Get Public Portfolio
   * Unauthenticated endpoint to fetch user's public info and top posts
   */
  getPublicPortfolio = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("id, full_name, bio, role, niche, avatar_url")
        .eq("id", id)
        .single();
        
      if (profileErr || !profile) return res.status(404).json({ error: "Portfolio not found" });

      const { data: posts, error: postsErr } = await supabase
        .from("generated_posts")
        .select("id, content, published_at, ai_metadata")
        .eq("user_id", id)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(10);
        
      if (postsErr) throw postsErr;

      res.json({ profile, posts: posts || [] });
    } catch (e: unknown) {
      console.error("Get Public Portfolio Error:", e);
      res.status(500).json({ error: "Failed to load portfolio" });
    }
  };

  /**
   * Upload a user avatar as base64 to Supabase Storage
   */
  uploadAvatar = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      const { imageBase64, mimeType } = req.body as { imageBase64: string; mimeType: string };

      if (!imageBase64 || !mimeType) {
        return res.status(400).json({ error: "imageBase64 and mimeType are required" });
      }

      const validMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!validMimeTypes.includes(mimeType)) {
        return res.status(400).json({ error: "Invalid image type. Use JPEG, PNG, WebP, or GIF." });
      }

      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      if (buffer.byteLength > 5 * 1024 * 1024) {
        return res.status(400).json({ error: "Image too large. Maximum size is 5MB." });
      }

      const ext = mimeType.split("/")[1];
      const fileName = `avatars/${user_id}.${ext}`;

      // Use service role client for storage operations
      const adminClient = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
      );

      const { error: uploadError } = await adminClient.storage
        .from("media-library")
        .upload(fileName, buffer, { contentType: mimeType, upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = adminClient.storage
        .from("media-library")
        .getPublicUrl(fileName);

      // Save public URL to profile
      await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq("id", user_id);

      return res.json({ success: true, avatar_url: publicUrl });
    } catch (e: unknown) {
      console.error("Upload Avatar Error:", e);
      return res.status(500).json({ error: e instanceof Error ? e.message : "Failed to upload avatar" });
    }
  };
}

export const userController = new UserController();
