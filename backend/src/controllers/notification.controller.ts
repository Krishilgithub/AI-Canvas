import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { supabase } from "../db";

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) return res.status(401).json({ error: "Unauthorized" });

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user?.id;
    const { id } = req.params;
    if (!user_id) return res.status(401).json({ error: "Unauthorized" });

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("user_id", user_id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) return res.status(401).json({ error: "Unauthorized" });

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user_id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteNotification = async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user?.id;
    const { id } = req.params;
    if (!user_id) return res.status(401).json({ error: "Unauthorized" });

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id)
      .eq("user_id", user_id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
