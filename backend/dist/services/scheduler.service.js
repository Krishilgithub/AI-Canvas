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
class SchedulerService {
    constructor() {
        this.job = null;
        this.weeklyJob = null;
        this.emailService = new email_service_1.EmailService();
        this.processScheduledPosts = () => __awaiter(this, void 0, void 0, function* () {
            try {
                const now = new Date().toISOString();
                // Only fetch posts that: (1) are scheduled, (2) have a scheduled_time that has passed
                const { data: posts, error } = yield db_1.supabase
                    .from("generated_posts")
                    .select("*")
                    .eq("status", "scheduled")
                    .not("scheduled_time", "is", null)
                    .lte("scheduled_time", now);
                if (error) {
                    console.error("❌ Scheduler Fetch Error:", error);
                    return;
                }
                if (!posts || posts.length === 0)
                    return;
                // Immediately lock all fetched posts to 'in_progress' to prevent double-processing
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
                console.error("❌ Scheduler Error:", e);
            }
        });
        this.publishPost = (post) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const platform = ((_a = post.ai_metadata) === null || _a === void 0 ? void 0 : _a.platform) || "linkedin";
                let resultId = null;
                if (platform === "twitter") {
                    const tweetRes = yield twitter_service_1.twitterService.postTweet(post.user_id, post.content);
                    resultId = ((_b = tweetRes === null || tweetRes === void 0 ? void 0 : tweetRes.data) === null || _b === void 0 ? void 0 : _b.id) || "twitter_posted";
                }
                else if (platform === "slack") {
                    const slackRes = yield slack_service_1.slackService.sendMessage(post.user_id, post.content);
                    resultId = (slackRes === null || slackRes === void 0 ? void 0 : slackRes.ts) || "slack_posted";
                }
                else if (platform === "reddit") {
                    const redditRes = yield reddit_service_1.redditService.postToReddit(post.user_id, post.content);
                    resultId = (redditRes === null || redditRes === void 0 ? void 0 : redditRes.url) || "reddit_posted";
                }
                else {
                    // Default: LinkedIn
                    const result = yield linkedin_service_1.linkedInService.createPost(post.user_id, post.content, post.media_urls);
                    resultId = (result === null || result === void 0 ? void 0 : result.platform_post_id) || null;
                }
                yield this.updateStatus(post.id, "published", null, resultId !== null && resultId !== void 0 ? resultId : undefined);
            }
            catch (e) {
                console.error(`❌ Failed to publish post ${post.id}:`, e.message);
                yield this.updateStatus(post.id, "failed", e.message);
            }
        });
        this.updateStatus = (postId, status, error, platformId) => __awaiter(this, void 0, void 0, function* () {
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
            console.log("📧 Processing Weekly Digest...");
            try {
                // 1. Fetch users with digest enabled
                // Note: JSON filtering in Supabase: notification_preferences->>weekly_digest equals 'true'
                const { data: profiles, error } = yield db_1.supabase
                    .from("profiles")
                    .select("id, email, notification_preferences");
                if (error)
                    throw error;
                if (!profiles)
                    return;
                for (const profile of profiles) {
                    const prefs = profile.notification_preferences;
                    if (prefs && prefs.weekly_digest && profile.email) {
                        // 2. Calculate Stats (Mock calculation for now, or real aggregation)
                        // Real aggregation of last 7 days:
                        const oneWeekAgo = new Date();
                        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                        const { count: postsCount } = yield db_1.supabase
                            .from("generated_posts")
                            .select("*", { count: "exact", head: true })
                            .eq("user_id", profile.id)
                            .eq("status", "published")
                            .gte("published_at", oneWeekAgo.toISOString());
                        // Fetch engagement (mocked as we don't have a dedicated analytics table populated yet)
                        const stats = {
                            impressions: (postsCount || 0) * 150 + Math.floor(Math.random() * 500),
                            engagement: Math.floor(Math.random() * 10) + "%",
                            followers: "+" + Math.floor(Math.random() * 20),
                        };
                        // 3. Send Email
                        console.log(`Sending digest to ${profile.email}`);
                        yield this.emailService.sendWeeklyDigest(profile.email, stats);
                    }
                }
            }
            catch (e) {
                console.error("❌ Weekly Digest Error:", e);
            }
        });
    }
    start() {
        console.log("⏰ Scheduler Service Started");
        // Run every minute
        // Run every minute for posts
        this.job = cron.schedule("* * * * *", this.processScheduledPosts);
        // Run weekly on Monday at 9:00 AM for digests
        // Cron syntax: Minute Hour DayMonth Month DayWeek
        this.weeklyJob = cron.schedule("0 9 * * 1", this.processWeeklyDigest);
    }
    stop() {
        if (this.job)
            this.job.stop();
        if (this.weeklyJob)
            this.weeklyJob.stop();
    }
}
exports.schedulerService = new SchedulerService();
