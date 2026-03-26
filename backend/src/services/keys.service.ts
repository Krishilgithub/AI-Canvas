import { supabase } from "../db";
import { decrypt } from "../utils/crypto";

export const keysService = {
  /**
   * Retrieves and decrypts an API key for a specific user and provider.
   * Returns null if no key is found.
   */
  async getKey(userId: string, provider: 'openai' | 'gemini' | 'claude'): Promise<string | null> {
    try {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("user_api_keys")
        .select("encrypted_api_key")
        .eq("user_id", userId)
        .eq("provider", provider)
        .single();

      if (error || !data) {
        return null;
      }

      return decrypt(data.encrypted_api_key);
    } catch (err) {
      console.error(`[keysService] Failed to get/decrypt ${provider} key for user ${userId}:`, err);
      return null;
    }
  }
};
