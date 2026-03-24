import { Request, Response } from "express";
import { supabase } from "../db";
import { AuthRequest } from "../middleware/auth.middleware";

class AnalyticsController {
  getOverview = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      const { platform } = req.query;
      
      // 1. Total Posts
      let postsQuery = supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user_id);
      if (platform && platform !== "all") {
        postsQuery = postsQuery.eq("platform", platform);
      }
      const { count: postsCount, error: postsError } = await postsQuery;

      // 2. Scheduled Posts
      let scheduledQuery = supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user_id)
        .eq("status", "scheduled");
      if (platform && platform !== "all") {
        scheduledQuery = scheduledQuery.eq("platform", platform);
      }
      const { count: scheduledCount } = await scheduledQuery;

      // 3. Total Reach (Sum of impressions from analytics table)
      // Assuming table 'analytics_daily' with 'impressions' column
      let analyticsQuery = supabase
        .from("analytics_daily")
        .select("impressions, engagement")
        .eq("user_id", user_id);
      if (platform && platform !== "all") {
        analyticsQuery = analyticsQuery.eq("platform", platform);
      }
      const { data: analyticsData, error: analyticsError } = await analyticsQuery;

      const totalReach =
        analyticsData?.reduce(
          (acc, curr) => acc + (curr.impressions || 0),
          0,
        ) || 0;
      const totalEngagement =
        analyticsData?.reduce((acc, curr) => acc + (curr.engagement || 0), 0) ||
        0;

      if (postsError) console.error("Error fetching posts count:", postsError);

      res.json({
        totalPosts: postsCount || 0,
        scheduledPosts: scheduledCount || 0,
        totalReach: totalReach,
        engagement: totalEngagement,
      });
    } catch (error: any) {
      console.error("Error in getOverview:", error);
      res.status(500).json({ error: error.message });
    }
  };

  getRecentActivity = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      // Fetch recent 5 posts
      const { data: posts, error } = await supabase
        .from("posts")
        .select("id, platform, content, status, created_at, scheduled_date")
        .eq("user_id", user_id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      // Map to a generic activity format if needed, or return as is
      const activities =
        posts?.map((post) => ({
          id: post.id,
          type: post.status === "published" ? "post_published" : "post_created",
          description: `Post ${post.status} on ${post.platform}`,
          timestamp: post.created_at,
          meta: {
            platform: post.platform,
            content: post.content.substring(0, 50) + "...",
          },
        })) || [];

      res.json(activities);
    } catch (error: any) {
      console.error("Error in getRecentActivity:", error);
      res.status(500).json({ error: error.message });
    }
  };

  getPlatformStats = async (req: AuthRequest, res: Response) => {
    // Placeholder for platform specific drilldown
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
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  seedData = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      // Find user connected platforms
      const { data: accounts, error: accountError } = await supabase
        .from("linked_accounts")
        .select("platform")
        .eq("user_id", user_id);

      if (accountError) throw accountError;

      const platforms = accounts?.length ? accounts.map(a => a.platform) : ["linkedin", "twitter"];

      const days = 30;
      const metrics = [];

      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        for (const platform of platforms) {
          // generate random plausible numbers
          const impressions = Math.floor(Math.random() * 500) + 50;
          const clicks = Math.floor(impressions * (Math.random() * 0.15)); // 0-15% ctr
          const likes = Math.floor(impressions * (Math.random() * 0.10));
          const comments = Math.floor(likes * (Math.random() * 0.3));
          const shares = Math.floor(likes * (Math.random() * 0.1));
          const engagement = clicks + likes + comments + shares;

          metrics.push({
            user_id,
            platform,
            date: date.toISOString().split('T')[0],
            impressions,
            clicks,
            likes,
            comments,
            shares,
            engagement
          });
        }
      }

      // Upsert metrics (conflict on user_id, platform, date assuming unique constraint)
      // Since we don't know if composite key exists, we'll just delete existing and insert
      await supabase
        .from("analytics_daily")
        .delete()
        .eq("user_id", user_id);

      const { error: insertError } = await supabase
        .from("analytics_daily")
        .insert(metrics);

      if (insertError) throw insertError;

      res.json({ success: true, message: `Seeded ${metrics.length} records.` });
    } catch (error: any) {
      console.error("Seed Error:", error);
      res.status(500).json({ error: error.message });
    }
  };
}

export const analyticsController = new AnalyticsController();
