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
exports.automationConfigController = void 0;
const db_1 = require("../db");
exports.automationConfigController = {
    getConfig: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { user_id, platform } = req.query;
            if (!user_id || !platform) {
                return res.status(400).json({ error: "user_id and platform are required" });
            }
            const { data, error } = yield db_1.supabase
                .from("automation_configs")
                .select("*")
                .eq("user_id", user_id)
                .eq("platform", platform)
                .single();
            if (error && error.code !== "PGRST116") {
                throw error;
            }
            return res.status(200).json({ success: true, config: data || null });
        }
        catch (error) {
            console.error("[getConfig] Error:", error);
            return res.status(500).json({ error: error.message || "Failed to fetch automation config" });
        }
    }),
    saveConfig: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { user_id, platform, preferred_time, timezone, frequency, auto_post_enabled } = req.body;
            if (!user_id || !platform || !preferred_time || !timezone || !frequency) {
                return res.status(400).json({ error: "Missing required fields" });
            }
            const { data, error } = yield db_1.supabase
                .from("automation_configs")
                .upsert({
                user_id,
                platform,
                preferred_time,
                timezone,
                frequency,
                auto_post_enabled: auto_post_enabled !== null && auto_post_enabled !== void 0 ? auto_post_enabled : false,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id, platform' })
                .select();
            if (error)
                throw error;
            return res.status(200).json({ success: true, config: data[0] });
        }
        catch (error) {
            console.error("[saveConfig] Error:", error);
            return res.status(500).json({ error: error.message || "Failed to save automation config" });
        }
    })
};
