import { Response } from "express";
import { supabase } from "../db";
import { AuthRequest } from "../middleware/auth.middleware";

class CommentsController {
  /**
   * GET /api/v1/comments/:post_id — list all comments for a post
   */
  listComments = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      const { post_id } = req.params;

      // Verify the post belongs to this user
      const { data: post } = await supabase
        .from("generated_posts")
        .select("id")
        .eq("id", post_id)
        .eq("user_id", user_id)
        .single();

      if (!post) return res.status(404).json({ error: "Post not found" });

      const { data, error } = await supabase
        .from("post_comments")
        .select("*")
        .eq("post_id", post_id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      res.json(data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  };

  /**
   * POST /api/v1/comments/:post_id — add a comment
   */
  addComment = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      const { post_id } = req.params;
      const { body, author_name } = req.body;

      if (!body || typeof body !== "string" || body.trim().length === 0) {
        return res.status(400).json({ error: "Comment body is required" });
      }

      if (body.trim().length > 1000) {
        return res.status(400).json({ error: "Comment must be 1000 characters or less" });
      }

      // Verify the post exists and belongs to this user
      const { data: post } = await supabase
        .from("generated_posts")
        .select("id")
        .eq("id", post_id)
        .eq("user_id", user_id)
        .single();

      if (!post) return res.status(404).json({ error: "Post not found" });

      const { data, error } = await supabase
        .from("post_comments")
        .insert({
          post_id,
          user_id,
          body: body.trim(),
          author_name: author_name?.trim() || "You",
        })
        .select()
        .single();

      if (error) throw error;

      res.status(201).json(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  };

  /**
   * DELETE /api/v1/comments/:post_id/:comment_id — delete own comment
   */
  deleteComment = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      const { comment_id } = req.params;

      const { error } = await supabase
        .from("post_comments")
        .delete()
        .eq("id", comment_id)
        .eq("user_id", user_id); // can only delete own comments

      if (error) throw error;

      res.json({ success: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: msg });
    }
  };
}

export const commentsController = new CommentsController();
