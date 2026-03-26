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
exports.keysService = void 0;
const db_1 = require("../db");
const crypto_1 = require("../utils/crypto");
exports.keysService = {
    /**
     * Retrieves and decrypts an API key for a specific user and provider.
     * Returns null if no key is found.
     */
    getKey(userId, provider) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!userId)
                    return null;
                const { data, error } = yield db_1.supabase
                    .from("user_api_keys")
                    .select("encrypted_api_key")
                    .eq("user_id", userId)
                    .eq("provider", provider)
                    .single();
                if (error || !data) {
                    return null;
                }
                return (0, crypto_1.decrypt)(data.encrypted_api_key);
            }
            catch (err) {
                console.error(`[keysService] Failed to get/decrypt ${provider} key for user ${userId}:`, err);
                return null;
            }
        });
    }
};
