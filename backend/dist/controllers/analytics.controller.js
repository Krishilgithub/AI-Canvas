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
                // Mock aggregation for now if tables are empty, but logic is real
                // 1. Total Posts
                const { count: postsCount, error: postsError } = yield db_1.supabase
                    .from("posts")
                    .select("*", { count: "exact", head: true })
                    .eq("user_id", user_id);
                // 2. Scheduled Posts
                const { count: scheduledCount } = yield db_1.supabase
                    .from("posts")
                    .select("*", { count: "exact", head: true })
                    .eq("user_id", user_id)
                    .eq("status", "scheduled");
                // 3. Total Reach (Sum of impressions from analytics table)
                // Assuming table 'analytics_daily' with 'impressions' column
                const { data: analyticsData, error: analyticsError } = yield db_1.supabase
                    .from("analytics_daily")
                    .select("impressions, engagement")
                    .eq("user_id", user_id);
                const totalReach = (analyticsData === null || analyticsData === void 0 ? void 0 : analyticsData.reduce((acc, curr) => acc + (curr.impressions || 0), 0)) || 0;
                const totalEngagement = (analyticsData === null || analyticsData === void 0 ? void 0 : analyticsData.reduce((acc, curr) => acc + (curr.engagement || 0), 0)) ||
                    0;
                if (postsError)
                    console.error("Error fetching posts count:", postsError);
                res.json({
                    totalPosts: postsCount || 0,
                    scheduledPosts: scheduledCount || 0,
                    totalReach: totalReach,
                    engagement: totalEngagement,
                });
            }
            catch (error) {
                console.error("Error in getOverview:", error);
                res.status(500).json({ error: error.message });
            }
        });
        this.getRecentActivity = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                // Fetch recent 5 posts
                const { data: posts, error } = yield db_1.supabase
                    .from("posts")
                    .select("id, platform, content, status, created_at, scheduled_date")
                    .eq("user_id", user_id)
                    .order("created_at", { ascending: false })
                    .limit(5);
                if (error)
                    throw error;
                // Map to a generic activity format if needed, or return as is
                const activities = (posts === null || posts === void 0 ? void 0 : posts.map((post) => ({
                    id: post.id,
                    type: post.status === "published" ? "post_published" : "post_created",
                    description: `Post ${post.status} on ${post.platform}`,
                    timestamp: post.created_at,
                    meta: {
                        platform: post.platform,
                        content: post.content.substring(0, 50) + "...",
                    },
                }))) || [];
                res.json(activities);
            }
            catch (error) {
                console.error("Error in getRecentActivity:", error);
                res.status(500).json({ error: error.message });
            }
        });
        this.getPlatformStats = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            // Placeholder for platform specific drilldown
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const { data, error } = yield db_1.supabase
                    .from("analytics_daily")
                    .select("*")
                    .eq("user_id", user_id)
                    .order("date", { ascending: true })
                    .limit(30);
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
exports.analyticsController = new AnalyticsController();
