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
exports.keysController = void 0;
const db_1 = require("../db");
const crypto_1 = require("../utils/crypto");
exports.keysController = {
    // Save or Update API Key
    saveKey: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { user_id, provider, api_key } = req.body;
            if (!user_id || !provider || !api_key) {
                return res.status(400).json({ error: "user_id, provider, and api_key are required" });
            }
            if (!['openai', 'gemini', 'claude'].includes(provider)) {
                return res.status(400).json({ error: "Invalid provider" });
            }
            const encryptedKey = (0, crypto_1.encrypt)(api_key);
            const { data, error } = yield db_1.supabase
                .from("user_api_keys")
                .upsert({
                user_id,
                provider,
                encrypted_api_key: encryptedKey,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id, provider' })
                .select();
            if (error)
                throw error;
            res.status(200).json({ success: true, message: `Successfully saved ${provider} API key` });
        }
        catch (error) {
            console.error("[saveKey] Error:", error);
            res.status(500).json({ error: error.message || "Failed to save API key" });
        }
    }),
    // Get Status of API Keys connected
    getStatus: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { user_id } = req.query;
            if (!user_id) {
                return res.status(400).json({ error: "user_id is required" });
            }
            const { data, error } = yield db_1.supabase
                .from("user_api_keys")
                .select("provider, updated_at")
                .eq("user_id", user_id);
            if (error)
                throw error;
            // Transform to a mapped object for frontend easily parsing status
            const status = {
                openai: false,
                gemini: false,
                claude: false
            };
            data === null || data === void 0 ? void 0 : data.forEach((row) => {
                if (row.provider in status) {
                    status[row.provider] = true;
                }
            });
            res.status(200).json({ success: true, keys: status });
        }
        catch (error) {
            console.error("[getStatus] Error:", error);
            res.status(500).json({ error: error.message || "Failed to fetch API key status" });
        }
    }),
    // Remove an API Key
    removeKey: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { user_id, provider } = req.query;
            if (!user_id || !provider) {
                return res.status(400).json({ error: "user_id and provider are required" });
            }
            const { error } = yield db_1.supabase
                .from("user_api_keys")
                .delete()
                .eq("user_id", user_id)
                .eq("provider", provider);
            if (error)
                throw error;
            res.status(200).json({ success: true, message: `Successfully removed ${provider} API key` });
        }
        catch (error) {
            console.error("[removeKey] Error:", error);
            res.status(500).json({ error: error.message || "Failed to remove API key" });
        }
    })
};
