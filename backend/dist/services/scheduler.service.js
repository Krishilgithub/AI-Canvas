"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.schedulerService = void 0;
const cron = __importStar(require("node-cron"));
const db_1 = require("../db");
const linkedin_service_1 = require("./linkedin.service");
const twitter_service_1 = require("./twitter.service");
const slack_service_1 = require("./slack.service");
const reddit_service_1 = require("./reddit.service");
const email_service_1 = require("./email.service");
const validation_middleware_1 = require("../middleware/validation.middleware");
const socket_service_1 = require("./socket.service");
class SchedulerService {
    constructor() {
        this.job = null;
        this.weeklyJob = null;
        this.emailService = new email_service_1.EmailService();
        // FIX: Guards to prevent concurrent executions if cron ticks overlap
        this.isProcessingScheduled = false;
        this.isProcessingAutoScheduled = false;
        this.isProcessingDigest = false;
        // ── Startup reconciliation ────────────────────────────────────────────────
        // EDGE CASE: Scheduler runs during server restart — ongoing 'in_progress'
        // posts never complete. This resets them to 'needs_approval' on boot.
        this.reconcileStuckPostsOnStartup = () => __awaiter(this, void 0, void 0, function* () {
            try {
                // Find all posts that were left 'in_progress' from a previous server
                // crash and reset them so they don't sit orphaned forever
                const { data: stuckPosts } = yield db_1.supabase
                    .from("generated_posts")
                    .select("id")
                    .eq("status", "in_progress");
                if (stuckPosts && stuckPosts.length > 0) {
                    const ids = stuckPosts.map((p) => p.id);
                    yield db_1.supabase
                        .from("generated_posts")
                        .update({ status: "needs_approval" })
                        .in("id", ids);
                    console.log(`[Scheduler] Startup: reset ${ids.length} stuck post(s) to 'needs_approval'`);
                }
            }
            catch (e) {
                console.error("[Scheduler] Startup reconciliation error:", e instanceof Error ? e.message : e);
            }
        });
        // ── Stuck-post watchdog (runs every 15 min) ───────────────────────────────
        // EDGE CASE: Post published but platform returns error — status stays 'in_progress'
        // if updateStatus also fails. After 15 minutes, reset to 'needs_approval'.
        this.reconcileStuckPosts = () => __awaiter(this, void 0, void 0, function* () {
            try {
                const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString(); // 15 minutes ago
                const { data: stuckPosts } = yield db_1.supabase
                    .from("generated_posts")
                    .select("id, updated_at")
                    .eq("status", "in_progress")
                    .lt("updated_at", cutoff);
                if (!stuckPosts || stuckPosts.length === 0)
                    return;
                const ids = stuckPosts.map((p) => p.id);
                yield db_1.supabase
                    .from("generated_posts")
                    .update({ status: "needs_approval" })
                    .in("id", ids);
                console.warn(`[Scheduler] Watchdog: reset ${ids.length} post(s) stuck in 'in_progress' for >15 min`);
            }
            catch (e) {
                console.error("[Scheduler] Stuck-post watchdog error:", e instanceof Error ? e.message : e);
            }
        });
        this.processScheduledPosts = () => __awaiter(this, void 0, void 0, function* () {
            // FIX: Prevent concurrent overlapping cron ticks from double-processing
            if (this.isProcessingScheduled) {
                console.warn("[Scheduler] processScheduledPosts already running — skipping tick.");
                return;
            }
            this.isProcessingScheduled = true;
            try {
                const now = new Date().toISOString();
                const { data: posts, error } = yield db_1.supabase
                    .from("generated_posts")
                    .select("*")
                    .eq("status", "scheduled")
                    .not("scheduled_time", "is", null)
                    .lte("scheduled_time", now);
                if (error) {
                    console.error("[Scheduler] Fetch Error:", error);
                    return;
                }
                if (!posts || posts.length === 0)
                    return;
                const postIds = posts.map((p) => p.id);
                yield db_1.supabase
                    .from("generated_posts")
                    .update({ status: "in_progress" })
                    .in("id", postIds)
                    .eq("status", "scheduled"); // guard: only update if still scheduled
                console.log(`[Scheduler] Processing ${posts.length} scheduled post(s)...`);
                for (const post of posts) {
                    yield this.publishPost(post);
                }
            }
            catch (e) {
                console.error("[Scheduler] processScheduledPosts error:", e instanceof Error ? e.message : e);
            }
            finally {
                this.isProcessingScheduled = false;
            }
        });
        this.processAutoScheduledPosts = () => __awaiter(this, void 0, void 0, function* () {
            // FIX: Prevent concurrent overlapping auto-post ticks
            if (this.isProcessingAutoScheduled) {
                console.warn("[Scheduler] processAutoScheduledPosts already running — skipping tick.");
                return;
            }
            this.isProcessingAutoScheduled = true;
            try {
                const { data: configs, error: configError } = yield db_1.supabase
                    .from("automation_configs")
                    .select("*")
                    .eq("auto_post_enabled", true);
                if (configError || !configs)
                    return;
                const now = new Date();
                for (const config of configs) {
                    if (!config.preferred_time)
                        continue;
                    const userTimeFormatter = new Intl.DateTimeFormat('en-US', {
                        timeZone: config.timezone || 'UTC',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    });
                    const userLocalTime = userTimeFormatter.format(now);
                    if (userLocalTime !== config.preferred_time)
                        continue;
                    if (config.last_posted_at) {
                        const lastPostedDate = new Date(config.last_posted_at);
                        const diffMs = now.getTime() - lastPostedDate.getTime();
                        const diffDays = diffMs / (1000 * 60 * 60 * 24);
                        if (config.frequency === 'daily' && diffDays < 0.95)
                            continue;
                        if (config.frequency === 'alternate_days' && diffDays < 1.95)
                            continue;
                        if (config.frequency === 'weekly' && diffDays < 6.95)
                            continue;
                    }
                    const { data: posts } = yield db_1.supabase
                        .from("generated_posts")
                        .select("*, detected_trends(metadata)")
                        .eq("user_id", config.user_id)
                        .eq("status", "approved")
                        .filter("ai_metadata->>platform", "eq", config.platform);
                    if (!posts || posts.length === 0)
                        continue;
                    // Sort by impact score — use any for Supabase's untyped join return
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    posts.sort((a, b) => {
                        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
                        const scoreA = (_e = (_c = (_b = (_a = a.detected_trends) === null || _a === void 0 ? void 0 : _a.metadata) === null || _b === void 0 ? void 0 : _b.impact_score) !== null && _c !== void 0 ? _c : (_d = a.ai_metadata) === null || _d === void 0 ? void 0 : _d.impact_score) !== null && _e !== void 0 ? _e : 0;
                        const scoreB = (_k = (_h = (_g = (_f = b.detected_trends) === null || _f === void 0 ? void 0 : _f.metadata) === null || _g === void 0 ? void 0 : _g.impact_score) !== null && _h !== void 0 ? _h : (_j = b.ai_metadata) === null || _j === void 0 ? void 0 : _j.impact_score) !== null && _k !== void 0 ? _k : 0;
                        return scoreB - scoreA;
                    });
                    const topPost = posts[0];
                    yield db_1.supabase
                        .from("generated_posts")
                        .update({ status: "in_progress" })
                        .eq("id", topPost.id);
                    console.log(`[AutoPoster] Publishing post ${topPost.id} for user ${config.user_id} on ${config.platform}`);
                    yield this.publishPost(topPost);
                    yield db_1.supabase
                        .from("automation_configs")
                        .update({ last_posted_at: new Date().toISOString() })
                        .eq("id", config.id);
                }
            }
            catch (e) {
                console.error("[Scheduler] processAutoScheduledPosts error:", e instanceof Error ? e.message : e);
            }
            finally {
                this.isProcessingAutoScheduled = false;
            }
        });
        this.publishPost = (post) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const meta = post.ai_metadata;
                const platform = (meta === null || meta === void 0 ? void 0 : meta.platform) || "linkedin";
                // EDGE CASE: Detect expired/missing OAuth token before attempting to publish
                // Avoids a silent failure from the platform API with a confusing error
                if (platform !== "slack") {
                    const { data: connection } = yield db_1.supabase
                        .from("linked_accounts")
                        .select("id, token_expires_at")
                        .eq("user_id", post.user_id)
                        .eq("platform", platform)
                        .single();
                    if (!connection) {
                        const msg = `${platform} account is not connected. Please reconnect in Settings.`;
                        console.warn(`[Scheduler] OAuth missing for post ${post.id} on ${platform}`);
                        yield this.updateStatus(post.id, "failed", msg);
                        // Optionally notify the user via email
                        try {
                            const { data: profile } = yield db_1.supabase
                                .from("profiles")
                                .select("email")
                                .eq("id", post.user_id)
                                .single();
                            if (profile === null || profile === void 0 ? void 0 : profile.email) {
                                // Use a generic email if sendConnectionRequired doesn't exist yet
                                console.warn(`[Scheduler] User ${profile.email} needs to reconnect ${platform}`);
                            }
                        }
                        catch ( /* suppress notification lookup errors */_b) { /* suppress notification lookup errors */ }
                        return;
                    }
                    // Check if token is expired (if token_expires_at is stored)
                    if (connection.token_expires_at) {
                        const expiresAt = new Date(connection.token_expires_at);
                        if (expiresAt <= new Date()) {
                            const msg = `${platform} OAuth token expired. Please reconnect in Settings → Integrations.`;
                            console.warn(`[Scheduler] Token expired for post ${post.id} on ${platform}`);
                            yield this.updateStatus(post.id, "failed", msg);
                            return;
                        }
                    }
                }
                // EDGE CASE: Validate character limit before sending to platform API
                // Prevents a silent rejection from the platform API for posts over the limit
                const content = post.content;
                const charLimit = validation_middleware_1.PLATFORM_CHAR_LIMITS[platform.toLowerCase()];
                if (charLimit && content && content.length > charLimit) {
                    const msg = `Content exceeds ${platform} character limit (${content.length}/${charLimit}). Please edit the post.`;
                    console.warn(`[Scheduler] Char limit exceeded for post ${post.id}: ${content.length}/${charLimit}`);
                    yield this.updateStatus(post.id, "failed", msg);
                    return;
                }
                let resultId = null;
                if (platform === "twitter") {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const tweetRes = (yield twitter_service_1.twitterService.postTweet(post.user_id, post.content));
                    resultId = ((_a = tweetRes === null || tweetRes === void 0 ? void 0 : tweetRes.data) === null || _a === void 0 ? void 0 : _a.id) || "twitter_posted";
                }
                else if (platform === "slack") {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const slackRes = (yield slack_service_1.slackService.sendMessage(post.user_id, post.content));
                    resultId = (slackRes === null || slackRes === void 0 ? void 0 : slackRes.ts) || "slack_posted";
                }
                else if (platform === "reddit") {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const redditRes = (yield reddit_service_1.redditService.postToReddit(post.user_id, post.content));
                    resultId = (redditRes === null || redditRes === void 0 ? void 0 : redditRes.url) || "reddit_posted";
                }
                else {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const result = (yield linkedin_service_1.linkedInService.createPost(post.user_id, post.content, post.media_urls));
                    resultId = (result === null || result === void 0 ? void 0 : result.platform_post_id) || null;
                }
                yield this.updateStatus(post.id, "published", null, resultId !== null && resultId !== void 0 ? resultId : undefined);
            }
            catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                console.error(`[Scheduler] Failed to publish post ${post.id}:`, msg);
                yield this.updateStatus(post.id, "failed", msg);
            }
        });
        this.updateStatus = (postId, status, error, platformId) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            // Create an in-app notification before updating the status
            if (status === "failed" || status === "published") {
                try {
                    const { data: post } = yield db_1.supabase
                        .from("generated_posts")
                        .select("user_id, ai_metadata")
                        .eq("id", postId)
                        .single();
                    if (post) {
                        const user_id = post.user_id;
                        const platform = ((_a = post.ai_metadata) === null || _a === void 0 ? void 0 : _a.platform) || "unknown";
                        const notification = {
                            user_id,
                            type: status === "failed" ? "post_failed" : "automation_success",
                            title: status === "failed" ? "Post failed to publish" : "Post published successfully",
                            message: status === "failed" ? (error || "Unknown error") : `Your post was successfully published to ${platform}.`,
                            metadata: { platform, postId },
                        };
                        const { data: inserted } = yield db_1.supabase
                            .from("notifications")
                            .insert(notification)
                            .select()
                            .single();
                        if (inserted) {
                            socket_service_1.socketService.pushNotification(user_id, inserted);
                        }
                    }
                }
                catch (err) {
                    console.error("[Scheduler] Failed to create notification:", err);
                }
            }
            yield db_1.supabase
                .from("generated_posts")
                .update({
                status,
                published_at: status === "published" ? new Date().toISOString() : null,
                platform_post_id: platformId,
            })
                .eq("id", postId);
        });
        this.processWeeklyDigest = () => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            if (this.isProcessingDigest) {
                console.warn("[Scheduler] processWeeklyDigest already running — skipping tick.");
                return;
            }
            this.isProcessingDigest = true;
            console.log("[Scheduler] Processing Weekly Digest...");
            try {
                const { data: profiles, error } = yield db_1.supabase
                    .from("profiles")
                    .select("id, email, notification_preferences");
                if (error)
                    throw error;
                if (!profiles)
                    return;
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                for (const profile of profiles) {
                    const prefs = profile.notification_preferences;
                    if (!(prefs === null || prefs === void 0 ? void 0 : prefs.weekly_digest) || !profile.email)
                        continue;
                    // FIX: Query real published post count for last 7 days
                    const { count: publishedCount } = yield db_1.supabase
                        .from("generated_posts")
                        .select("*", { count: "exact", head: true })
                        .eq("user_id", profile.id)
                        .eq("status", "published")
                        .gte("published_at", oneWeekAgo.toISOString());
                    // FIX: Query real engagement data from analytics_daily
                    const { data: analyticsRows } = yield db_1.supabase
                        .from("analytics_daily")
                        .select("impressions, engagement")
                        .eq("user_id", profile.id)
                        .gte("date", oneWeekAgo.toISOString().split("T")[0]);
                    const totalImpressions = (_a = analyticsRows === null || analyticsRows === void 0 ? void 0 : analyticsRows.reduce((sum, r) => sum + (r.impressions || 0), 0)) !== null && _a !== void 0 ? _a : 0;
                    const totalEngagements = (_b = analyticsRows === null || analyticsRows === void 0 ? void 0 : analyticsRows.reduce((sum, r) => sum + (r.engagement || 0), 0)) !== null && _b !== void 0 ? _b : 0;
                    const engagementRate = totalImpressions > 0
                        ? ((totalEngagements / totalImpressions) * 100).toFixed(1) + "%"
                        : "N/A";
                    // FIX: Removed Math.random() — stats are now real (or zero if no data yet)
                    const stats = {
                        impressions: totalImpressions,
                        engagement: engagementRate,
                        posts_published: publishedCount !== null && publishedCount !== void 0 ? publishedCount : 0,
                        // Follower growth requires platform API — marked explicitly as unavailable
                        followers: "N/A (platform API required)",
                        data_source: "real",
                    };
                    console.log(`[Scheduler] Sending digest to ${profile.email} — ${publishedCount !== null && publishedCount !== void 0 ? publishedCount : 0} posts published`);
                    yield this.emailService.sendWeeklyDigest(profile.email, stats);
                }
            }
            catch (e) {
                console.error("[Scheduler] Weekly Digest Error:", e instanceof Error ? e.message : e);
            }
            finally {
                this.isProcessingDigest = false;
            }
        });
    }
    start() {
        console.log("[Scheduler] Service Started");
        // EDGE CASE FIX: On startup, reconcile any posts that were stuck
        // 'in_progress' from a previous server crash or restart
        this.reconcileStuckPostsOnStartup();
        // Run every minute for scheduled posts
        this.job = cron.schedule("* * * * *", this.processScheduledPosts);
        // Run weekly on Monday at 9:00 AM for digests
        this.weeklyJob = cron.schedule("0 9 * * 1", this.processWeeklyDigest);
        // Auto-poster check every 5 minutes
        cron.schedule("*/5 * * * *", this.processAutoScheduledPosts);
        // EDGE CASE FIX: Stuck-post watchdog — every 15 minutes, reset posts that
        // have been 'in_progress' for more than 15 minutes (platform error, crash, etc.)
        cron.schedule("*/15 * * * *", this.reconcileStuckPosts);
    }
    stop() {
        if (this.job)
            this.job.stop();
        if (this.weeklyJob)
            this.weeklyJob.stop();
    }
}
exports.schedulerService = new SchedulerService();
