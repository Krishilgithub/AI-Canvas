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
exports.analyticsController = void 0;
const db_1 = require("../db");
class AnalyticsController {
    constructor() {
        this.getOverview = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const { platform } = req.query;
                // FIX: was querying the non-existent 'posts' table — now correctly uses 'generated_posts'
                // 1. Total Posts (all statuses)
                let postsQuery = db_1.supabase
                    .from("generated_posts")
                    .select("*", { count: "exact", head: true })
                    .eq("user_id", user_id);
                if (platform && platform !== "all") {
                    // generated_posts stores platform inside ai_metadata JSON
                    postsQuery = postsQuery.filter("ai_metadata->>platform", "eq", platform);
                }
                const { count: postsCount, error: postsError } = yield postsQuery;
                // FIX: was querying 'posts'.status = 'scheduled' — now correctly uses 'generated_posts'
                // 2. Scheduled Posts
                let scheduledQuery = db_1.supabase
                    .from("generated_posts")
                    .select("*", { count: "exact", head: true })
                    .eq("user_id", user_id)
                    .eq("status", "scheduled");
                if (platform && platform !== "all") {
                    scheduledQuery = scheduledQuery.filter("ai_metadata->>platform", "eq", platform);
                }
                const { count: scheduledCount } = yield scheduledQuery;
                // 3. Awaiting Approval (needs_approval)
                let approvalQuery = db_1.supabase
                    .from("generated_posts")
                    .select("*", { count: "exact", head: true })
                    .eq("user_id", user_id)
                    .eq("status", "needs_approval");
                if (platform && platform !== "all") {
                    approvalQuery = approvalQuery.filter("ai_metadata->>platform", "eq", platform);
                }
                const { count: approvalCount } = yield approvalQuery;
                // 4. Total Reach + Engagement from analytics_daily
                let analyticsQuery = db_1.supabase
                    .from("analytics_daily")
                    .select("impressions, engagement")
                    .eq("user_id", user_id);
                if (platform && platform !== "all") {
                    analyticsQuery = analyticsQuery.eq("platform", platform);
                }
                const { data: analyticsData, error: analyticsError } = yield analyticsQuery;
                if (analyticsError) {
                    // analytics_daily may not exist yet — degrade gracefully
                    console.warn("[Analytics] analytics_daily query failed (table may not exist yet):", analyticsError.message);
                }
                const totalReach = (analyticsData === null || analyticsData === void 0 ? void 0 : analyticsData.reduce((acc, curr) => acc + (curr.impressions || 0), 0)) || 0;
                const totalEngagement = (analyticsData === null || analyticsData === void 0 ? void 0 : analyticsData.reduce((acc, curr) => acc + (curr.engagement || 0), 0)) || 0;
                if (postsError) {
                    console.error("[Analytics] Error fetching generated_posts count:", postsError.message);
                }
                // 5. Calculate Posting Streak (consecutive days with a published post)
                let postingStreak = 0;
                const { data: streakData } = yield db_1.supabase
                    .from("generated_posts")
                    .select("created_at")
                    .eq("user_id", user_id)
                    .eq("status", "published")
                    .order("created_at", { ascending: false });
                if (streakData && streakData.length > 0) {
                    const dates = [...new Set(streakData.map(d => new Date(d.created_at).toISOString().split('T')[0]))].sort().reverse();
                    const today = new Date();
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    const todayStr = today.toISOString().split('T')[0];
                    const yesterdayStr = yesterday.toISOString().split('T')[0];
                    if (dates[0] === todayStr || dates[0] === yesterdayStr) {
                        const expectedDate = new Date(dates[0]);
                        for (const dateStr of dates) {
                            if (dateStr === expectedDate.toISOString().split('T')[0]) {
                                postingStreak++;
                                expectedDate.setDate(expectedDate.getDate() - 1);
                            }
                            else {
                                break;
                            }
                        }
                    }
                }
                res.json({
                    totalPosts: postsCount || 0,
                    scheduledPosts: scheduledCount || 0,
                    needsApproval: approvalCount || 0,
                    totalReach,
                    engagement: totalEngagement,
                    postingStreak,
                });
            }
            catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                console.error("[Analytics] Error in getOverview:", msg);
                res.status(500).json({ error: msg });
            }
        });
        this.getRecentActivity = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                // FIX: was querying non-existent 'posts' table — now uses 'generated_posts'
                const { data: posts, error } = yield db_1.supabase
                    .from("generated_posts")
                    .select("id, ai_metadata, content, status, created_at, scheduled_time")
                    .eq("user_id", user_id)
                    .order("created_at", { ascending: false })
                    .limit(10);
                if (error)
                    throw error;
                const activities = (posts === null || posts === void 0 ? void 0 : posts.map((post) => {
                    var _a, _b, _c, _d;
                    return ({
                        id: post.id,
                        type: post.status === "published"
                            ? "post_published"
                            : post.status === "needs_approval"
                                ? "draft_awaiting_review"
                                : "post_created",
                        description: `Post ${post.status} on ${(_b = (_a = post.ai_metadata) === null || _a === void 0 ? void 0 : _a.platform) !== null && _b !== void 0 ? _b : "unknown"}`,
                        timestamp: post.created_at,
                        meta: {
                            platform: (_d = (_c = post.ai_metadata) === null || _c === void 0 ? void 0 : _c.platform) !== null && _d !== void 0 ? _d : "unknown",
                            status: post.status,
                            content: post.content ? post.content.substring(0, 80) + "…" : "",
                        },
                    });
                })) || [];
                res.json(activities);
            }
            catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                console.error("[Analytics] Error in getRecentActivity:", msg);
                res.status(500).json({ error: msg });
            }
        });
        this.getPlatformStats = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const { platform } = req.query;
                let query = db_1.supabase
                    .from("analytics_daily")
                    .select("*")
                    .eq("user_id", user_id)
                    .order("date", { ascending: true })
                    .limit(30);
                if (platform && platform !== "all") {
                    query = query.eq("platform", platform);
                }
                const { data, error } = yield query;
                if (error)
                    throw error;
                res.json(data || []);
            }
            catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                res.status(500).json({ error: msg });
            }
        });
        // ─── seedData ──────────────────────────────────────────────────────────────
        // FIX: seedData uses Math.random() to generate fake impressions/engagement.
        // This was also exposed as an HTTP endpoint accessible by any authenticated user —
        // which means any user could overwrite another's analytics if user_id wasn't scoped.
        // This endpoint should be DISABLED in production. We guard it with NODE_ENV check.
        this.seedData = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            // Block in production — this endpoint should not exist in prod
            if (process.env.NODE_ENV === "production") {
                return res.status(403).json({
                    error: "Forbidden",
                    message: "seed endpoint is disabled in production. Remove this route before deploying.",
                });
            }
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const { data: accounts } = yield db_1.supabase
                    .from("linked_accounts")
                    .select("platform")
                    .eq("user_id", user_id);
                const platforms = (accounts === null || accounts === void 0 ? void 0 : accounts.length)
                    ? accounts.map((a) => a.platform)
                    : ["linkedin", "twitter"];
                const days = 30;
                const metrics = [];
                for (let i = 0; i < days; i++) {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    for (const platform of platforms) {
                        const impressions = Math.floor(Math.random() * 500) + 50;
                        const clicks = Math.floor(impressions * (Math.random() * 0.15));
                        const likes = Math.floor(impressions * (Math.random() * 0.10));
                        const comments = Math.floor(likes * (Math.random() * 0.30));
                        const shares = Math.floor(likes * (Math.random() * 0.10));
                        const engagement = clicks + likes + comments + shares;
                        metrics.push({
                            user_id,
                            platform,
                            date: date.toISOString().split("T")[0],
                            impressions, clicks, likes, comments, shares, engagement,
                        });
                    }
                }
                yield db_1.supabase.from("analytics_daily").delete().eq("user_id", user_id);
                const { error: insertError } = yield db_1.supabase.from("analytics_daily").insert(metrics);
                if (insertError)
                    throw insertError;
                res.json({ success: true, message: `[DEV ONLY] Seeded ${metrics.length} records.` });
            }
            catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                console.error("[Analytics] Seed Error:", msg);
                res.status(500).json({ error: msg });
            }
        });
    }
}
exports.analyticsController = new AnalyticsController();
