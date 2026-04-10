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
exports.mediaController = void 0;
const db_1 = require("../db");
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const BUCKET = "media-library";
class MediaController {
    constructor() {
        /**
         * POST /api/v1/media/upload
         * Accepts a base64-encoded file body (for Vercel serverless compatibility).
         * Body: { filename, fileType, data (base64), mimeType }
         */
        this.uploadAsset = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const { filename, data: base64Data, mimeType } = req.body;
                if (!filename || !base64Data || !mimeType) {
                    return res.status(400).json({ error: "filename, data, and mimeType are required" });
                }
                // Decode base64
                const buffer = Buffer.from(base64Data, "base64");
                if (buffer.byteLength > MAX_FILE_SIZE_BYTES) {
                    return res.status(413).json({ error: "File exceeds 10 MB limit" });
                }
                const fileType = mimeType.startsWith("video/") ? "video" : "image";
                const storagePath = `${user_id}/${Date.now()}_${filename.replace(/\s+/g, "_")}`;
                // Upload to Supabase Storage
                const { error: uploadError } = yield db_1.supabase.storage
                    .from(BUCKET)
                    .upload(storagePath, buffer, {
                    contentType: mimeType,
                    upsert: false,
                });
                if (uploadError)
                    throw new Error(uploadError.message);
                // Get public URL
                const { data: urlData } = db_1.supabase.storage.from(BUCKET).getPublicUrl(storagePath);
                const publicUrl = urlData.publicUrl;
                // Save metadata to DB
                const { data: asset, error: dbError } = yield db_1.supabase
                    .from("media_assets")
                    .insert({
                    user_id,
                    filename,
                    storage_path: storagePath,
                    public_url: publicUrl,
                    file_type: fileType,
                    size_bytes: buffer.byteLength,
                    mime_type: mimeType,
                })
                    .select()
                    .single();
                if (dbError) {
                    // Clean up the storage file if DB insert fails
                    yield db_1.supabase.storage.from(BUCKET).remove([storagePath]);
                    throw new Error(dbError.message);
                }
                res.status(201).json(asset);
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                console.error("[Media] uploadAsset error:", msg);
                res.status(500).json({ error: msg });
            }
        });
        /**
         * GET /api/v1/media — list user's media assets
         */
        this.listAssets = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const { type, page = "1", limit = "30" } = req.query;
                const pageNum = parseInt(page, 10);
                const limitNum = Math.min(parseInt(limit, 10), 100);
                const offset = (pageNum - 1) * limitNum;
                let query = db_1.supabase
                    .from("media_assets")
                    .select("*", { count: "exact" })
                    .eq("user_id", user_id)
                    .order("created_at", { ascending: false })
                    .range(offset, offset + limitNum - 1);
                if (type && (type === "image" || type === "video")) {
                    query = query.eq("file_type", type);
                }
                const { data, error, count } = yield query;
                if (error)
                    throw error;
                res.json({
                    assets: data || [],
                    meta: { total: count || 0, page: pageNum, limit: limitNum },
                });
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                res.status(500).json({ error: msg });
            }
        });
        /**
         * DELETE /api/v1/media/:id — delete an asset
         */
        this.deleteAsset = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const { id } = req.params;
                // Fetch to get storage_path (scoped to user)
                const { data: asset, error: fetchError } = yield db_1.supabase
                    .from("media_assets")
                    .select("storage_path")
                    .eq("id", id)
                    .eq("user_id", user_id)
                    .single();
                if (fetchError || !asset) {
                    return res.status(404).json({ error: "Asset not found" });
                }
                // Delete from Storage
                const { error: storageError } = yield db_1.supabase.storage
                    .from(BUCKET)
                    .remove([asset.storage_path]);
                if (storageError) {
                    console.warn("[Media] Storage delete warning:", storageError.message);
                }
                // Delete from DB
                const { error: dbError } = yield db_1.supabase
                    .from("media_assets")
                    .delete()
                    .eq("id", id)
                    .eq("user_id", user_id);
                if (dbError)
                    throw dbError;
                res.json({ success: true });
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                res.status(500).json({ error: msg });
            }
        });
    }
}
exports.mediaController = new MediaController();
