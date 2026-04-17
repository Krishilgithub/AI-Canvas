import { Response } from "express";
import { supabase } from "../db";
import { encrypt } from "../utils/crypto";
import { AuthRequest } from "../middleware/auth.middleware";
import { llmService } from "../services/llm.service";

// ─── Valid LLM providers ──────────────────────────────────────────────────────
const VALID_PROVIDERS = ["openai", "gemini", "claude"] as const;
type Provider = typeof VALID_PROVIDERS[number];

export const keysController = {
  /**
   * Save or Update a user's LLM API key.
   * Uses the authenticated user's ID from JWT — NOT from the request body.
   */
  saveKey: async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      const { provider, apiKey } = req.body;

      if (!provider || !apiKey) {
        return res.status(400).json({ error: "provider and apiKey are required" });
      }

      if (!VALID_PROVIDERS.includes(provider as Provider)) {
        return res.status(400).json({ error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(", ")}` });
      }

      const encryptedKey = encrypt(apiKey);

      const { error } = await supabase
        .from("user_api_keys")
        .upsert(
          {
            user_id,
            provider,
            encrypted_api_key: encryptedKey,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,provider" }
        );

      if (error) throw error;

      return res.status(200).json({ success: true, message: `${provider} API key saved and encrypted successfully.` });
    } catch (error: unknown) {
      console.error("[keysController.saveKey] Error:", error);
      return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to save API key" });
    }
  },

  /**
   * Get the save status of all LLM API keys for the authenticated user.
   */
  getStatus: async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      const { data, error } = await supabase
        .from("user_api_keys")
        .select("provider, updated_at")
        .eq("user_id", user_id);

      if (error) throw error;

      const keys = (VALID_PROVIDERS as readonly string[]).map((p) => {
        const row = data?.find((r: { provider: string }) => r.provider === p);
        return { provider: p, isSaved: !!row, updated_at: row?.updated_at ?? null };
      });

      return res.json({ success: true, keys });
    } catch (error: unknown) {
      console.error("[keysController.getStatus] Error:", error);
      return res.status(500).json({ error: "Failed to get key status" });
    }
  },

  /**
   * Remove a user's LLM API key.
   */
  removeKey: async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      const provider = req.query.provider as string;

      if (!provider || !VALID_PROVIDERS.includes(provider as Provider)) {
        return res.status(400).json({ error: "Valid provider query param required" });
      }

      const { error } = await supabase
        .from("user_api_keys")
        .delete()
        .eq("user_id", user_id)
        .eq("provider", provider);

      if (error) throw error;

      return res.json({ success: true, message: `${provider} API key removed.` });
    } catch (error: unknown) {
      console.error("[keysController.removeKey] Error:", error);
      return res.status(500).json({ error: "Failed to remove API key" });
    }
  },

  /**
   * Set the user's preferred AI model provider.
   */
  setPreferredModel: async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      const { provider } = req.body;

      if (!VALID_PROVIDERS.includes(provider as Provider)) {
        return res.status(400).json({ error: "Invalid provider" });
      }

      const { error } = await supabase
        .from("profiles")
        .update({ preferred_ai_model: provider, updated_at: new Date().toISOString() })
        .eq("id", user_id);

      if (error) throw error;

      return res.json({ success: true, preferred_ai_model: provider });
    } catch (error: unknown) {
      console.error("[keysController.setPreferredModel] Error:", error);
      return res.status(500).json({ error: "Failed to update preferred model" });
    }
  },

  /**
   * Get the user's provider status and preferred model setting.
   */
  getProviderStatus: async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      const status = await llmService.getProviderStatus(user_id);
      return res.json({ success: true, ...status });
    } catch (error: unknown) {
      console.error("[keysController.getProviderStatus] Error:", error);
      return res.status(500).json({ error: "Failed to get provider status" });
    }
  },
};
