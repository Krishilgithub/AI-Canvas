import { Request, Response } from "express";
import { supabase } from "../db";
import { AuthRequest } from "../middleware/auth.middleware";

class AnalyticsController {
  getOverview = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      // Mock aggregation for now if tables are empty, but logic is real
      // 1. Total Posts
      const { count: postsCount, error: postsError } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user_id);

      // 2. Scheduled Posts
      const { count: scheduledCount } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user_id)
        .eq("status", "scheduled");

      // 3. Total Reach (Sum of impressions from analytics table)
      // Assuming table 'analytics_daily' with 'impressions' column
      const { data: analyticsData, error: analyticsError } = await supabase
        .from("analytics_daily")
        .select("impressions, engagement")
        .eq("user_id", user_id);

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

      const { data, error } = await supabase
        .from("analytics_daily")
        .select("*")
        .eq("user_id", user_id)
        .order("date", { ascending: true })
        .limit(30);

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}

export const analyticsController = new AnalyticsController();
