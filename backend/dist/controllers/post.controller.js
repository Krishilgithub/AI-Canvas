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
exports.postController = void 0;
const db_1 = require("../db");
class PostController {
    constructor() {
        this.listPosts = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const { platform, status } = req.query;
                let query = db_1.supabase
                    .from("posts")
                    .select("*")
                    .eq("user_id", user_id)
                    .order("created_at", { ascending: false });
                if (platform && typeof platform === "string") {
                    query = query.eq("platform", platform);
                }
                if (status && typeof status === "string") {
                    query = query.eq("status", status);
                }
                const { data, error } = yield query;
                if (error)
                    throw error;
                res.json(data);
            }
            catch (error) {
                console.error("Error in listPosts:", error);
                res.status(500).json({ error: error.message });
            }
        });
        this.getPost = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { id } = req.params;
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const { data, error } = yield db_1.supabase
                    .from("posts")
                    .select("*")
                    .eq("id", id)
                    .eq("user_id", user_id)
                    .single();
                if (error)
                    throw error;
                if (!data)
                    return res.status(404).json({ error: "Post not found" });
                res.json(data);
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        this.deletePost = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { id } = req.params;
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const { error } = yield db_1.supabase
                    .from("posts")
                    .delete()
                    .eq("id", id)
                    .eq("user_id", user_id);
                if (error)
                    throw error;
                res.json({ message: "Post deleted successfully" });
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        this.updatePost = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { id } = req.params;
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const updates = req.body;
                const { data, error } = yield db_1.supabase
                    .from("posts")
                    .update(updates)
                    .eq("id", id)
                    .eq("user_id", user_id)
                    .select()
                    .single();
                if (error)
                    throw error;
                res.json(data);
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }
}
exports.postController = new PostController();
