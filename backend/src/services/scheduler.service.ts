import * as cron from "node-cron";
import { supabase } from "../db";
import { linkedInService } from "./linkedin.service";
import { twitterService } from "./twitter.service";
import { slackService } from "./slack.service";
import { redditService } from "./reddit.service";
import { EmailService } from "./email.service";

class SchedulerService {
  private job: cron.ScheduledTask | null = null;
  private weeklyJob: cron.ScheduledTask | null = null;
  private emailService = new EmailService();

  start() {
    console.log("⏰ Scheduler Service Started");
    // Run every minute
    // Run every minute for posts
    this.job = cron.schedule("* * * * *", this.processScheduledPosts);

    // Run weekly on Monday at 9:00 AM for digests
    // Cron syntax: Minute Hour DayMonth Month DayWeek
    this.weeklyJob = cron.schedule("0 9 * * 1", this.processWeeklyDigest);

    // Auto-poster check every 15 minutes (or 5 minutes)
    // Runs frequently to check if any user's local timezone reached their 'preferred_time'
    cron.schedule("*/5 * * * *", this.processAutoScheduledPosts);
  }

  stop() {
    if (this.job) this.job.stop();
    if (this.weeklyJob) this.weeklyJob.stop();
  }

  public processScheduledPosts = async () => {
    try {
      const now = new Date().toISOString();

      // Only fetch posts that: (1) are scheduled, (2) have a scheduled_time that has passed
      const { data: posts, error } = await supabase
        .from("generated_posts")
        .select("*")
        .eq("status", "scheduled")
        .not("scheduled_time", "is", null)
        .lte("scheduled_time", now);

      if (error) {
        console.error("❌ Scheduler Fetch Error:", error);
        return;
      }

      if (!posts || posts.length === 0) return;

      // Immediately lock all fetched posts to 'in_progress' to prevent double-processing
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
    } catch (e) {
      console.error("❌ Scheduler Error:", e);
    }
  };

  public processAutoScheduledPosts = async () => {
    try {
      // 1. Fetch configs with auto_post_enabled = true
      const { data: configs, error: configError } = await supabase
        .from("automation_configs")
        .select("*")
        .eq("auto_post_enabled", true);

      if (configError || !configs) return;

      const now = new Date();

      for (const config of configs) {
        if (!config.preferred_time) continue;

        // 2. Determine if it's the exact hour/minute in the user's timezone
        const userTimeFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: config.timezone || 'UTC',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        
        const userLocalTime = userTimeFormatter.format(now); // e.g. "14:30"
        
        // We run cron every 5 mins, check if we are reasonably close (e.g. matched exactly or within 5 mins)
        // For strict matching: `if (userLocalTime === config.preferred_time)`
        // However, standard HH:mm string matching is fine if cron runs on multiples of 5, 
        // assuming preferred_time is also stored nicely.
        
        // Let's do a strict match for simplicity, assuming user selects 15, 30, 45 mins.
        if (userLocalTime !== config.preferred_time) continue;

        // 3. Check Frequency Condition
        if (config.last_posted_at) {
          const lastPostedDate = new Date(config.last_posted_at);
          const diffMs = now.getTime() - lastPostedDate.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);

          if (config.frequency === 'daily' && diffDays < 0.95) continue;
          if (config.frequency === 'alternate_days' && diffDays < 1.95) continue;
          if (config.frequency === 'weekly' && diffDays < 6.95) continue;
        }

        // 4. Time to post! Find the top-ranked approved post
        // Note: we fetch all approved posts to rank them if there's multiple
        const { data: posts } = await supabase
          .from("generated_posts")
          .select("*, detected_trends(metadata)")
          .eq("user_id", config.user_id)
          .eq("status", "approved")
          .filter("ai_metadata->>platform", "eq", config.platform);

        if (!posts || posts.length === 0) continue;

        // Rank by impact score inside detected_trends metadata
        posts.sort((a: any, b: any) => {
          const scoreA = a.detected_trends?.metadata?.impact_score || a.ai_metadata?.impact_score || 0;
          const scoreB = b.detected_trends?.metadata?.impact_score || b.ai_metadata?.impact_score || 0;
          return scoreB - scoreA;
        });

        const topPost = posts[0];

        // 5. Lock and publish
        await supabase
          .from("generated_posts")
          .update({ status: "in_progress" })
          .eq("id", topPost.id);

        console.log(`[AutoPoster] Publishing top post ${topPost.id} for user ${config.user_id} on ${config.platform}`);
        
        await this.publishPost(topPost);

        // Update last_posted_at
        await supabase
          .from("automation_configs")
          .update({ last_posted_at: new Date().toISOString() })
          .eq("id", config.id);
      }
    } catch (e) {
      console.error("❌ Auto Scheduled Posts Error:", e);
    }
  };

  private publishPost = async (post: any) => {
    try {
      const platform = post.ai_metadata?.platform || "linkedin";
      let resultId: string | null = null;

      if (platform === "twitter") {
        const tweetRes: any = await twitterService.postTweet(post.user_id, post.content);
        resultId = tweetRes?.data?.id || "twitter_posted";
      } else if (platform === "slack") {
        const slackRes: any = await slackService.sendMessage(post.user_id, post.content);
        resultId = slackRes?.ts || "slack_posted";
      } else if (platform === "reddit") {
        const redditRes: any = await redditService.postToReddit(post.user_id, post.content);
        resultId = redditRes?.url || "reddit_posted";
      } else {
        // Default: LinkedIn
        const result = await linkedInService.createPost(post.user_id, post.content, post.media_urls);
        resultId = result?.platform_post_id || null;
      }

      await this.updateStatus(post.id, "published", null, resultId ?? undefined);
    } catch (e: any) {
      console.error(`❌ Failed to publish post ${post.id}:`, e.message);
      await this.updateStatus(post.id, "failed", e.message);
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
    console.log("📧 Processing Weekly Digest...");
    try {
      // 1. Fetch users with digest enabled
      // Note: JSON filtering in Supabase: notification_preferences->>weekly_digest equals 'true'
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, email, notification_preferences");

      if (error) throw error;
      if (!profiles) return;

      for (const profile of profiles) {
        const prefs = profile.notification_preferences as any;
        if (prefs && prefs.weekly_digest && profile.email) {
          // 2. Calculate Stats (Mock calculation for now, or real aggregation)
          // Real aggregation of last 7 days:
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

          const { count: postsCount } = await supabase
            .from("generated_posts")
            .select("*", { count: "exact", head: true })
            .eq("user_id", profile.id)
            .eq("status", "published")
            .gte("published_at", oneWeekAgo.toISOString());

          // Fetch engagement (mocked as we don't have a dedicated analytics table populated yet)
          const stats = {
            impressions:
              (postsCount || 0) * 150 + Math.floor(Math.random() * 500),
            engagement: Math.floor(Math.random() * 10) + "%",
            followers: "+" + Math.floor(Math.random() * 20),
          };

          // 3. Send Email
          console.log(`Sending digest to ${profile.email}`);
          await this.emailService.sendWeeklyDigest(profile.email, stats);
        }
      }
    } catch (e) {
      console.error("❌ Weekly Digest Error:", e);
    }
  };
}

export const schedulerService = new SchedulerService();
