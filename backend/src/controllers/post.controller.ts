import { Request, Response } from "express";
import { supabase } from "../db";
import { AuthRequest } from "../middleware/auth.middleware";

class PostController {
  listPosts = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      const { platform, status } = req.query;

      let query = supabase
        .from("posts")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", { ascending: false });

      if (platform && typeof platform === "string") {
        query = query.eq("platform", platform);
      }

      if (status && typeof status === "string") {
        query = query.eq("status", status);
      }

      const { data, error } = await query;

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      console.error("Error in listPosts:", error);
      res.status(500).json({ error: error.message });
    }
  };

  getPost = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const user_id = req.user?.id;

      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .eq("user_id", user_id)
        .single();

      if (error) throw error;
      if (!data) return res.status(404).json({ error: "Post not found" });

      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  deletePost = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const user_id = req.user?.id;

      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", id)
        .eq("user_id", user_id);

      if (error) throw error;
      res.json({ message: "Post deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  updatePost = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const user_id = req.user?.id;
      const updates = req.body;

      const { data, error } = await supabase
        .from("posts")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user_id)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}

export const postController = new PostController();
