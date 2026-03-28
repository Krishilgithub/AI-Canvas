"use client";

import { useState, useEffect, useCallback } from "react";
import { fetcher } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MessageCircle, Send, Trash2, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  author_name: string;
  body: string;
  created_at: string;
}

interface DraftCommentsProps {
  postId: string;
  /** If the panel starts collapsed. Default: false */
  defaultCollapsed?: boolean;
}

export function DraftComments({ postId, defaultCollapsed = false }: DraftCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [body, setBody] = useState("");
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const data = await fetcher(`/api/v1/comments/${postId}`);
      setComments(Array.isArray(data) ? data : []);
    } catch {
      // silently fail — comments are optional
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleSubmit = async () => {
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      const newComment = await fetcher(`/api/v1/comments/${postId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      setComments(prev => [...prev, newComment]);
      setBody("");
    } catch {
      toast.error("Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    setDeletingId(commentId);
    try {
      await fetcher(`/api/v1/comments/${postId}/${commentId}`, { method: "DELETE" });
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch {
      toast.error("Failed to delete comment");
    } finally {
      setDeletingId(null);
    }
  };

  const timeSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="border border-dashed border-border rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-secondary/20 hover:bg-secondary/30 transition-colors text-sm font-medium"
      >
        <span className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-muted-foreground" />
          Review Notes
          {comments.length > 0 && (
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
              {comments.length}
            </Badge>
          )}
        </span>
        {collapsed ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Body */}
      {!collapsed && (
        <div className="p-4 space-y-3">
          {/* Comment list */}
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading notes...
            </div>
          ) : comments.length === 0 ? (
            <p className="text-xs text-muted-foreground py-1">
              No review notes yet. Add a note for yourself or collaborators.
            </p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {comments.map(comment => (
                <div
                  key={comment.id}
                  className="flex gap-2.5 group animate-in fade-in duration-200"
                >
                  {/* Avatar */}
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 mt-0.5">
                    {(comment.author_name || "Y")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium">{comment.author_name || "You"}</span>
                      <span className="text-[10px] text-muted-foreground">{timeSince(comment.created_at)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground break-words">{comment.body}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className={cn(
                      "opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5",
                      deletingId === comment.id && "opacity-100"
                    )}
                    disabled={deletingId === comment.id}
                    title="Delete note"
                  >
                    {deletingId === comment.id ? (
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    ) : (
                      <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive transition-colors" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex gap-2 items-end pt-1 border-t border-border">
            <Textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Add a review note or revision request..."
              className="min-h-[56px] text-xs resize-none"
              onKeyDown={e => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
              }}
              maxLength={1000}
            />
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!body.trim() || submitting}
              className="h-9 px-3 shrink-0"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Ctrl+Enter to submit · {body.length}/1000
          </p>
        </div>
      )}
    </div>
  );
}
