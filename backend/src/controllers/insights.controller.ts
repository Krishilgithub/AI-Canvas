import { Response } from "express";
import { supabase } from "../db";
import { AuthRequest } from "../middleware/auth.middleware";
import { geminiService } from "../services/gemini.service";

/**
 * InsightsController — AI-powered post performance analysis (Post Autopsy).
 * Feedback loop: stores analysis and uses it to improve future drafts.
 */
class InsightsController {
  /**
   * POST /api/v1/insights/autopsy
   * Analyze a specific post for hook quality, CTA strength, and improvement tips.
   */
  analyzePost = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      const { post_id } = req.body;
      if (!post_id) return res.status(400).json({ error: "post_id is required" });

      // Fetch the post
      const { data: post, error: postError } = await supabase
        .from("generated_posts")
        .select("id, content, ai_metadata, status, published_at")
        .eq("id", post_id)
        .eq("user_id", user_id)
        .single();

      if (postError || !post) {
        return res.status(404).json({ error: "Post not found" });
      }

      // Check for existing insight to avoid re-analyzing
      const { data: existing } = await supabase
        .from("post_insights")
        .select("*")
        .eq("post_id", post_id)
        .single();

      if (existing) {
        return res.json(existing);
      }

      const platform = (post.ai_metadata as Record<string, string> | null)?.platform ?? "linkedin";

      // Call Gemini for analysis
      const analysis = await geminiService.analyzePostPerformance(
        post.content,
        platform,
        user_id
      );

      // Store the insight
      const { data: insight, error: insertError } = await supabase
        .from("post_insights")
        .insert({
          post_id,
          user_id,
          platform,
          hook_score: analysis.hook_score,
          cta_score: analysis.cta_score,
          analysis: analysis.analysis,
          suggestions: analysis.suggestions,
        })
        .select()
        .single();

      if (insertError) {
        // Return analysis even if storage fails
        console.error("[Insights] Failed to store insight:", insertError.message);
        return res.json({ ...analysis, post_id, platform, stored: false });
      }

      res.json(insight);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Insights] analyzePost error:", msg);

      if (msg === "AI_UNAVAILABLE") {
        return res.status(503).json({
          error: "AI analysis unavailable",
          message: "Gemini API key not configured. Add it in Settings → AI Models.",
        });
      }

      res.status(500).json({ error: msg });
    }
  };

  /**
   * GET /api/v1/insights/:platform
   * Fetch stored insights for a platform, ordered by hook_score desc.
   */
  getPlatformInsights = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      const { platform } = req.params;

      const { data, error } = await supabase
        .from("post_insights")
        .select("*")
        .eq("user_id", user_id)
        .eq("platform", platform)
        .order("hook_score", { ascending: false })
        .limit(20);

      if (error) throw error;

      res.json(data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  };

  /**
   * GET /api/v1/insights/top-posts/:platform
   * Returns top 3 best-performing post contents for the platform (used to seed AI drafts).
   */
  getTopPerformingPosts = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      const { platform } = req.params;

      // Join post_insights with generated_posts to get content of best posts
      const { data, error } = await supabase
        .from("post_insights")
        .select("hook_score, cta_score, generated_posts(content)")
        .eq("user_id", user_id)
        .eq("platform", platform)
        .order("hook_score", { ascending: false })
        .limit(3);

      if (error) throw error;

      const topPosts = (data || []).map((row: Record<string, unknown>) => {
        const post = row.generated_posts as Record<string, string> | null;
        return {
          content: post?.content ?? "",
          hook_score: row.hook_score,
          cta_score: row.cta_score,
        };
      }).filter(p => p.content);

      res.json(topPosts);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  };
}

export const insightsController = new InsightsController();
