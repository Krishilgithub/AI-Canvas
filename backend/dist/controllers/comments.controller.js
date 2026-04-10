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
exports.commentsController = void 0;
const db_1 = require("../db");
class CommentsController {
    constructor() {
        /**
         * GET /api/v1/comments/:post_id — list all comments for a post
         */
        this.listComments = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const { post_id } = req.params;
                // Verify the post belongs to this user
                const { data: post } = yield db_1.supabase
                    .from("generated_posts")
                    .select("id")
                    .eq("id", post_id)
                    .eq("user_id", user_id)
                    .single();
                if (!post)
                    return res.status(404).json({ error: "Post not found" });
                const { data, error } = yield db_1.supabase
                    .from("post_comments")
                    .select("*")
                    .eq("post_id", post_id)
                    .order("created_at", { ascending: true });
                if (error)
                    throw error;
                res.json(data || []);
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                res.status(500).json({ error: msg });
            }
        });
        /**
         * POST /api/v1/comments/:post_id — add a comment
         */
        this.addComment = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const { post_id } = req.params;
                const { body, author_name } = req.body;
                if (!body || typeof body !== "string" || body.trim().length === 0) {
                    return res.status(400).json({ error: "Comment body is required" });
                }
                if (body.trim().length > 1000) {
                    return res.status(400).json({ error: "Comment must be 1000 characters or less" });
                }
                // Verify the post exists and belongs to this user
                const { data: post } = yield db_1.supabase
                    .from("generated_posts")
                    .select("id")
                    .eq("id", post_id)
                    .eq("user_id", user_id)
                    .single();
                if (!post)
                    return res.status(404).json({ error: "Post not found" });
                const { data, error } = yield db_1.supabase
                    .from("post_comments")
                    .insert({
                    post_id,
                    user_id,
                    body: body.trim(),
                    author_name: (author_name === null || author_name === void 0 ? void 0 : author_name.trim()) || "You",
                })
                    .select()
                    .single();
                if (error)
                    throw error;
                res.status(201).json(data);
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                res.status(500).json({ error: msg });
            }
        });
        /**
         * DELETE /api/v1/comments/:post_id/:comment_id — delete own comment
         */
        this.deleteComment = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const { comment_id } = req.params;
                const { error } = yield db_1.supabase
                    .from("post_comments")
                    .delete()
                    .eq("id", comment_id)
                    .eq("user_id", user_id); // can only delete own comments
                if (error)
                    throw error;
                res.json({ success: true });
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                res.status(500).json({ error: msg });
            }
        });
    }
}
exports.commentsController = new CommentsController();
