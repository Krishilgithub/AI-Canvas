import { Response } from "express";
import { supabase } from "../db";
import { AuthRequest } from "../middleware/auth.middleware";
import crypto from "crypto";

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
        api_key: maskedApiKey, // Send masked key
        has_api_key: !!data.api_key, // Flag if key exists
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

      const { full_name, bio, notification_preferences } = req.body;

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name,
          bio,
          notification_preferences,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user_id);

      if (error) throw error;

      res.json({ success: true });
    } catch (e: any) {
      console.error("Update Profile Error:", e);
      res.status(500).json({ error: e.message });
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
        .select("subscription_plan, subscription_status, billing_cycle_end")
        .eq("id", user_id)
        .single();

      if (error) throw error;

      res.json({
        plan: data.subscription_plan || "free",
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
}

export const userController = new UserController();
