import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { supabase } from "../db";
import { linkedInService, MockLinkedInService, RealLinkedInService } from "../services/linkedin.service";
import { twitterService } from "../services/twitter.service";
import { instagramService } from "../services/instagram.service";
import { slackService } from "../services/slack.service";
import { redditService } from "../services/reddit.service";
import { newsService } from "../services/news.service";
import { geminiService } from "../services/gemini.service";
import { workflowService } from "../services/workflow.service";
import { Platform, PostStatus, LogLevel } from "../constants";
import { EmailService } from "../services/email.service";
import { schedulerService } from "../services/scheduler.service";

export class AutomationController {
  private emailService = new EmailService();

  /** Limits per subscription_tier (posts per billing cycle) */
  private static readonly PLAN_LIMITS: Record<string, number> = {
    free: 10,
    pro: 200,
    enterprise: Infinity,
  };

  /** Returns true if user is within their quota, false if exceeded */
  private checkQuota = async (
    user_id: string,
  ): Promise<{ allowed: boolean; used: number; limit: number; tier: string }> => {
    // 1. Get user tier
    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("id", user_id)
      .single();

    const tier = (user?.subscription_tier || "free").toLowerCase();
    const limit = AutomationController.PLAN_LIMITS[tier] ?? 10;

    // 2. Count AI-generated posts this calendar month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from("generated_posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user_id)
      .gte("created_at", startOfMonth.toISOString());

    const used = count || 0;
    return { allowed: used < limit, used, limit, tier };
  };

  // 1. Save Configuration
  saveConfig = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      const {
        platform, // Get platform from body
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
      } = req.body;

      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      // Validate platform
      if (
        !platform ||
        !Object.values(Platform).includes(platform as Platform)
      ) {
        // Default to LinkedIn if not provided for backward compat, but best to enforce
        // For now, let's strictly require it or default to LinkedIn with warning?
        // Let's default to LinkedIn if missing to not break existing calls
      }
      const targetPlatform = platform || Platform.LINKEDIN;

      const { data, error } = await supabase
        .from("automation_configs")
        .upsert(
          {
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
          },
          { onConflict: "user_id, platform" },
        )
        .select()
        .single();

      if (error) throw error;

