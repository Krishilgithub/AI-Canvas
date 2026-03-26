import { Request, Response } from "express";
import { supabase } from "../db";

export const automationConfigController = {
  getConfig: async (req: Request, res: Response) => {
    try {
      const { user_id, platform } = req.query;

      if (!user_id || !platform) {
        return res.status(400).json({ error: "user_id and platform are required" });
      }

      const { data, error } = await supabase
        .from("automation_configs")
        .select("*")
        .eq("user_id", user_id)
        .eq("platform", platform)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      return res.status(200).json({ success: true, config: data || null });
    } catch (error: any) {
      console.error("[getConfig] Error:", error);
      return res.status(500).json({ error: error.message || "Failed to fetch automation config" });
    }
  },

  saveConfig: async (req: Request, res: Response) => {
    try {
      const { user_id, platform, preferred_time, timezone, frequency, auto_post_enabled } = req.body;

      if (!user_id || !platform || !preferred_time || !timezone || !frequency) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const { data, error } = await supabase
        .from("automation_configs")
        .upsert(
          {
            user_id,
            platform,
            preferred_time,
            timezone,
            frequency,
            auto_post_enabled: auto_post_enabled ?? false,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id, platform' }
        )
        .select();

      if (error) throw error;

      return res.status(200).json({ success: true, config: data[0] });
    } catch (error: any) {
      console.error("[saveConfig] Error:", error);
      return res.status(500).json({ error: error.message || "Failed to save automation config" });
    }
  }
};
