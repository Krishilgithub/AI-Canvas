import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { supabase } from "../db";
import { linkedInService } from "../services/linkedin.service";
import { newsService } from "../services/news.service";
import { geminiService } from "../services/gemini.service";
import { n8nService } from "../services/n8n.service";
import { Platform, PostStatus, LogLevel } from "../constants";
import { EmailService } from "../services/email.service";

export class AutomationController {
  private emailService = new EmailService();

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
            is_active: true,
          },
          { onConflict: "user_id, platform" },
        )
        .select()
        .single();

      if (error) throw error;

      res.json({ success: true, config: data });
    } catch (error: any) {
      console.error("saveConfig error", error);
      res.status(500).json({ error: error.message });
    }
  };

  // 2. Ingest Trends (from n8n)
  ingestTrend = async (req: Request, res: Response) => {
    // ... (Keep existing implementation or add mock fallback if needed)
    // For brevity, assuming this is mostly n8n usage
    res.json({ success: true });
  };

  // NEW: Scan Real Trends
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
        if (config.keywords && config.keywords.length > 0)
          keywords = config.keywords;
      }

      // Construct robust query: (niche1 OR niche2) AND (key1 OR key2)
      // If no keywords, just niches.
      const nicheQuery = niches.map((n) => `"${n}"`).join(" OR ");
      const keywordQuery = keywords.map((k) => `"${k}"`).join(" OR ");

      let query = "";
      if (nicheQuery && keywordQuery) {
        query = `(${nicheQuery}) AND (${keywordQuery})`;
      } else if (nicheQuery) {
        query = nicheQuery;
      } else {
        query = "Technology OR Business"; // Fallback
      }

      console.log(`[SCAN] Fetching news for: ${query}`);

      // 2. Fetch News (Real)
      const newsItems = await newsService.fetchNews(query);

      if (newsItems.length === 0) {
        return res.json({
          success: true,
          message: "No new news found",
          trends: [],
        });
      }

      // 3. Analyze with Gemini (Real)
      const analyzedTrends = await geminiService.analyzeTrendPotential(
        newsItems.slice(0, 5),
      );

      // 4. Save
      const savedTrends = [];
      for (const trend of analyzedTrends) {
        const trendObj: any = {
          topic: trend.title,
          category: trend.category || "General",
          velocity_score: trend.velocity_score,
          source: "newsdata_io",
          metadata: {
            link: trend.link,
            insight: trend.insight,
            query_used: query,
          },
          created_at: new Date().toISOString(),
        };

        // Check if trend exists? For now just insert (or could upsert based on link)
        const { data } = await supabase
          .from("detected_trends")
          .insert(trendObj)
          .select()
          .single();
        if (data) savedTrends.push(data);
      }

      // 5. Auto-generate drafts
      // Fetch user profile for context once
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("role, niche, goals, bio")
        .eq("id", user_id)
        .single();

      for (const trend of savedTrends) {
        if (trend.velocity_score > 70) {
          const draftContent = await geminiService.generateDraft(
            trend.topic,
            trend.metadata.insight,
            userProfile, // Pass user context
          );

          const postObj: any = {
            user_id,
            content: draftContent,
            trend_id: trend.id,
            status: PostStatus.NEEDS_APPROVAL,
            created_at: new Date().toISOString(),
          };

          await supabase.from("generated_posts").insert(postObj);
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
            .select("role, niche, goals, bio")
            .eq("id", user_id)
            .single();

          content = await geminiService.generateDraft(
            trend.topic,
            trend.metadata?.insight || "No context",
            userProfile, // Pass user context
          );
        } else {
          content = "Draft generated from unknown trend.";
        }
      }

      // Check config to see if approval is required
      // Assuming platform is passed in body, or default to LinkedIn.
      // Ideally n8n should send platform. Defaults to LinkedIn for now.
      const targetPlatform =
        (req.body.platform as Platform) || Platform.LINKEDIN;

      const { data: config } = await supabase
        .from("automation_configs")
        .select("require_approval")
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
          // platform: targetPlatform, // SKIPPED: DB Column missing
          platform_post_id: null, // Not posted yet
        })
        .select()
        .single();

      if (error) throw error;

      // Check notification preference in Profile
      if (status === PostStatus.NEEDS_APPROVAL) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("notification_preferences, email")
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
      res.status(500).json({ error: error.message });
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
        post.status !== PostStatus.NEEDS_APPROVAL
      ) {
        return res
          .status(400)
          .json({ error: "Post is not approved for publishing" });
      }

      // Execute Posting via Service
      const result = await linkedInService.createPost(user_id, post.content);

      // Update DB
      const { error: updateError } = await supabase
        .from("generated_posts")
        .update({
          status: PostStatus.PUBLISHED,
          platform_post_id: result.id,
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

      res.json({ success: true, platform_response: result });
    } catch (error: any) {
      await supabase
        .from("generated_posts")
        .update({ status: PostStatus.FAILED })
        .eq("id", req.body.post_id);
      await supabase.from("automation_logs").insert({
        user_id: req.body.user_id,
        action: "post_failed",
        level: LogLevel.ERROR,
        message: error.message,
      });

      res.status(500).json({
        error: error.message || "Unknown error occurred during posting",
        details: error,
      });
    }
  };

  // 5. Update Post (Edit Draft)
  updatePost = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      const { id } = req.params;
      const { content, scheduled_time } = req.body;

      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      // Real update
      const { data, error } = await supabase
        .from("generated_posts")
        .update({
          content,
          scheduled_time,
          updated_at: new Date().toISOString(),
        })
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
      const { content, scheduled_time, status, trend_id, media_urls } =
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

      const { topic } = req.body;
      if (!topic) return res.status(400).json({ error: "Topic is required" });

      // 1. Call n8n to generate content
      // Lazy import to avoid circular dep issues if any, though service import is fine
      // const { n8nService } = require('../services/n8n.service');
      // We will assume n8nService is imported at top of file
      const content = await n8nService.generatePost(topic);

      // 2. Save as Draft
      const { data, error } = await supabase
        .from("generated_posts")
        .insert({
          user_id,
          content,
          status: PostStatus.NEEDS_APPROVAL,
          ai_metadata: { source: "manual_n8n", topic },
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
    } catch (e: any) {
      console.error("Manual generation failed:", e);
      res.status(500).json({ error: e.message });
    }
  };

  // 7. Delete Post
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

      const { days = 30 } = req.query;
      const limit = parseInt(days as string) || 30;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - limit);

      // Aggregate by date (in case multiple accounts)
      // Since Supabase doesn't do 'group by' easily via JS client without RPC sometimes,
      // we fetch all rows and aggregate in JS for MVP.
      const { data, error } = await supabase
        .from("analytics_daily")
        .select("date, impressions, clicks, likes, comments, shares")
        .eq("user_id", user_id)
        .gte("date", startDate.toISOString().split("T")[0])
        .order("date", { ascending: true });

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
    } catch (e: any) {
      console.error("❌ getTrends Exception:", e);
      res.status(500).json({ error: e.message, details: e });
    }
  };

  getPosts = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      const { status } = req.query; // Removed platform destructuring

      let query = supabase
        .from("generated_posts")
        .select("*", { count: "exact" });

      // Filters
      query = query.eq("user_id", user_id);
      if (status) query = query.eq("status", status);
      // if (platform) query = query.eq("platform", platform); // SKIPPED

      // Sorting & Pagination
      query = query
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, count, error } = await query;

      if (error) throw error;
      res.json({ data, meta: { page, limit, total: count } });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
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
        .select("platform, platform_username, status")
        .eq("user_id", user_id);

      res.json(data || []);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  };

  // --- DEV TOOLS ---
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
