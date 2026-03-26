import { Request, Response } from "express";
import { supabase } from "../db";
import { encrypt } from "../utils/crypto";

export const keysController = {
  // Save or Update API Key
  saveKey: async (req: Request, res: Response) => {
    try {
      const { user_id, provider, api_key } = req.body;

      if (!user_id || !provider || !api_key) {
        return res.status(400).json({ error: "user_id, provider, and api_key are required" });
      }

      if (!['openai', 'gemini', 'claude'].includes(provider)) {
        return res.status(400).json({ error: "Invalid provider" });
      }

      const encryptedKey = encrypt(api_key);

      const { data, error } = await supabase
        .from("user_api_keys")
        .upsert(
          { 
            user_id, 
            provider, 
            encrypted_api_key: encryptedKey,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id, provider' }
        )
        .select();

      if (error) throw error;

      res.status(200).json({ success: true, message: `Successfully saved ${provider} API key` });
    } catch (error: any) {
      console.error("[saveKey] Error:", error);
      res.status(500).json({ error: error.message || "Failed to save API key" });
    }
  },

  // Get Status of API Keys connected
  getStatus: async (req: Request, res: Response) => {
    try {
      const { user_id } = req.query;

      if (!user_id) {
        return res.status(400).json({ error: "user_id is required" });
      }

      const { data, error } = await supabase
        .from("user_api_keys")
        .select("provider, updated_at")
        .eq("user_id", user_id);

      if (error) throw error;

      // Transform to a mapped object for frontend easily parsing status
      const status: Record<string, boolean> = {
        openai: false,
        gemini: false,
        claude: false
      };

      data?.forEach((row: any) => {
        if (row.provider in status) {
          status[row.provider] = true;
        }
      });

      res.status(200).json({ success: true, keys: status });
    } catch (error: any) {
      console.error("[getStatus] Error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch API key status" });
    }
  },

  // Remove an API Key
  removeKey: async (req: Request, res: Response) => {
    try {
      const { user_id, provider } = req.query;

      if (!user_id || !provider) {
        return res.status(400).json({ error: "user_id and provider are required" });
      }

      const { error } = await supabase
        .from("user_api_keys")
        .delete()
        .eq("user_id", user_id)
        .eq("provider", provider);

      if (error) throw error;

      res.status(200).json({ success: true, message: `Successfully removed ${provider} API key` });
    } catch (error: any) {
      console.error("[removeKey] Error:", error);
      res.status(500).json({ error: error.message || "Failed to remove API key" });
    }
  }
};
