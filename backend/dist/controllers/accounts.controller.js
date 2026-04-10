"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.accountsController = void 0;
const db_1 = require("../db");
/**
 * AccountsController — manages multi-account connections per platform.
 * Supports listing all connected accounts, renaming, and per-account disconnect.
 */
class AccountsController {
    constructor() {
        /** GET /api/v1/accounts — list all connected accounts for this user */
        this.listAccounts = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const { platform } = req.query;
                let query = db_1.supabase
                    .from("linked_accounts")
                    .select("id, platform, platform_username, platform_user_id, status, account_label, token_expires_at, metadata, created_at")
                    .eq("user_id", user_id)
                    .order("created_at", { ascending: true });
                if (platform && typeof platform === "string") {
                    query = query.eq("platform", platform);
                }
                const { data, error } = yield query;
                if (error)
                    throw error;
                res.json(data || []);
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                console.error("[Accounts] listAccounts error:", msg);
                res.status(500).json({ error: msg });
            }
        });
        /** PATCH /api/v1/accounts/:id/label — rename an account */
        this.updateLabel = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const { id } = req.params;
                const { label } = req.body;
                if (!label || typeof label !== "string" || label.trim().length === 0) {
                    return res.status(400).json({ error: "Label must be a non-empty string" });
                }
                const { data, error } = yield db_1.supabase
                    .from("linked_accounts")
                    .update({ account_label: label.trim() })
                    .eq("id", id)
                    .eq("user_id", user_id) // scoped to user — prevents cross-user edits
                    .select()
                    .single();
                if (error)
                    throw error;
                if (!data)
                    return res.status(404).json({ error: "Account not found" });
                res.json({ success: true, account: data });
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                res.status(500).json({ error: msg });
            }
        });
        /** DELETE /api/v1/accounts/:id — disconnect a specific account by row ID */
        this.disconnectAccount = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const { id } = req.params;
                const { error } = yield db_1.supabase
                    .from("linked_accounts")
                    .delete()
                    .eq("id", id)
                    .eq("user_id", user_id); // scoped to user
                if (error)
                    throw error;
                res.json({ success: true });
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                res.status(500).json({ error: msg });
            }
        });
        /** GET /api/v1/accounts/primary/:platform — get the primary/first account for a platform */
        this.getPrimaryAccount = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const { platform } = req.params;
                const { data, error } = yield db_1.supabase
                    .from("linked_accounts")
                    .select("id, platform, platform_username, platform_user_id, account_label, status")
                    .eq("user_id", user_id)
                    .eq("platform", platform)
                    .order("created_at", { ascending: true })
                    .limit(1)
                    .single();
                if (error && error.code !== "PGRST116")
                    throw error;
                res.json(data || null);
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                res.status(500).json({ error: msg });
            }
        });
    }
}
exports.accountsController = new AccountsController();