      res.json({ success: true, config: data });
    } catch (error: any) {
      console.error("saveConfig error:", error);
      const errMsg = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
      res.status(500).json({ error: errMsg || "Unknown error occurred" });
    }
  };


  // Scan Real Trends — uses the Advanced Trend Intelligence System
  scanTrends = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      let niches: string[] = ["Technology", "Business"];
      let keywords: string[] = [];

      const platform = (req.body.platform as Platform) || Platform.LINKEDIN;

      // Fetch config to get niches AND keywords
      const { data: config } = await supabase
        .from("automation_configs")
        .select("niches, keywords")
        .eq("user_id", user_id)
        .eq("platform", platform)
        .single();

      if (config) {
        if (config.niches && config.niches.length > 0) niches = config.niches;
        if (config.keywords && config.keywords.length > 0) keywords = config.keywords;
      }

      // Also fetch user profile for genre context
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("role, niche, goals, bio")
        .eq("id", user_id)
        .single();

      const genre = niches[0] || userProfile?.niche || "Technology";

      // Build search query
      const nicheQuery = niches.map((n) => `"${n}"`).join(" OR ");
      const keywordQuery = keywords.map((k) => `"${k}"`).join(" OR ");
      let query = "";
      if (nicheQuery && keywordQuery) {
        query = `(${nicheQuery}) AND (${keywordQuery})`;
      } else if (nicheQuery) {
        query = nicheQuery;
      } else {
        query = "Technology OR Business";
      }

      console.log(`[SCAN] Fetching news for: ${query} | Platform: ${platform}`);

      // Fetch News
      const newsItems = await newsService.fetchNews(query);

      if (newsItems.length === 0) {
        return res.json({ success: true, message: "No new news found", trends: [] });
      }

      // Advanced Trend Intelligence Analysis
      // FIX: now passes more articles (20 instead of 10) for richer AI analysis
      let analyzedTrends;
      try {
        analyzedTrends = await geminiService.analyzeTrendIntelligence({
          userId: user_id,
          genre,
          keywords,
          target_platform: platform,
          time_window: "last 24 hours",
          platform_data: newsItems.slice(0, 20),
          max_trends: 10,
        });
      } catch (aiError: any) {
        // FIX: Handle AI_UNAVAILABLE gracefully — return unscored articles with clear message
        if (aiError?.message === "AI_UNAVAILABLE") {
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
      const { data: existingTrends } = await supabase
        .from("detected_trends")
        .select("topic")
        .eq("user_id", user_id)
        .gte("created_at", today.toISOString());

      const existingTopics = new Set(
        (existingTrends || []).map((t: { topic: string }) => t.topic.toLowerCase().trim())
      );

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

        const { data } = await supabase
          .from("detected_trends")
          .insert(trendObj)
          .select()
          .single();
        if (data) savedTrends.push(data);
      }

      // Auto-generate drafts for high-impact trends (impact_score > 0.70)
      for (const trend of savedTrends) {
        if (trend.velocity_score > 70) {
          // Throttle to respect Gemini free-tier rate limits (15 RPM baseline)
          await new Promise((resolve) => setTimeout(resolve, 3500));

          try {
            const draftContent = await workflowService.generatePost(
              { topic: trend.topic, platform: platform },
              userProfile || undefined,
              trend.metadata?.suggested_angle || trend.metadata?.insight
            );

            await supabase.from("generated_posts").insert({
              user_id,
              content: draftContent,
              trend_id: trend.id,
              status: PostStatus.NEEDS_APPROVAL,
              ai_metadata: { platform },
              created_at: new Date().toISOString(),
            });
          } catch (draftErr: any) {
            // FIX: Don't crash the whole scan if a single draft fails
            console.error(`[SCAN] Draft generation failed for "${trend.topic}":`, draftErr?.message);
          }
        }
      }

      res.json({
        success: true,
        count: savedTrends.length,
        trends: savedTrends,
      });
    } catch (error: any) {
      console.error("Scan failed:", error);
      res.status(500).json({ error: error.message });
    }
  };


  // 3. Create Draft Post (from n8n AI Agent)
  createDraft = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      let { content, trend_id } = req.body;
      const targetPlatform =
        (req.body.platform as Platform) || Platform.LINKEDIN;

      // Quota check before generating
      const quota = await this.checkQuota(user_id);
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
        const { data: trend } = await supabase
          .from("detected_trends")
          .select("*")
          .eq("id", trend_id)
          .single();

        if (trend) {
          // Fetch user profile for context
          const { data: userProfile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user_id)
            .single();

          content = await workflowService.generatePost(
            { topic: trend.topic, platform: targetPlatform },
            userProfile || undefined,
            trend.metadata?.insight || "No context"
          );
        } else {
          content = "Draft generated from unknown trend.";
        }
      }


      const { data: config } = await supabase
        .from("automation_configs")
        .select("*")
        .eq("user_id", user_id)
        .eq("platform", targetPlatform)
        .single();

      // Default to NEEDS_APPROVAL for safety if config is missing
      const status =
        config?.require_approval !== false
          ? PostStatus.NEEDS_APPROVAL
          : PostStatus.SCHEDULED;

      const { data, error } = await supabase
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

      if (error) throw error;

      // Check notification preference in Profile
      if (status === PostStatus.NEEDS_APPROVAL) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user_id)
          .single();

        if (
          profile?.email &&
          (profile.notification_preferences as any)?.post_approval
        ) {
          await this.emailService.sendApprovalRequest(
            profile.email,
            content.substring(0, 50) + "...",
            process.env.APP_URL || "http://localhost:3000",
          );
        }
      }

      // Log it
      await supabase.from("automation_logs").insert({
        user_id,
        action: "draft_created",
        level: LogLevel.INFO,
        message: `Created draft for user ${user_id}`,
        metadata: { draft_id: data.id },
      });

      res.json({ success: true, post: data });
    } catch (error: any) {
      console.error("[createDraft] Error:", error);
      res.status(500).json({ error: error.message || String(error) || "Unknown Error" });
    }
  };

  // 4. Trigger Posting (Webhook or User Action)
  triggerPost = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      const { post_id } = req.body;

      // Fetch post ensuring it belongs to user
      const { data: post, error: fetchError } = await supabase
        .from("generated_posts")
        .select("*")
        .eq("id", post_id)
        .eq("user_id", user_id)
        .single();

      if (fetchError || !post)
        throw new Error("Post not found or unauthorized");

      if (
        post.status !== PostStatus.APPROVED &&
        post.status !== PostStatus.SCHEDULED &&
        post.status !== PostStatus.NEEDS_APPROVAL &&
        post.status !== PostStatus.FAILED
      ) {
        return res
          .status(400)
          .json({ error: "Post is not approved for publishing" });
      }

      // Execute Posting via Service
      let resultId: string | null = null;
      let platform = post.ai_metadata?.platform || "linkedin";

      try {
        if (platform === 'twitter') {
          const tweetRes: any = await twitterService.postTweet(user_id, post.content);
          resultId = tweetRes?.data?.id || tweetRes?.id || "twitter_unknown_id";
        } else if (platform === 'instagram') {
          const igId = await instagramService.postToInstagram(user_id, post.content, post.media_urls?.[0]);
          resultId = igId;
        } else if (platform === 'slack') {
          const slackRes: any = await slackService.sendMessage(user_id, post.content);
          resultId = slackRes?.ts || "slack_message_sent";
        } else if (platform === 'reddit') {
          const redditRes: any = await redditService.postToReddit(user_id, post.content);
          resultId = redditRes?.url || "reddit_post_created";
        } else {
          // Default: LinkedIn
          const liResult: any = await linkedInService.createPost(user_id, post.content, post.media_urls);
          resultId = liResult?.platform_post_id || liResult?.id || null;
        }
      } catch (err: any) {
        if (err.message && err.message.toLowerCase().includes("not connected")) {
            return res.status(400).json({ error: `Please integrate your ${platform} account in Settings to publish posts. (${err.message})` });
        }
        throw new Error(`Failed to post to ${platform}: ${err.message || "Unknown error"}`);
      }

      // Update DB
      const { error: updateError } = await supabase
        .from("generated_posts")
        .update({
          status: PostStatus.PUBLISHED,
          platform_post_id: resultId,
          published_at: new Date().toISOString(),
        })
        .eq("id", post_id);

      if (updateError) throw updateError;

      await supabase.from("automation_logs").insert({
        user_id,
        action: "post_published",
        level: LogLevel.SUCCESS,
        message: `Published post ${post_id} to LinkedIn`,
      });

      res.json({ success: true, platform_response: { id: resultId, platform } });
    } catch (error: any) {
      await supabase
        .from("generated_posts")
        .update({ status: PostStatus.FAILED })
        .eq("id", req.body.post_id);
      await supabase.from("automation_logs").insert({
        user_id: req.body.user_id,
        action: "post_failed",
        level: LogLevel.ERROR,
        message: error.message || "Unknown error",
      });

      console.error("[triggerPost] FATAL ERROR:", error);

      res.status(500).json({
        error: error.message || String(error) || "Unknown error occurred during posting",
      });
    }
  };

  // 5. Update Post (Edit Draft)
  updatePost = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      const { id } = req.params;
      const { content, scheduled_time, platform } = req.body;

      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      // Build update payload
      const payload: any = {
        content,
        scheduled_time,
        updated_at: new Date().toISOString(),
      };

      if (platform) {
        payload.ai_metadata = { platform };
      }

      // Real update
      const { data, error } = await supabase
        .from("generated_posts")
        .update(payload)
        .eq("id", id)
        .eq("user_id", user_id) // Security check
        .select()
        .single();

      if (error) throw error;
      res.json({ success: true, post: data });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };

  // 6. Create Post (Manual) - Deprecated manual raw insert, kept for legacy if needed,
  // but usually we use createDraft or generateManualPost now.
  createPost = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      console.log(`[CREATE_POST] Attempting to create for User ID: ${user_id}`);
      const { content, scheduled_time, status, trend_id, media_urls, platform } =
        req.body;

      console.log("[CREATE_POST] Inserting into Real DB...");
      const { data, error } = await supabase
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
    } catch (e: any) {
      console.error("[CREATE_POST] Exception:", e);
      res.status(500).json({ error: e.message });
    }
  };

  // NEW: Manual AI Generation via n8n
  generateManualPost = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      const {
        topic,
        platform,
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
      } = req.body;

      if (!topic) return res.status(400).json({ error: "Topic is required" });

      // 0. Quota Check
      const quota = await this.checkQuota(user_id);
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
      const content = await workflowService.generatePost(
        {
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
        },
        (req.user as Record<string, any>) || undefined
      );

      // 2. Save as Draft
      const { data, error } = await supabase
        .from("generated_posts")
        .insert({
          user_id,
          content,
          status: PostStatus.NEEDS_APPROVAL,
          ai_metadata: { source: "manual_n8n", topic, platform: platform || "linkedin" },
        })
        .select()
        .single();

      if (error) throw error;

      // 3. Log
      await supabase.from("automation_logs").insert({
        user_id,
        action: "manual_generation",
        level: LogLevel.INFO,
        message: `Generated post for topic: ${topic}`,
      });

      res.json({ success: true, post: data });
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : "Manual generation failed";
      console.error("Manual generation failed:", errMsg);
      res.status(500).json({ error: errMsg });
    }
  };

  // Quota Status Endpoint
  getQuotaStatus = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });
      const quota = await this.checkQuota(user_id);
      return res.json({
        used: quota.used,
        limit: quota.limit === Infinity ? null : quota.limit,
        tier: quota.tier,
        remaining: quota.limit === Infinity ? null : Math.max(0, quota.limit - quota.used),
        allowed: quota.allowed,
      });
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : "Quota check failed";
      return res.status(500).json({ error: errMsg });
    }
  };


  // 7. Retry Failed Post
  retryPost = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      const { id } = req.params;

      // Ensure post exists and belongs to user
      const { data: post, error: fetchErr } = await supabase
        .from("generated_posts")
        .select("*")
        .eq("id", id)
        .eq("user_id", user_id)
        .single();

      if (fetchErr || !post)
        return res.status(404).json({ error: "Post not found" });
      if (post.status !== PostStatus.FAILED)
        return res.status(400).json({ error: "Post is not in a failed state" });

      // Attempt re-publish
      let resultId: string | null = null;
      let platform = post.ai_metadata?.platform || "linkedin";

      try {
        if (platform === 'twitter') {
          const tweetRes: any = await twitterService.postTweet(user_id, post.content);
          resultId = tweetRes.data?.id || tweetRes.id || "twitter_unknown_id";
        } else if (platform === 'instagram') {
          const igId = await instagramService.postToInstagram(user_id, post.content, post.media_urls?.[0]);
          resultId = igId;
        } else {
          const liResult: any = await linkedInService.createPost(user_id, post.content, post.media_urls);
          resultId = liResult?.platform_post_id || liResult?.id || null;
        }
      } catch (err: any) {
        throw new Error(`Failed to post to ${platform}: ${err.message || "Unknown error"}`);
      }

      await supabase
        .from("generated_posts")
        .update({
          status: PostStatus.PUBLISHED,
          platform_post_id: resultId,
          published_at: new Date().toISOString(),
          error_message: null,
        })
        .eq("id", id);

      await supabase.from("automation_logs").insert({
        user_id,
        action: "post_retry_success",
        level: LogLevel.SUCCESS,
        message: `Retried and published post ${id}`,
      });

      return res.json({ success: true, message: "Post retried successfully" });
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : "Retry failed";
      const { id } = req.params;
      await supabase
        .from("generated_posts")
        .update({ error_message: errMsg })
        .eq("id", id);
      return res.status(500).json({ error: errMsg });
    }
  };

  // 8. Delete Post
  deletePost = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      const { id } = req.params;

      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      const { error } = await supabase
        .from("generated_posts")
        .delete()
        .eq("id", id)
        .eq("user_id", user_id); // Security check

      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };

  // --- TEAM MANAGEMENT ---
  getTeamMembers = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      // Real DB
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        // If table doesn't exist yet, return empty or self
        if (error.code === "42P01") {
          return res.json([
            {
              id: "self",
              email: req.user?.email || "user",
              role: "owner",
              status: "active",
            },
          ]);
        }
        throw error;
      }

      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };

  inviteTeamMember = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });
      const { email, role } = req.body;

      // Check for duplicate pending invite
      const { data: existingInvite } = await supabase
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
      await this.emailService.sendTeamInvitation(email, role, inviteLink);

      // Real DB - Insert pending member Record
      // Note: In production this should be a robust invite system.
      // For MVP, we insert a record linked to the owner so it appears in the list.
      try {
        await supabase.from("team_members").insert({
          email,
          role,
          status: "pending",
          invited_by: user_id,
          user_id: user_id, // Linking to self/owner for visibility (MVP hack)
        });
      } catch (dbError) {
        console.warn(
          "Could not save team_member record, but email was sent.",
          dbError,
        );
      }

      res.json({ success: true, message: `Invitation sent to ${email}` });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };

  removeTeamMember = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });
      const { id } = req.params;

      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", id);

      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };

  // 8. Get Analytics
  getAnalytics = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      const { days = 30, platform } = req.query;
      const limit = parseInt(days as string) || 30;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - limit);

      // Aggregate by date (in case multiple accounts)
      // Since Supabase doesn't do 'group by' easily via JS client without RPC sometimes,
      // we fetch all rows and aggregate in JS for MVP.
      let query = supabase
        .from("analytics_daily")
        .select("date, impressions, clicks, likes, comments, shares")
        .eq("user_id", user_id)
        .gte("date", startDate.toISOString().split("T")[0])
        .order("date", { ascending: true });

      if (platform && platform !== "all") {
        query = query.eq("platform", platform as string);
      }

      const { data, error } = await query;

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
      const aggregated: Record<string, any> = {};
      data?.forEach((row: any) => {
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

      const result = Object.values(aggregated).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );

      res.json({ data: result });
    } catch (e: any) {
      console.error("getAnalytics Error:", e);
      res.status(500).json({ error: e.message });
    }
  };

  exportAnalytics = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      const limit = 30; // Last 30 days
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - limit);

      let data: any[] = [];

      const { data: realData } = await supabase
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
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="analytics_export_${new Date().toISOString().split("T")[0]}.csv"`,
      );
      res.send(csvString);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };

  // --- GETTERS for Frontend ---

  getConfig = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      const platform = (req.query.platform as Platform) || Platform.LINKEDIN;

      const { data } = await supabase
        .from("automation_configs")
        .select("*")
        .eq("user_id", user_id)
        .eq("platform", platform)
        .single();

      res.json(data || {});
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };

  getTrends = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const { category } = req.query;

      let query = supabase
        .from("detected_trends")
        .select("*", { count: "exact" });

      if (category && category !== "All") {
        // @ts-ignore
        query = query.eq("category", category as string);
      }

      const { data, count, error } = await query
        .order("velocity_score", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error("❌ getTrends Supabase Error:", error);
        throw error;
      }
      res.json({ data, meta: { page, limit, total: count } });
    } catch (e) {
      console.error("❌ getTrends Exception:", e);
      res.status(500).json({ error: (e as Error).message });
    }
  };

  getPosts = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      const { status, platform, startDate, endDate } = req.query; // Added date filters

      let query = supabase
        .from("generated_posts")
        .select("*", { count: "exact" });

      // Filters
      query = query.eq("user_id", user_id);
      
      if (status) {
        // Handle multiple statuses like "published,failed"
        if (typeof status === 'string' && status.includes(',')) {
          const statusList = status.split(',');
          query = query.in("status", statusList);
        } else {
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

      const { data, count, error } = await query;

      if (error) throw error;
      res.json({ data, meta: { page, limit, total: count } });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  };

  // --- ANALYTICS ---
  getDashboardStats = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      // 1. Pending Approvals
      const { count: pendingCount } = await supabase
        .from("generated_posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user_id)
        .eq("status", "needs_approval");

      // 2. Published This Week
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

      const { count: publishedCount } = await supabase
        .from("generated_posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user_id)
        .eq("status", "published")
        .gte("published_at", startOfWeek.toISOString());

      // 3. Activity Feed (Recent Posts)
      const { data: recentActivity } = await supabase
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
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };

  // --- LOGS ---
  getLogs = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      const { data, error } = await supabase
        .from("automation_logs")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };

  // --- PROFILE ---
  getProfile = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user_id)
        .single();

      if (error && error.code !== "PGRST116") throw error; // PGRST116 is "no rows", which is fine for new users

      res.json(data || {});
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };

  updateProfile = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      const {
        full_name,
        avatar_url,
        bio,
        role,
        niche,
        goals,
        onboarding_completed,
      } = req.body;

      const { data, error } = await supabase
        .from("profiles")
        .upsert({
          id: user_id,
          email: req.user.email, // Ensure email is synced from auth
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

      if (error) throw error;

      // Sync onboarding status to auth.users metadata so middleware allows redirect
      if (onboarding_completed !== undefined) {
        await supabase.auth.admin.updateUserById(user_id, {
          user_metadata: { onboarding_completed }
        }).catch(err => console.warn("Failed to sync auth user_metadata:", err));
      }

      res.json({ success: true, profile: data });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };

  // --- CONNECTIONS ---
  getConnections = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      const { data } = await supabase
        .from("linked_accounts")
        .select("*")
        .eq("user_id", user_id);

      const mappedData = data?.map(d => ({
        ...d,
        status: d.status || d.connection_status
      })) || [];

      res.json(mappedData);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };

  // --- DEV TOOLS ---
  
  // --- VERCEL CRON ---
  processCronJobs = async (req: Request, res: Response) => {
    try {
      // Vercel Cron sends a Bearer token in Authorization header
      const authHeader = req.headers.authorization;
      if (
        process.env.CRON_SECRET &&
        authHeader !== `Bearer ${process.env.CRON_SECRET}`
      ) {
        return res.status(401).json({ error: "Unauthorized cron request" });
      }

      await schedulerService.processScheduledPosts();
      res.json({ success: true, message: "Scheduled posts processed" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };

  processWeeklyDigestCron = async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (
        process.env.CRON_SECRET &&
        authHeader !== `Bearer ${process.env.CRON_SECRET}`
      ) {
        return res.status(401).json({ error: "Unauthorized cron request" });
      }

      await schedulerService.processWeeklyDigest();
      res.json({ success: true, message: "Weekly digest processed" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };
  seedData = async (req: Request, res: Response) => {
    try {
      if (process.env.NEWSDATA_API_KEY) {
        return this.scanTrends(req, res);
      }
      res.json({
        success: true,
        message: "Mock data seeded (No API keys found)",
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };
}

export const automationController = new AutomationController();
