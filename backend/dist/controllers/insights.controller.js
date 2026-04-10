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
exports.insightsController = void 0;
const db_1 = require("../db");
const gemini_service_1 = require("../services/gemini.service");
/**
 * InsightsController — AI-powered post performance analysis (Post Autopsy).
 * Feedback loop: stores analysis and uses it to improve future drafts.
 */
class InsightsController {
    constructor() {
        /**
         * POST /api/v1/insights/autopsy
         * Analyze a specific post for hook quality, CTA strength, and improvement tips.
         */
        this.analyzePost = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const { post_id } = req.body;
                if (!post_id)
                    return res.status(400).json({ error: "post_id is required" });
                // Fetch the post
                const { data: post, error: postError } = yield db_1.supabase
                    .from("generated_posts")
                    .select("id, content, ai_metadata, status, published_at")
                    .eq("id", post_id)
                    .eq("user_id", user_id)
                    .single();
                if (postError || !post) {
                    return res.status(404).json({ error: "Post not found" });
                }
                // Check for existing insight to avoid re-analyzing
                const { data: existing } = yield db_1.supabase
                    .from("post_insights")
                    .select("*")
                    .eq("post_id", post_id)
                    .single();
                if (existing) {
                    return res.json(existing);
                }
                const platform = (_c = (_b = post.ai_metadata) === null || _b === void 0 ? void 0 : _b.platform) !== null && _c !== void 0 ? _c : "linkedin";
                // Call Gemini for analysis
                const analysis = yield gemini_service_1.geminiService.analyzePostPerformance(post.content, platform, user_id);
                // Store the insight
                const { data: insight, error: insertError } = yield db_1.supabase
                    .from("post_insights")
                    .insert({
                    post_id,
                    user_id,
                    platform,
                    hook_score: analysis.hook_score,
                    cta_score: analysis.cta_score,
                    analysis: analysis.analysis,
                    suggestions: analysis.suggestions,
                })
                    .select()
                    .single();
                if (insertError) {
                    // Return analysis even if storage fails
                    console.error("[Insights] Failed to store insight:", insertError.message);
                    return res.json(Object.assign(Object.assign({}, analysis), { post_id, platform, stored: false }));
                }
                res.json(insight);
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                console.error("[Insights] analyzePost error:", msg);
                if (msg === "AI_UNAVAILABLE") {
                    return res.status(503).json({
                        error: "AI analysis unavailable",
                        message: "Gemini API key not configured. Add it in Settings → AI Models.",
                    });
                }
                res.status(500).json({ error: msg });
            }
        });
        /**
         * GET /api/v1/insights/:platform
         * Fetch stored insights for a platform, ordered by hook_score desc.
         */
        this.getPlatformInsights = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const { platform } = req.params;
                const { data, error } = yield db_1.supabase
                    .from("post_insights")
                    .select("*")
                    .eq("user_id", user_id)
                    .eq("platform", platform)
                    .order("hook_score", { ascending: false })
                    .limit(20);
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
         * GET /api/v1/insights/top-posts/:platform
         * Returns top 3 best-performing post contents for the platform (used to seed AI drafts).
         */
        this.getTopPerformingPosts = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const { platform } = req.params;
                // Join post_insights with generated_posts to get content of best posts
                const { data, error } = yield db_1.supabase
                    .from("post_insights")
                    .select("hook_score, cta_score, generated_posts(content)")
                    .eq("user_id", user_id)
                    .eq("platform", platform)
                    .order("hook_score", { ascending: false })
                    .limit(3);
                if (error)
                    throw error;
                const topPosts = (data || []).map((row) => {
                    var _a;
                    const post = row.generated_posts;
                    return {
                        content: (_a = post === null || post === void 0 ? void 0 : post.content) !== null && _a !== void 0 ? _a : "",
                        hook_score: row.hook_score,
                        cta_score: row.cta_score,
                    };
                }).filter(p => p.content);
                res.json(topPosts);
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                res.status(500).json({ error: msg });
            }
        });
    }
}
exports.insightsController = new InsightsController();
