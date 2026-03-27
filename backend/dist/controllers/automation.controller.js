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
exports.automationController = exports.AutomationController = void 0;
const db_1 = require("../db");
const linkedin_service_1 = require("../services/linkedin.service");
const twitter_service_1 = require("../services/twitter.service");
const instagram_service_1 = require("../services/instagram.service");
const slack_service_1 = require("../services/slack.service");
const reddit_service_1 = require("../services/reddit.service");
const news_service_1 = require("../services/news.service");
const gemini_service_1 = require("../services/gemini.service");
const workflow_service_1 = require("../services/workflow.service");
const constants_1 = require("../constants");
const email_service_1 = require("../services/email.service");
const scheduler_service_1 = require("../services/scheduler.service");
const socket_service_1 = require("../services/socket.service");
class AutomationController {
    constructor() {
        this.emailService = new email_service_1.EmailService();
        /** Returns true if user is within their quota, false if exceeded */
        this.checkQuota = (user_id) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            // 1. Get user tier
            const { data: user } = yield db_1.supabase
                .from("users")
                .select("*")
                .eq("id", user_id)
                .single();
            const tier = ((user === null || user === void 0 ? void 0 : user.subscription_tier) || "free").toLowerCase();
            const limit = (_a = AutomationController.PLAN_LIMITS[tier]) !== null && _a !== void 0 ? _a : 10;
            // 2. Count AI-generated posts this calendar month
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);
            const { count } = yield db_1.supabase
                .from("generated_posts")
                .select("*", { count: "exact", head: true })
                .eq("user_id", user_id)
                .gte("created_at", startOfMonth.toISOString());
            const used = count || 0;
            return { allowed: used < limit, used, limit, tier };
        });
        // 1. Save Configuration
        this.saveConfig = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const { platform, // Get platform from body
                niches, keywords, tone_profile, schedule_cron, smart_scheduling, require_approval, auto_retweet, preferred_time, timezone, frequency, auto_post_enabled, } = req.body;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                // Validate platform
                if (!platform ||
                    !Object.values(constants_1.Platform).includes(platform)) {
                    // Default to LinkedIn if not provided for backward compat, but best to enforce
                    // For now, let's strictly require it or default to LinkedIn with warning?
                    // Let's default to LinkedIn if missing to not break existing calls
                }
                const targetPlatform = platform || constants_1.Platform.LINKEDIN;
                const { data, error } = yield db_1.supabase
                    .from("automation_configs")
                    .upsert({
                    user_id,
                    platform: targetPlatform,
                    niches,
                    keywords,
                    tone_profile,
                    schedule_cron,
                    smart_scheduling,
                    require_approval,
                    auto_retweet,
                    preferred_time,
                    timezone,
                    frequency,
                    auto_post_enabled,
                    is_active: true,
                }, { onConflict: "user_id, platform" })
                    .select()
                    .single();
                if (error)
                    throw error;
                res.json({ success: true, config: data });
            }
            catch (error) {
                console.error("saveConfig error:", error);
                const errMsg = (error === null || error === void 0 ? void 0 : error.message) || (typeof error === 'string' ? error : JSON.stringify(error));
                res.status(500).json({ error: errMsg || "Unknown error occurred" });
            }
        });
        // Scan Real Trends — uses the Advanced Trend Intelligence System
        this.scanTrends = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                let niches = ["Technology", "Business"];
                let keywords = [];
                const platform = req.body.platform || constants_1.Platform.LINKEDIN;
                // Fetch config to get niches AND keywords
                const { data: config } = yield db_1.supabase
                    .from("automation_configs")
                    .select("niches, keywords")
                    .eq("user_id", user_id)
                    .eq("platform", platform)
                    .single();
                if (config) {
                    if (config.niches && config.niches.length > 0)
                        niches = config.niches;
                    if (config.keywords && config.keywords.length > 0)
                        keywords = config.keywords;
                }
                // Also fetch user profile for genre context
                const { data: userProfile } = yield db_1.supabase
                    .from("profiles")
                    .select("role, niche, goals, bio")
                    .eq("id", user_id)
                    .single();
                const genre = niches[0] || (userProfile === null || userProfile === void 0 ? void 0 : userProfile.niche) || "Technology";
                // Build search query
                const nicheQuery = niches.map((n) => `"${n}"`).join(" OR ");
                const keywordQuery = keywords.map((k) => `"${k}"`).join(" OR ");
                let query = "";
                if (nicheQuery && keywordQuery) {
                    query = `(${nicheQuery}) AND (${keywordQuery})`;
                }
                else if (nicheQuery) {
                    query = nicheQuery;
                }
                else {
                    query = "Technology OR Business";
                }
                console.log(`[SCAN] Fetching news for: ${query} | Platform: ${platform}`);
                // Fetch News
                const newsItems = yield news_service_1.newsService.fetchNews(query);
                if (newsItems.length === 0) {
                    return res.json({ success: true, message: "No new news found", trends: [] });
                }
                // Advanced Trend Intelligence Analysis
                // FIX: now passes more articles (20 instead of 10) for richer AI analysis
                let analyzedTrends;
                try {
                    analyzedTrends = yield gemini_service_1.geminiService.analyzeTrendIntelligence({
                        userId: user_id,
                        genre,
                        keywords,
                        target_platform: platform,
                        time_window: "last 24 hours",
                        platform_data: newsItems.slice(0, 20),
                        max_trends: 10,
                    });
                }
                catch (aiError) {
                    // FIX: Handle AI_UNAVAILABLE gracefully — return unscored articles with clear message
                    if ((aiError === null || aiError === void 0 ? void 0 : aiError.message) === "AI_UNAVAILABLE") {
                        return res.status(503).json({
                            error: "AI scoring unavailable",
                            message: "Gemini API key is not configured. Please add a Gemini API key in Settings → AI Models to enable trend scoring and draft generation.",
                            action_required: "ADD_GEMINI_KEY",
                            raw_articles: newsItems.slice(0, 10).map((a) => ({ title: a.title, description: a.description })),
                        });
                    }
                    throw aiError;
                }
                // FIX: Deduplicate — check if a trend with the same topic was already scanned today
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const { data: existingTrends } = yield db_1.supabase
                    .from("detected_trends")
                    .select("topic")
                    .eq("user_id", user_id)
                    .gte("created_at", today.toISOString());
                const existingTopics = new Set((existingTrends || []).map((t) => t.topic.toLowerCase().trim()));
                // Save to DB
                const savedTrends = [];
                for (const trend of analyzedTrends) {
                    // FIX: Skip if this topic was already scanned today (prevents duplicates on re-scan)
                    const normalizedTopic = trend.topic.toLowerCase().trim();
                    if (existingTopics.has(normalizedTopic)) {
                        console.log(`[SCAN] Skipping duplicate topic: "${trend.topic}"`);
                        continue;
                    }
                    existingTopics.add(normalizedTopic); // prevent intra-batch duplicates too
                    const trendObj = {
                        user_id,
                        topic: trend.topic,
                        category: trend.category || genre,
                        velocity_score: Math.round(trend.impact_score * 100),
                        source: "newsdata_io",
                        metadata: {
                            link: trend.link,
                            insight: trend.reasoning,
                            suggested_angle: trend.suggested_angle,
                            impact_score: trend.impact_score,
                            confidence: trend.confidence,
                            engagement_signals: trend.engagement_signals,
                            platforms: trend.platforms,
                            query_used: query,
                        },
                        created_at: new Date().toISOString(),
                    };
                    const { data } = yield db_1.supabase
                        .from("detected_trends")
                        .insert(trendObj)
                        .select()
                        .single();
                    if (data)
                        savedTrends.push(data);
                }
                // Auto-generate drafts for high-impact trends (impact_score > 0.70)
                for (const trend of savedTrends) {
                    if (trend.velocity_score > 70) {
                        // Throttle to respect Gemini free-tier rate limits (15 RPM baseline)
                        yield new Promise((resolve) => setTimeout(resolve, 3500));
                        try {
                            let draftContent = yield workflow_service_1.workflowService.generatePost({ topic: trend.topic, platform: platform }, userProfile || undefined, ((_b = trend.metadata) === null || _b === void 0 ? void 0 : _b.suggested_angle) || ((_c = trend.metadata) === null || _c === void 0 ? void 0 : _c.insight));
                            const quota = yield this.checkQuota(user_id);
                            if (quota.tier !== "pro" && quota.tier !== "enterprise") {
                                draftContent += "\n\n✨ Automatically generated by AI Canvas";
                            }
                            const { data: insertedPost } = yield db_1.supabase.from("generated_posts").insert({
                                user_id,
                                content: draftContent,
                                trend_id: trend.id,
                                status: constants_1.PostStatus.NEEDS_APPROVAL,
                                ai_metadata: { platform },
                                created_at: new Date().toISOString(),
                            }).select().single();
                            if (insertedPost) {
                                const notification = {
                                    user_id,
                                    type: "post_needs_approval",
                                    title: "Post awaiting your approval",
                                    message: `A new ${platform} draft about "${trend.topic}" was generated and is ready for your review.`,
                                    metadata: { platform, postId: insertedPost.id },
                                };
                                const { data: insertedNotif } = yield db_1.supabase.from("notifications").insert(notification).select().single();
                                if (insertedNotif) {
                                    socket_service_1.socketService.pushNotification(user_id, insertedNotif);
                                }
                            }
                        }
                        catch (draftErr) {
                            // FIX: Don't crash the whole scan if a single draft fails
                            console.error(`[SCAN] Draft generation failed for "${trend.topic}":`, draftErr === null || draftErr === void 0 ? void 0 : draftErr.message);
                        }
                    }
                }
                res.json({
                    success: true,
                    count: savedTrends.length,
                    trends: savedTrends,
                });
            }
            catch (error) {
                console.error("Scan failed:", error);
                res.status(500).json({ error: error.message });
            }
        });
        // 3. Create Draft Post (from n8n AI Agent)
        this.createDraft = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                let { content, trend_id } = req.body;
                const targetPlatform = req.body.platform || constants_1.Platform.LINKEDIN;
                // Quota check before generating
                const quota = yield this.checkQuota(user_id);
                if (!quota.allowed) {
                    return res.status(403).json({
                        error: "Monthly generation quota exceeded.",
                        used: quota.used,
                        limit: quota.limit,
                        tier: quota.tier,
                        upgrade_url: `${process.env.FRONTEND_URL}/settings?tab=billing`,
                    });
                }
                // Auto-generate if missing
                if (!content) {
                    const { data: trend } = yield db_1.supabase
                        .from("detected_trends")
                        .select("*")
                        .eq("id", trend_id)
                        .single();
                    if (trend) {
                        // Fetch user profile for context
                        const { data: userProfile } = yield db_1.supabase
                            .from("profiles")
                            .select("*")
                            .eq("id", user_id)
                            .single();
                        content = yield workflow_service_1.workflowService.generatePost({ topic: trend.topic, platform: targetPlatform }, userProfile || undefined, ((_b = trend.metadata) === null || _b === void 0 ? void 0 : _b.insight) || "No context");
                        if (quota.tier !== "pro" && quota.tier !== "enterprise") {
                            content += "\n\n✨ Automatically generated by AI Canvas";
                        }
                    }
                    else {
                        content = "Draft generated from unknown trend.";
                    }
                }
                const { data: config } = yield db_1.supabase
                    .from("automation_configs")
                    .select("*")
                    .eq("user_id", user_id)
                    .eq("platform", targetPlatform)
                    .single();
                // Default to NEEDS_APPROVAL for safety if config is missing
                const status = (config === null || config === void 0 ? void 0 : config.require_approval) !== false
                    ? constants_1.PostStatus.NEEDS_APPROVAL
                    : constants_1.PostStatus.SCHEDULED;
                const { data, error } = yield db_1.supabase
                    .from("generated_posts")
                    .insert({
                    user_id,
                    content,
                    trend_id,
                    status,
                    ai_metadata: { platform: targetPlatform },
                    platform_post_id: null, // Not posted yet
                })
                    .select()
                    .single();
                if (error)
                    throw error;
                // Check notification preference in Profile
                if (status === constants_1.PostStatus.NEEDS_APPROVAL) {
                    const { data: profile } = yield db_1.supabase
                        .from("profiles")
                        .select("*")
                        .eq("id", user_id)
                        .single();
                    if ((profile === null || profile === void 0 ? void 0 : profile.email) &&
                        ((_c = profile.notification_preferences) === null || _c === void 0 ? void 0 : _c.post_approval)) {
                        yield this.emailService.sendApprovalRequest(profile.email, content.substring(0, 50) + "...", process.env.APP_URL || "http://localhost:3000");
                    }
                }
                // Log it
                yield db_1.supabase.from("automation_logs").insert({
                    user_id,
                    action: "draft_created",
                    level: constants_1.LogLevel.INFO,
                    message: `Created draft for user ${user_id}`,
                    metadata: { draft_id: data.id },
                });
                res.json({ success: true, post: data });
            }
            catch (error) {
                console.error("[createDraft] Error:", error);
                res.status(500).json({ error: error.message || String(error) || "Unknown Error" });
            }
        });
        // 4. Trigger Posting (Webhook or User Action)
        this.triggerPost = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const { post_id, platform: bodyPlatform } = req.body;
                console.log(`[triggerPost] user=${user_id} post_id=${post_id} bodyPlatform=${bodyPlatform}`);
                // Fetch post ensuring it belongs to user
                const { data: post, error: fetchError } = yield db_1.supabase
                    .from("generated_posts")
                    .select("*")
                    .eq("id", post_id)
                    .eq("user_id", user_id)
                    .single();
                if (fetchError || !post) {
                    console.error(`[triggerPost] Post not found: post_id=${post_id} user_id=${user_id}`, fetchError);
                    return res.status(404).json({ error: "Post not found or you don't have permission to publish it." });
                }
                console.log(`[triggerPost] post status=${post.status} ai_metadata_platform=${(_b = post.ai_metadata) === null || _b === void 0 ? void 0 : _b.platform} post.platform=${post.platform}`);
                if (post.status === constants_1.PostStatus.PUBLISHED ||
                    post.status === constants_1.PostStatus.REJECTED) {
                    console.error(`[triggerPost] 400: Cannot publish post with status ${post.status}`);
                    return res
                        .status(400)
                        .json({ error: `Cannot publish a post with status: "${post.status}". Only draft, pending, approved, or failed posts can be published.` });
                }
                // Execute Posting via Service
                let resultId = null;
                const platform = bodyPlatform || ((_c = post.ai_metadata) === null || _c === void 0 ? void 0 : _c.platform) || post.platform || "linkedin";
                console.log(`[triggerPost] resolved platform=${platform}`);
                try {
                    if (platform === 'twitter') {
                        const tweetRes = yield twitter_service_1.twitterService.postTweet(user_id, post.content);
                        resultId = ((_d = tweetRes === null || tweetRes === void 0 ? void 0 : tweetRes.data) === null || _d === void 0 ? void 0 : _d.id) || (tweetRes === null || tweetRes === void 0 ? void 0 : tweetRes.id) || "twitter_unknown_id";
                    }
                    else if (platform === 'instagram') {
                        const igId = yield instagram_service_1.instagramService.postToInstagram(user_id, post.content, (_e = post.media_urls) === null || _e === void 0 ? void 0 : _e[0]);
                        resultId = igId;
                    }
                    else if (platform === 'slack') {
                        const slackRes = yield slack_service_1.slackService.sendMessage(user_id, post.content);
                        resultId = (slackRes === null || slackRes === void 0 ? void 0 : slackRes.ts) || "slack_message_sent";
                    }
                    else if (platform === 'reddit') {
                        const subreddit = ((_f = post.ai_metadata) === null || _f === void 0 ? void 0 : _f.subreddit) || post.subreddit || "test";
                        console.log(`[triggerPost] Reddit posting to subreddit=${subreddit}`);
                        const redditRes = yield reddit_service_1.redditService.postToReddit(user_id, post.content, subreddit);
                        resultId = (redditRes === null || redditRes === void 0 ? void 0 : redditRes.url) || "reddit_post_created";
                    }
                    else {
                        // Default: LinkedIn
                        const liResult = yield linkedin_service_1.linkedInService.createPost(user_id, post.content, post.media_urls);
                        resultId = (liResult === null || liResult === void 0 ? void 0 : liResult.platform_post_id) || (liResult === null || liResult === void 0 ? void 0 : liResult.id) || null;
                    }
                }
                catch (err) {
                    console.error(`[triggerPost] Platform posting error for ${platform}:`, err.message);
                    if (err.message && err.message.toLowerCase().includes("not connected")) {
                        return res.status(400).json({
                            error: `Your ${platform} account is not connected. Please go to Integrations and connect your ${platform} account first.`,
                            code: "ACCOUNT_NOT_CONNECTED"
                        });
                    }
                    throw new Error(`Failed to post to ${platform}: ${err.message || "Unknown error"}`);
                }
                // Update DB
                const { error: updateError } = yield db_1.supabase
                    .from("generated_posts")
                    .update({
                    status: constants_1.PostStatus.PUBLISHED,
                    platform_post_id: resultId,
                    published_at: new Date().toISOString(),
                })
                    .eq("id", post_id);
                if (updateError)
                    throw updateError;
                yield db_1.supabase.from("automation_logs").insert({
                    user_id,
                    action: "post_published",
                    level: constants_1.LogLevel.SUCCESS,
                    message: `Published post ${post_id} to ${platform}`,
                });
                console.log(`[triggerPost] SUCCESS: post_id=${post_id} platform=${platform} resultId=${resultId}`);
                res.json({ success: true, platform_response: { id: resultId, platform } });
            }
            catch (error) {
                console.error("[triggerPost] FATAL ERROR:", error.message, error.stack);
                yield db_1.supabase
                    .from("generated_posts")
                    .update({ status: constants_1.PostStatus.FAILED })
                    .eq("id", req.body.post_id);
                yield db_1.supabase.from("automation_logs").insert({
                    user_id: (_g = req.user) === null || _g === void 0 ? void 0 : _g.id,
                    action: "post_failed",
                    level: constants_1.LogLevel.ERROR,
                    message: error.message || "Unknown error",
                });
                res.status(500).json({
                    error: error.message || String(error) || "Unknown error occurred during posting",
                });
            }
        });
        // 5. Update Post (Edit Draft)
        this.updatePost = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const { id } = req.params;
                const { content, scheduled_time, platform } = req.body;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                // Build update payload
                const payload = {
                    content,
                    scheduled_time,
                    updated_at: new Date().toISOString(),
                };
                if (platform) {
                    payload.ai_metadata = { platform };
                }
                // Real update
                const { data, error } = yield db_1.supabase
                    .from("generated_posts")
                    .update(payload)
                    .eq("id", id)
                    .eq("user_id", user_id) // Security check
                    .select()
                    .single();
                if (error)
                    throw error;
                res.json({ success: true, post: data });
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        // 6. Create Post (Manual) - Deprecated manual raw insert, kept for legacy if needed,
        // but usually we use createDraft or generateManualPost now.
        this.createPost = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                console.log(`[CREATE_POST] Attempting to create for User ID: ${user_id}`);
                const { content, scheduled_time, status, trend_id, media_urls, platform } = req.body;
                console.log("[CREATE_POST] Inserting into Real DB...");
                const { data, error } = yield db_1.supabase
                    .from("generated_posts")
                    .insert({
                    user_id,
                    content,
                    scheduled_time,
                    status,
                    trend_id,
                    media_urls, // Added
                    ai_metadata: platform ? { platform } : undefined,
                })
                    .select()
                    .single();
                if (error) {
                    console.error("[CREATE_POST] DB Error:", error);
                    throw error;
                }
                res.json({ success: true, post: data });
            }
            catch (e) {
                console.error("[CREATE_POST] Exception:", e);
                res.status(500).json({ error: e.message });
            }
        });
        // NEW: Manual AI Generation via n8n
        this.generateManualPost = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const { topic, platform, target_audience, voice_preset, length, professionalism, automated_hashtags, vibe_check, content_pillars, primary_focus, auto_generate_tags, smart_description, } = req.body;
                if (!topic)
                    return res.status(400).json({ error: "Topic is required" });
                // 0. Quota Check
                const quota = yield this.checkQuota(user_id);
                if (!quota.allowed) {
                    return res.status(403).json({
                        error: "Monthly generation quota exceeded.",
                        used: quota.used,
                        limit: quota.limit,
                        tier: quota.tier,
                        upgrade_url: `${process.env.FRONTEND_URL}/settings?tab=billing`,
                    });
                }
                // 1. Call LangGraph Workflow to generate content
                let content = yield workflow_service_1.workflowService.generatePost({
                    topic,
                    platform: platform || "linkedin",
                    target_audience,
                    voice_preset,
                    length,
                    professionalism,
                    automated_hashtags,
                    vibe_check,
                    content_pillars,
                    primary_focus,
                    auto_generate_tags,
                    smart_description,
                }, req.user || undefined);
                if (quota.tier !== "pro" && quota.tier !== "enterprise") {
                    content += "\n\n✨ Automatically generated by AI Canvas";
                }
                // 2. Save as Draft
                const { data, error } = yield db_1.supabase
                    .from("generated_posts")
                    .insert({
                    user_id,
                    content,
                    status: constants_1.PostStatus.NEEDS_APPROVAL,
                    ai_metadata: { source: "manual_n8n", topic, platform: platform || "linkedin" },
                })
                    .select()
                    .single();
                if (error)
                    throw error;
                // 3. Log
                yield db_1.supabase.from("automation_logs").insert({
                    user_id,
                    action: "manual_generation",
                    level: constants_1.LogLevel.INFO,
                    message: `Generated post for topic: ${topic}`,
                });
                res.json({ success: true, post: data });
            }
            catch (e) {
                const errMsg = e instanceof Error ? e.message : "Manual generation failed";
                console.error("Manual generation failed:", errMsg);
                res.status(500).json({ error: errMsg });
            }
        });
        // ────────────────────────────────────────────────────────────────────────
        // NEW: Content Remix Engine (Growth & Retention)
        // ────────────────────────────────────────────────────────────────────────
        this.remixPost = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const { post_id, target_platform } = req.body;
                if (!post_id || !target_platform) {
                    return res.status(400).json({ error: "post_id and target_platform are required" });
                }
                // 0. Quota Check
                const quota = yield this.checkQuota(user_id);
                if (!quota.allowed) {
                    return res.status(403).json({
                        error: "Monthly generation quota exceeded.",
                        used: quota.used,
                        limit: quota.limit,
                        tier: quota.tier,
                        upgrade_url: `${process.env.FRONTEND_URL}/settings?tab=billing`,
                    });
                }
                // 1. Fetch original post
                const { data: originalPost, error: fetchErr } = yield db_1.supabase
                    .from("generated_posts")
                    .select("*")
                    .eq("id", post_id)
                    .eq("user_id", user_id)
                    .single();
                if (fetchErr || !originalPost) {
                    return res.status(404).json({ error: "Original post not found" });
                }
                // 2. Fetch user profile for context (role, niche, etc)
                const { data: userProfile } = yield db_1.supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", user_id)
                    .single();
                // 3. Remixer LangGraph Execution
                const content = yield workflow_service_1.workflowService.generatePost({
                    topic: `Adapt this content for ${target_platform}: ${originalPost.content}`,
                    platform: target_platform,
                }, userProfile || undefined, "Remix and translate this content precisely for the target platform's formatting and style length.");
                let finalContent = content;
                if (quota.tier !== "pro" && quota.tier !== "enterprise") {
                    finalContent += "\n\n✨ Automatically generated by AI Canvas";
                }
                // 4. Save as Draft
                const { data, error } = yield db_1.supabase
                    .from("generated_posts")
                    .insert({
                    user_id,
                    content: finalContent,
                    status: constants_1.PostStatus.NEEDS_APPROVAL,
                    ai_metadata: { source: "remix", original_post_id: post_id, platform: target_platform },
                    trend_id: originalPost.trend_id, // keep trend id so analytics link back
                })
                    .select()
                    .single();
                if (error)
                    throw error;
                yield db_1.supabase.from("automation_logs").insert({
                    user_id,
                    action: "post_remixed",
                    level: constants_1.LogLevel.INFO,
                    message: `Remixed post ${post_id} into a ${target_platform} draft`,
                });
                res.json({ success: true, post: data });
            }
            catch (e) {
                const errMsg = e instanceof Error ? e.message : "Remix failed";
                res.status(500).json({ error: errMsg });
            }
        });
        // Quota Status Endpoint
        this.getQuotaStatus = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const quota = yield this.checkQuota(user_id);
                return res.json({
                    used: quota.used,
                    limit: quota.limit === Infinity ? null : quota.limit,
                    tier: quota.tier,
                    remaining: quota.limit === Infinity ? null : Math.max(0, quota.limit - quota.used),
                    allowed: quota.allowed,
                });
            }
            catch (e) {
                const errMsg = e instanceof Error ? e.message : "Quota check failed";
                return res.status(500).json({ error: errMsg });
            }
        });
        // 7. Retry Failed Post
        this.retryPost = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const { id } = req.params;
                // Ensure post exists and belongs to user
                const { data: post, error: fetchErr } = yield db_1.supabase
                    .from("generated_posts")
                    .select("*")
                    .eq("id", id)
                    .eq("user_id", user_id)
                    .single();
                if (fetchErr || !post)
                    return res.status(404).json({ error: "Post not found" });
                if (post.status !== constants_1.PostStatus.FAILED)
                    return res.status(400).json({ error: "Post is not in a failed state" });
                // Attempt re-publish
                let resultId = null;
                let platform = ((_b = post.ai_metadata) === null || _b === void 0 ? void 0 : _b.platform) || "linkedin";
                try {
                    if (platform === 'twitter') {
                        const tweetRes = yield twitter_service_1.twitterService.postTweet(user_id, post.content);
                        resultId = ((_c = tweetRes.data) === null || _c === void 0 ? void 0 : _c.id) || tweetRes.id || "twitter_unknown_id";
                    }
                    else if (platform === 'instagram') {
                        const igId = yield instagram_service_1.instagramService.postToInstagram(user_id, post.content, (_d = post.media_urls) === null || _d === void 0 ? void 0 : _d[0]);
                        resultId = igId;
                    }
                    else {
                        const liResult = yield linkedin_service_1.linkedInService.createPost(user_id, post.content, post.media_urls);
                        resultId = (liResult === null || liResult === void 0 ? void 0 : liResult.platform_post_id) || (liResult === null || liResult === void 0 ? void 0 : liResult.id) || null;
                    }
                }
                catch (err) {
                    throw new Error(`Failed to post to ${platform}: ${err.message || "Unknown error"}`);
                }
                yield db_1.supabase
                    .from("generated_posts")
                    .update({
                    status: constants_1.PostStatus.PUBLISHED,
                    platform_post_id: resultId,
                    published_at: new Date().toISOString(),
                    error_message: null,
                })
                    .eq("id", id);
                yield db_1.supabase.from("automation_logs").insert({
                    user_id,
                    action: "post_retry_success",
                    level: constants_1.LogLevel.SUCCESS,
                    message: `Retried and published post ${id}`,
                });
                return res.json({ success: true, message: "Post retried successfully" });
            }
            catch (e) {
                const errMsg = e instanceof Error ? e.message : "Retry failed";
                const { id } = req.params;
                yield db_1.supabase
                    .from("generated_posts")
                    .update({ error_message: errMsg })
                    .eq("id", id);
                return res.status(500).json({ error: errMsg });
            }
        });
        // 8. Delete Post
        this.deletePost = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const { id } = req.params;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const { error } = yield db_1.supabase
                    .from("generated_posts")
                    .delete()
                    .eq("id", id)
                    .eq("user_id", user_id); // Security check
                if (error)
                    throw error;
                res.json({ success: true });
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        // --- TEAM MANAGEMENT ---
        this.getTeamMembers = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                // Real DB
                const { data, error } = yield db_1.supabase
                    .from("team_members")
                    .select("*")
                    .order("created_at", { ascending: true });
                if (error) {
                    // If table doesn't exist yet, return empty or self
                    if (error.code === "42P01") {
                        return res.json([
                            {
                                id: "self",
                                email: ((_b = req.user) === null || _b === void 0 ? void 0 : _b.email) || "user",
                                role: "owner",
                                status: "active",
                            },
                        ]);
                    }
                    throw error;
                }
                res.json(data);
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        this.inviteTeamMember = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const { email, role } = req.body;
                // Check for duplicate pending invite
                const { data: existingInvite } = yield db_1.supabase
                    .from("team_members")
                    .select("id")
                    .eq("email", email)
                    .eq("status", "pending")
                    .single();
                if (existingInvite) {
                    return res
                        .status(400)
                        .json({ error: "Invitation already sent to this email." });
                }
                const inviteLink = process.env.FRONTEND_URL
                    ? `${process.env.FRONTEND_URL}/login`
                    : "http://localhost:3000/login";
                // Send Email
                yield this.emailService.sendTeamInvitation(email, role, inviteLink);
                // Real DB - Insert pending member Record
                // Note: In production this should be a robust invite system.
                // For MVP, we insert a record linked to the owner so it appears in the list.
                try {
                    yield db_1.supabase.from("team_members").insert({
                        email,
                        role,
                        status: "pending",
                        invited_by: user_id,
                        user_id: user_id, // Linking to self/owner for visibility (MVP hack)
                    });
                }
                catch (dbError) {
                    console.warn("Could not save team_member record, but email was sent.", dbError);
                }
                res.json({ success: true, message: `Invitation sent to ${email}` });
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        this.removeTeamMember = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const { id } = req.params;
                const { error } = yield db_1.supabase
                    .from("team_members")
                    .delete()
                    .eq("id", id);
                if (error)
                    throw error;
                res.json({ success: true });
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        // 8. Get Analytics
        this.getAnalytics = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const { days = 30, platform } = req.query;
                const limit = parseInt(days) || 30;
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - limit);
                // Aggregate by date (in case multiple accounts)
                // Since Supabase doesn't do 'group by' easily via JS client without RPC sometimes,
                // we fetch all rows and aggregate in JS for MVP.
                let query = db_1.supabase
                    .from("analytics_daily")
                    .select("date, impressions, clicks, likes, comments, shares")
                    .eq("user_id", user_id)
                    .gte("date", startDate.toISOString().split("T")[0])
                    .order("date", { ascending: true });
                if (platform && platform !== "all") {
                    query = query.eq("platform", platform);
                }
                const { data, error } = yield query;
                if (error) {
                    console.error("Analytics fetch error:", error);
                    // Handle "relation does not exist" gracefully if migration missing
                    if (error.code === "42P01") {
                        const d = new Date().toISOString().split("T")[0];
                        return res.json({ data: [] });
                    }
                    throw error;
                }
                // Aggregate by date
                const aggregated = {};
                data === null || data === void 0 ? void 0 : data.forEach((row) => {
                    if (!aggregated[row.date]) {
                        aggregated[row.date] = {
                            date: row.date,
                            impressions: 0,
                            clicks: 0,
                            engagement: 0,
                        };
                    }
                    aggregated[row.date].impressions += row.impressions || 0;
                    aggregated[row.date].clicks += row.clicks || 0;
                    aggregated[row.date].engagement +=
                        row.likes + row.comments + row.shares || 0;
                });
                const result = Object.values(aggregated).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                res.json({ data: result });
            }
            catch (e) {
                console.error("getAnalytics Error:", e);
                res.status(500).json({ error: e.message });
            }
        });
        this.exportAnalytics = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const limit = 30; // Last 30 days
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - limit);
                let data = [];
                const { data: realData } = yield db_1.supabase
                    .from("analytics_daily")
                    .select("date, impressions, clicks, likes, comments, shares")
                    .eq("user_id", user_id)
                    .gte("date", startDate.toISOString().split("T")[0])
                    .order("date", { ascending: true });
                data = realData || [];
                // Convert to CSV
                const headers = [
                    "Date",
                    "Impressions",
                    "Clicks",
                    "Likes",
                    "Comments",
                    "Shares",
                ];
                const csvRows = [headers.join(",")];
                data.forEach((row) => {
                    const values = [
                        row.date,
                        row.impressions,
                        row.clicks,
                        row.likes,
                        row.comments,
                        row.shares,
                    ];
                    csvRows.push(values.join(","));
                });
                const csvString = csvRows.join("\n");
                res.setHeader("Content-Type", "text/csv");
                res.setHeader("Content-Disposition", `attachment; filename="analytics_export_${new Date().toISOString().split("T")[0]}.csv"`);
                res.send(csvString);
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        // --- GETTERS for Frontend ---
        this.getConfig = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const platform = req.query.platform || constants_1.Platform.LINKEDIN;
                const { data } = yield db_1.supabase
                    .from("automation_configs")
                    .select("*")
                    .eq("user_id", user_id)
                    .eq("platform", platform)
                    .single();
                res.json(data || {});
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        this.getTrends = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 20;
                const offset = (page - 1) * limit;
                const { category } = req.query;
                let query = db_1.supabase
                    .from("detected_trends")
                    .select("*", { count: "exact" });
                if (category && category !== "All") {
                    // @ts-ignore
                    query = query.eq("category", category);
                }
                const { data, count, error } = yield query
                    .order("velocity_score", { ascending: false })
                    .range(offset, offset + limit - 1);
                if (error) {
                    console.error("❌ getTrends Supabase Error:", error);
                    throw error;
                }
                res.json({ data, meta: { page, limit, total: count } });
            }
            catch (e) {
                console.error("❌ getTrends Exception:", e);
                res.status(500).json({ error: e.message });
            }
        });
        this.getPosts = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                const offset = (page - 1) * limit;
                const { status, platform, startDate, endDate } = req.query; // Added date filters
                let query = db_1.supabase
                    .from("generated_posts")
                    .select("*", { count: "exact" });
                // Filters
                query = query.eq("user_id", user_id);
                if (status) {
                    // Handle multiple statuses like "published,failed"
                    if (typeof status === 'string' && status.includes(',')) {
                        const statusList = status.split(',');
                        query = query.in("status", statusList);
                    }
                    else {
                        query = query.eq("status", status);
                    }
                }
                // JSONB Filter for target platform routing
                if (platform && platform !== "all") {
                    query = query.contains("ai_metadata", { platform });
                }
                // Date Range Filter
                if (startDate) {
                    query = query.gte("scheduled_time", startDate);
                }
                if (endDate) {
                    query = query.lte("scheduled_time", endDate);
                }
                // Sorting & Pagination
                query = query
                    .order("created_at", { ascending: false })
                    .range(offset, offset + limit - 1);
                const { data, count, error } = yield query;
                if (error)
                    throw error;
                res.json({ data, meta: { page, limit, total: count } });
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        // --- ANALYTICS ---
        this.getDashboardStats = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                // 1. Pending Approvals
                const { count: pendingCount } = yield db_1.supabase
                    .from("generated_posts")
                    .select("*", { count: "exact", head: true })
                    .eq("user_id", user_id)
                    .eq("status", "needs_approval");
                // 2. Published This Week
                const startOfWeek = new Date();
                startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
                const { count: publishedCount } = yield db_1.supabase
                    .from("generated_posts")
                    .select("*", { count: "exact", head: true })
                    .eq("user_id", user_id)
                    .eq("status", "published")
                    .gte("published_at", startOfWeek.toISOString());
                // 3. Activity Feed (Recent Posts)
                const { data: recentActivity } = yield db_1.supabase
                    .from("generated_posts")
                    .select("id, content, status, platform_post_id, created_at, trend_id")
                    .eq("user_id", user_id)
                    .order("created_at", { ascending: false })
                    .limit(5);
                res.json({
                    metrics: {
                        total_reach: "0", // Placeholder until real LinkedIn analytics
                        engagement_rate: "0%", // Placeholder
                        pending_approvals: pendingCount || 0,
                        published_this_week: publishedCount || 0,
                    },
                    activity: recentActivity || [],
                });
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        // --- LOGS ---
        this.getLogs = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const { data, error } = yield db_1.supabase
                    .from("automation_logs")
                    .select("*")
                    .eq("user_id", user_id)
                    .order("created_at", { ascending: false })
                    .limit(100);
                if (error)
                    throw error;
                res.json(data);
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        // --- PROFILE ---
        this.getProfile = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const { data, error } = yield db_1.supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", user_id)
                    .single();
                if (error && error.code !== "PGRST116")
                    throw error; // PGRST116 is "no rows", which is fine for new users
                res.json(data || {});
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        this.updateProfile = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const { full_name, avatar_url, bio, role, niche, goals, onboarding_completed, } = req.body;
                const { data, error } = yield db_1.supabase
                    .from("profiles")
                    .upsert({
                    id: user_id,
                    email: (_b = req.user) === null || _b === void 0 ? void 0 : _b.email, // Ensure email is synced from auth
                    full_name,
                    avatar_url,
                    bio,
                    role,
                    niche,
                    goals,
                    onboarding_completed,
                    updated_at: new Date().toISOString(),
                })
                    .select()
                    .single();
                if (error)
                    throw error;
                // Sync onboarding status to auth.users metadata so middleware allows redirect
                if (onboarding_completed !== undefined) {
                    yield db_1.supabase.auth.admin.updateUserById(user_id, {
                        user_metadata: { onboarding_completed }
                    }).catch(err => console.warn("Failed to sync auth user_metadata:", err));
                }
                res.json({ success: true, profile: data });
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        // --- CONNECTIONS ---
        this.getConnections = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const { data } = yield db_1.supabase
                    .from("linked_accounts")
                    .select("*")
                    .eq("user_id", user_id);
                const mappedData = (data === null || data === void 0 ? void 0 : data.map(d => (Object.assign(Object.assign({}, d), { status: d.status || d.connection_status })))) || [];
                res.json(mappedData);
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        // 8. Rewrite Content (Inline Editor)
        this.rewriteContent = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user_id = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!user_id)
                    return res.status(401).json({ error: "Unauthorized" });
                const { text, instruction, platform } = req.body;
                if (!text || !instruction) {
                    return res.status(400).json({ error: "text and instruction are required" });
                }
                // Quota check
                const quota = yield this.checkQuota(user_id);
                if (!quota.allowed) {
                    return res.status(403).json({ error: "Monthly AI quota exceeded." });
                }
                const rewritten = yield gemini_service_1.geminiService.rewriteText(text, instruction, user_id, platform);
                res.json({ success: true, rewritten });
            }
            catch (e) {
                console.error("[rewriteContent] Error:", e);
                res.status(500).json({ error: e.message || "Rewrite failed" });
            }
        });
        // --- DEV TOOLS ---
        // --- VERCEL CRON ---
        this.processCronJobs = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                // Vercel Cron sends a Bearer token in Authorization header
                const authHeader = req.headers.authorization;
                if (process.env.CRON_SECRET &&
                    authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
                    return res.status(401).json({ error: "Unauthorized cron request" });
                }
                yield scheduler_service_1.schedulerService.processScheduledPosts();
                res.json({ success: true, message: "Scheduled posts processed" });
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        this.processWeeklyDigestCron = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const authHeader = req.headers.authorization;
                if (process.env.CRON_SECRET &&
                    authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
                    return res.status(401).json({ error: "Unauthorized cron request" });
                }
                yield scheduler_service_1.schedulerService.processWeeklyDigest();
                res.json({ success: true, message: "Weekly digest processed" });
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
        this.seedData = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                if (process.env.NEWSDATA_API_KEY) {
                    return this.scanTrends(req, res);
                }
                res.json({
                    success: true,
                    message: "Mock data seeded (No API keys found)",
                });
            }
            catch (e) {
                res.status(500).json({ error: e.message });
            }
        });
    }
}
exports.AutomationController = AutomationController;
/** Limits per subscription_tier (posts per billing cycle) */
AutomationController.PLAN_LIMITS = {
    free: 10,
    pro: 200,
    enterprise: Infinity,
};
exports.automationController = new AutomationController();
