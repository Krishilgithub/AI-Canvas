import * as cron from "node-cron";
import { supabase } from "../db";
import { linkedInService } from "./linkedin.service";
import { twitterService } from "./twitter.service";
import { slackService } from "./slack.service";
import { redditService } from "./reddit.service";
import { EmailService } from "./email.service";
import { PLATFORM_CHAR_LIMITS } from "../middleware/validation.middleware";

class SchedulerService {
  private job: cron.ScheduledTask | null = null;
  private weeklyJob: cron.ScheduledTask | null = null;
  private emailService = new EmailService();

  // FIX: Guards to prevent concurrent executions if cron ticks overlap
  private isProcessingScheduled = false;
  private isProcessingAutoScheduled = false;
  private isProcessingDigest = false;

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
    if (this.job) this.job.stop();
    if (this.weeklyJob) this.weeklyJob.stop();
  }

  // ── Startup reconciliation ────────────────────────────────────────────────
  // EDGE CASE: Scheduler runs during server restart — ongoing 'in_progress'
  // posts never complete. This resets them to 'needs_approval' on boot.
  private reconcileStuckPostsOnStartup = async () => {
    try {
      // Find all posts that were left 'in_progress' from a previous server
      // crash and reset them so they don't sit orphaned forever
      const { data: stuckPosts } = await supabase
        .from("generated_posts")
        .select("id")
        .eq("status", "in_progress");

      if (stuckPosts && stuckPosts.length > 0) {
        const ids = stuckPosts.map((p: { id: string }) => p.id);
        await supabase
          .from("generated_posts")
          .update({ status: "needs_approval" })
          .in("id", ids);
        console.log(`[Scheduler] Startup: reset ${ids.length} stuck post(s) to 'needs_approval'`);
      }
    } catch (e: unknown) {
      console.error("[Scheduler] Startup reconciliation error:", e instanceof Error ? e.message : e);
    }
  };

  // ── Stuck-post watchdog (runs every 15 min) ───────────────────────────────
  // EDGE CASE: Post published but platform returns error — status stays 'in_progress'
  // if updateStatus also fails. After 15 minutes, reset to 'needs_approval'.
  public reconcileStuckPosts = async () => {
    try {
      const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString(); // 15 minutes ago
      const { data: stuckPosts } = await supabase
        .from("generated_posts")
        .select("id, updated_at")
        .eq("status", "in_progress")
        .lt("updated_at", cutoff);

      if (!stuckPosts || stuckPosts.length === 0) return;

      const ids = stuckPosts.map((p: { id: string }) => p.id);
      await supabase
        .from("generated_posts")
        .update({ status: "needs_approval" })
        .in("id", ids);

      console.warn(`[Scheduler] Watchdog: reset ${ids.length} post(s) stuck in 'in_progress' for >15 min`);
    } catch (e: unknown) {
      console.error("[Scheduler] Stuck-post watchdog error:", e instanceof Error ? e.message : e);
    }
  };

  public processScheduledPosts = async () => {
    // FIX: Prevent concurrent overlapping cron ticks from double-processing
    if (this.isProcessingScheduled) {
      console.warn("[Scheduler] processScheduledPosts already running — skipping tick.");
      return;
    }
    this.isProcessingScheduled = true;
    try {
      const now = new Date().toISOString();

      const { data: posts, error } = await supabase
        .from("generated_posts")
        .select("*")
        .eq("status", "scheduled")
        .not("scheduled_time", "is", null)
        .lte("scheduled_time", now);

      if (error) {
        console.error("[Scheduler] Fetch Error:", error);
        return;
      }

      if (!posts || posts.length === 0) return;

      const postIds = posts.map((p: Record<string, string>) => p.id);
      await supabase
        .from("generated_posts")
        .update({ status: "in_progress" })
        .in("id", postIds)
        .eq("status", "scheduled"); // guard: only update if still scheduled

      console.log(`[Scheduler] Processing ${posts.length} scheduled post(s)...`);

      for (const post of posts) {
        await this.publishPost(post);
      }
    } catch (e: unknown) {
      console.error("[Scheduler] processScheduledPosts error:", e instanceof Error ? e.message : e);
    } finally {
      this.isProcessingScheduled = false;
    }
  };

  public processAutoScheduledPosts = async () => {
    // FIX: Prevent concurrent overlapping auto-post ticks
    if (this.isProcessingAutoScheduled) {
      console.warn("[Scheduler] processAutoScheduledPosts already running — skipping tick.");
      return;
    }
    this.isProcessingAutoScheduled = true;
    try {
      const { data: configs, error: configError } = await supabase
        .from("automation_configs")
        .select("*")
        .eq("auto_post_enabled", true);

      if (configError || !configs) return;

      const now = new Date();

      for (const config of configs) {
        if (!config.preferred_time) continue;

        const userTimeFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: config.timezone || 'UTC',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });

        const userLocalTime = userTimeFormatter.format(now);
        if (userLocalTime !== config.preferred_time) continue;

        if (config.last_posted_at) {
          const lastPostedDate = new Date(config.last_posted_at);
          const diffMs = now.getTime() - lastPostedDate.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);

          if (config.frequency === 'daily' && diffDays < 0.95) continue;
          if (config.frequency === 'alternate_days' && diffDays < 1.95) continue;
          if (config.frequency === 'weekly' && diffDays < 6.95) continue;
        }

        const { data: posts } = await supabase
          .from("generated_posts")
          .select("*, detected_trends(metadata)")
          .eq("user_id", config.user_id)
          .eq("status", "approved")
          .filter("ai_metadata->>platform", "eq", config.platform);

        if (!posts || posts.length === 0) continue;

        // Sort by impact score — use any for Supabase's untyped join return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        posts.sort((a: any, b: any) => {
          const scoreA = a.detected_trends?.metadata?.impact_score ?? a.ai_metadata?.impact_score ?? 0;
          const scoreB = b.detected_trends?.metadata?.impact_score ?? b.ai_metadata?.impact_score ?? 0;
          return scoreB - scoreA;
        });

        const topPost = posts[0];

        await supabase
          .from("generated_posts")
          .update({ status: "in_progress" })
          .eq("id", topPost.id);

        console.log(`[AutoPoster] Publishing post ${topPost.id} for user ${config.user_id} on ${config.platform}`);
        await this.publishPost(topPost);

        await supabase
          .from("automation_configs")
          .update({ last_posted_at: new Date().toISOString() })
          .eq("id", config.id);
      }
    } catch (e: unknown) {
      console.error("[Scheduler] processAutoScheduledPosts error:", e instanceof Error ? e.message : e);
    } finally {
      this.isProcessingAutoScheduled = false;
    }
  };

  private publishPost = async (post: Record<string, unknown>) => {
    try {
      const meta = post.ai_metadata as Record<string, string> | undefined;
      const platform = meta?.platform || "linkedin";

      // EDGE CASE: Detect expired/missing OAuth token before attempting to publish
      // Avoids a silent failure from the platform API with a confusing error
      if (platform !== "slack") {
        const { data: connection } = await supabase
          .from("linked_accounts")
          .select("id, token_expires_at")
          .eq("user_id", post.user_id as string)
          .eq("platform", platform)
          .single();

        if (!connection) {
          const msg = `${platform} account is not connected. Please reconnect in Settings.`;
          console.warn(`[Scheduler] OAuth missing for post ${post.id} on ${platform}`);
          await this.updateStatus(post.id as string, "failed", msg);
          // Optionally notify the user via email
          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("email")
              .eq("id", post.user_id as string)
              .single();
            if (profile?.email) {
              // Use a generic email if sendConnectionRequired doesn't exist yet
              console.warn(`[Scheduler] User ${profile.email} needs to reconnect ${platform}`);
            }
          } catch { /* suppress notification lookup errors */ }
          return;
        }

        // Check if token is expired (if token_expires_at is stored)
        if (connection.token_expires_at) {
          const expiresAt = new Date(connection.token_expires_at);
          if (expiresAt <= new Date()) {
            const msg = `${platform} OAuth token expired. Please reconnect in Settings → Integrations.`;
            console.warn(`[Scheduler] Token expired for post ${post.id} on ${platform}`);
            await this.updateStatus(post.id as string, "failed", msg);
            return;
          }
        }
      }

      // EDGE CASE: Validate character limit before sending to platform API
      // Prevents a silent rejection from the platform API for posts over the limit
      const content = post.content as string;
      const charLimit = PLATFORM_CHAR_LIMITS[platform.toLowerCase()];
      if (charLimit && content && content.length > charLimit) {
        const msg = `Content exceeds ${platform} character limit (${content.length}/${charLimit}). Please edit the post.`;
        console.warn(`[Scheduler] Char limit exceeded for post ${post.id}: ${content.length}/${charLimit}`);
        await this.updateStatus(post.id as string, "failed", msg);
        return;
      }

      let resultId: string | null = null;

      if (platform === "twitter") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tweetRes = (await twitterService.postTweet(post.user_id as string, post.content as string)) as any;
        resultId = tweetRes?.data?.id || "twitter_posted";
      } else if (platform === "slack") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const slackRes = (await slackService.sendMessage(post.user_id as string, post.content as string)) as any;
        resultId = slackRes?.ts || "slack_posted";
      } else if (platform === "reddit") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const redditRes = (await redditService.postToReddit(post.user_id as string, post.content as string)) as any;
        resultId = redditRes?.url || "reddit_posted";
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (await linkedInService.createPost(post.user_id as string, post.content as string, post.media_urls as string[])) as any;
        resultId = result?.platform_post_id || null;
      }

      await this.updateStatus(post.id as string, "published", null, resultId ?? undefined);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[Scheduler] Failed to publish post ${post.id}:`, msg);
      await this.updateStatus(post.id as string, "failed", msg);
    }
  };

  private updateStatus = async (
    postId: string,
    status: string,
    error?: string | null,
    platformId?: string,
  ) => {
    await supabase
      .from("generated_posts")
      .update({
        status,
        published_at: status === "published" ? new Date().toISOString() : null,
        platform_post_id: platformId,
      })
      .eq("id", postId);
  };

  public processWeeklyDigest = async () => {
    if (this.isProcessingDigest) {
      console.warn("[Scheduler] processWeeklyDigest already running — skipping tick.");
      return;
    }
    this.isProcessingDigest = true;
    console.log("[Scheduler] Processing Weekly Digest...");
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, email, notification_preferences");

      if (error) throw error;
      if (!profiles) return;

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      for (const profile of profiles) {
        const prefs = profile.notification_preferences as Record<string, boolean> | null;
        if (!prefs?.weekly_digest || !profile.email) continue;

        // FIX: Query real published post count for last 7 days
        const { count: publishedCount } = await supabase
          .from("generated_posts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", profile.id)
          .eq("status", "published")
          .gte("published_at", oneWeekAgo.toISOString());

        // FIX: Query real engagement data from analytics_daily
        const { data: analyticsRows } = await supabase
          .from("analytics_daily")
          .select("impressions, engagement")
          .eq("user_id", profile.id)
          .gte("date", oneWeekAgo.toISOString().split("T")[0]);

        const totalImpressions = analyticsRows?.reduce(
          (sum: number, r: { impressions: number }) => sum + (r.impressions || 0), 0
        ) ?? 0;
        const totalEngagements = analyticsRows?.reduce(
          (sum: number, r: { engagement: number }) => sum + (r.engagement || 0), 0
        ) ?? 0;
        const engagementRate = totalImpressions > 0
          ? ((totalEngagements / totalImpressions) * 100).toFixed(1) + "%"
          : "N/A";

        // FIX: Removed Math.random() — stats are now real (or zero if no data yet)
        const stats = {
          impressions: totalImpressions,
          engagement: engagementRate,
          posts_published: publishedCount ?? 0,
          // Follower growth requires platform API — marked explicitly as unavailable
          followers: "N/A (platform API required)",
          data_source: "real",
        };

        console.log(`[Scheduler] Sending digest to ${profile.email} — ${publishedCount ?? 0} posts published`);
        await this.emailService.sendWeeklyDigest(profile.email, stats);
      }
    } catch (e: unknown) {
      console.error("[Scheduler] Weekly Digest Error:", e instanceof Error ? e.message : e);
    } finally {
      this.isProcessingDigest = false;
    }
  };
}

export const schedulerService = new SchedulerService();
