import { Response } from "express";
import { supabase } from "../db";
import { AuthRequest } from "../middleware/auth.middleware";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AnalyticsDailyRow {
  impressions: number;
  engagement: number;
}

interface GeneratedPost {
  id: string;
  platform: string;
  content: string;
  status: string;
  created_at: string;
  scheduled_date?: string;
  ai_metadata?: Record<string, unknown>;
}

class AnalyticsController {
  getOverview = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      const { platform } = req.query;

      // FIX: was querying the non-existent 'posts' table — now correctly uses 'generated_posts'
      // 1. Total Posts (all statuses)
      let postsQuery = supabase
        .from("generated_posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user_id);
      if (platform && platform !== "all") {
        // generated_posts stores platform inside ai_metadata JSON
        postsQuery = postsQuery.filter("ai_metadata->>platform", "eq", platform as string);
      }
      const { count: postsCount, error: postsError } = await postsQuery;

      // FIX: was querying 'posts'.status = 'scheduled' — now correctly uses 'generated_posts'
      // 2. Scheduled Posts
      let scheduledQuery = supabase
        .from("generated_posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user_id)
        .eq("status", "scheduled");
      if (platform && platform !== "all") {
        scheduledQuery = scheduledQuery.filter("ai_metadata->>platform", "eq", platform as string);
      }
      const { count: scheduledCount } = await scheduledQuery;

      // 3. Awaiting Approval (needs_approval)
      let approvalQuery = supabase
        .from("generated_posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user_id)
        .eq("status", "needs_approval");
      if (platform && platform !== "all") {
        approvalQuery = approvalQuery.filter("ai_metadata->>platform", "eq", platform as string);
      }
      const { count: approvalCount } = await approvalQuery;

      // 4. Total Reach + Engagement from analytics_daily
      let analyticsQuery = supabase
        .from("analytics_daily")
        .select("impressions, engagement")
        .eq("user_id", user_id);
      if (platform && platform !== "all") {
        analyticsQuery = analyticsQuery.eq("platform", platform as string);
      }
      const { data: analyticsData, error: analyticsError } = await analyticsQuery;

      if (analyticsError) {
        // analytics_daily may not exist yet — degrade gracefully
        console.warn("[Analytics] analytics_daily query failed (table may not exist yet):", analyticsError.message);
      }

      const totalReach = (analyticsData as AnalyticsDailyRow[] | null)?.reduce(
        (acc, curr) => acc + (curr.impressions || 0), 0
      ) || 0;
      const totalEngagement = (analyticsData as AnalyticsDailyRow[] | null)?.reduce(
        (acc, curr) => acc + (curr.engagement || 0), 0
      ) || 0;

      if (postsError) {
        console.error("[Analytics] Error fetching generated_posts count:", postsError.message);
      }

      res.json({
        totalPosts: postsCount || 0,
        scheduledPosts: scheduledCount || 0,
        needsApproval: approvalCount || 0,
        totalReach,
        engagement: totalEngagement,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("[Analytics] Error in getOverview:", msg);
      res.status(500).json({ error: msg });
    }
  };

  getRecentActivity = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      // FIX: was querying non-existent 'posts' table — now uses 'generated_posts'
      const { data: posts, error } = await supabase
        .from("generated_posts")
        .select("id, ai_metadata, content, status, created_at, scheduled_time")
        .eq("user_id", user_id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      const activities = (posts as unknown as GeneratedPost[] | null)?.map((post) => ({
        id: post.id,
        type: post.status === "published"
          ? "post_published"
          : post.status === "needs_approval"
          ? "draft_awaiting_review"
          : "post_created",
        description: `Post ${post.status} on ${(post.ai_metadata as Record<string, string> | undefined)?.platform ?? "unknown"}`,
        timestamp: post.created_at,
        meta: {
          platform: (post.ai_metadata as Record<string, string> | undefined)?.platform ?? "unknown",
          status: post.status,
          content: post.content ? post.content.substring(0, 80) + "…" : "",
        },
      })) || [];

      res.json(activities);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("[Analytics] Error in getRecentActivity:", msg);
      res.status(500).json({ error: msg });
    }
  };

  getPlatformStats = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      const { platform } = req.query;
      let query = supabase
        .from("analytics_daily")
        .select("*")
        .eq("user_id", user_id)
        .order("date", { ascending: true })
        .limit(30);

      if (platform && platform !== "all") {
        query = query.eq("platform", platform as string);
      }

      const { data, error } = await query;
      if (error) throw error;

      res.json(data || []);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: msg });
    }
  };

  // ─── seedData ──────────────────────────────────────────────────────────────
  // FIX: seedData uses Math.random() to generate fake impressions/engagement.
  // This was also exposed as an HTTP endpoint accessible by any authenticated user —
  // which means any user could overwrite another's analytics if user_id wasn't scoped.
  // This endpoint should be DISABLED in production. We guard it with NODE_ENV check.
  seedData = async (req: AuthRequest, res: Response) => {
    // Block in production — this endpoint should not exist in prod
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({
        error: "Forbidden",
        message: "seed endpoint is disabled in production. Remove this route before deploying.",
      });
    }

    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      const { data: accounts } = await supabase
        .from("linked_accounts")
        .select("platform")
        .eq("user_id", user_id);

      const platforms = accounts?.length
        ? accounts.map((a: { platform: string }) => a.platform)
        : ["linkedin", "twitter"];

      const days = 30;
      const metrics = [];

      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        for (const platform of platforms) {
          const impressions   = Math.floor(Math.random() * 500) + 50;
          const clicks        = Math.floor(impressions * (Math.random() * 0.15));
          const likes         = Math.floor(impressions * (Math.random() * 0.10));
          const comments      = Math.floor(likes      * (Math.random() * 0.30));
          const shares        = Math.floor(likes      * (Math.random() * 0.10));
          const engagement    = clicks + likes + comments + shares;

          metrics.push({
            user_id,
            platform,
            date: date.toISOString().split("T")[0],
            impressions, clicks, likes, comments, shares, engagement,
          });
        }
      }

      await supabase.from("analytics_daily").delete().eq("user_id", user_id);
      const { error: insertError } = await supabase.from("analytics_daily").insert(metrics);
      if (insertError) throw insertError;

      res.json({ success: true, message: `[DEV ONLY] Seeded ${metrics.length} records.` });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("[Analytics] Seed Error:", msg);
      res.status(500).json({ error: msg });
    }
  };
}

export const analyticsController = new AnalyticsController();
