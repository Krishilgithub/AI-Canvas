import { Response } from "express";
import { supabase } from "../db";
import { AuthRequest } from "../middleware/auth.middleware";

/**
 * AccountsController — manages multi-account connections per platform.
 * Supports listing all connected accounts, renaming, and per-account disconnect.
 */
class AccountsController {
  /** GET /api/v1/accounts — list all connected accounts for this user */
  listAccounts = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      const { platform } = req.query;

      let query = supabase
        .from("linked_accounts")
        .select("id, platform, platform_username, platform_user_id, status, account_label, token_expires_at, metadata, created_at")
        .eq("user_id", user_id)
        .order("created_at", { ascending: true });

      if (platform && typeof platform === "string") {
        query = query.eq("platform", platform);
      }

      const { data, error } = await query;
      if (error) throw error;

      res.json(data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Accounts] listAccounts error:", msg);
      res.status(500).json({ error: msg });
    }
  };

  /** PATCH /api/v1/accounts/:id/label — rename an account */
  updateLabel = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      const { id } = req.params;
      const { label } = req.body;

      if (!label || typeof label !== "string" || label.trim().length === 0) {
        return res.status(400).json({ error: "Label must be a non-empty string" });
      }

      const { data, error } = await supabase
        .from("linked_accounts")
        .update({ account_label: label.trim() })
        .eq("id", id)
        .eq("user_id", user_id) // scoped to user — prevents cross-user edits
        .select()
        .single();

      if (error) throw error;
      if (!data) return res.status(404).json({ error: "Account not found" });

      res.json({ success: true, account: data });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  };

  /** DELETE /api/v1/accounts/:id — disconnect a specific account by row ID */
  disconnectAccount = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      const { id } = req.params;

      const { error } = await supabase
        .from("linked_accounts")
        .delete()
        .eq("id", id)
        .eq("user_id", user_id); // scoped to user

      if (error) throw error;

      res.json({ success: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  };

  /** GET /api/v1/accounts/primary/:platform — get the primary/first account for a platform */
  getPrimaryAccount = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      const { platform } = req.params;

      const { data, error } = await supabase
        .from("linked_accounts")
        .select("id, platform, platform_username, platform_user_id, account_label, status")
        .eq("user_id", user_id)
        .eq("platform", platform)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      res.json(data || null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  };
}

export const accountsController = new AccountsController();
