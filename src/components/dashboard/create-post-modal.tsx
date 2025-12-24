"use client";

import { useState, useEffect } from "react";
import { X, Calendar, Clock, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { poster, puter, remover } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: Date;
  postToEdit?: any;
  onSuccess: () => void;
}

export function CreatePostModal({ isOpen, onClose, initialDate, postToEdit, onSuccess }: CreatePostModalProps) {
  const [content, setContent] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (postToEdit) {
        setContent(postToEdit.content);
        // Format for datetime-local: YYYY-MM-DDTHH:mm
        if (postToEdit.scheduled_time) {
            const date = new Date(postToEdit.scheduled_time);
            setScheduledTime(formatDateTimeLocal(date));
        }
    } else if (initialDate) {
        setContent("");
        // Default to initialDate at 09:00 AM if no time component, otherwise use current time or similar
        const date = new Date(initialDate);
        date.setHours(9, 0, 0, 0);
        setScheduledTime(formatDateTimeLocal(date));
    } else {
        // Default to tomorrow 9am
        const date = new Date();
        date.setDate(date.getDate() + 1);
        date.setHours(9, 0, 0, 0);
        setScheduledTime(formatDateTimeLocal(date));
        setContent("");
    }
  }, [postToEdit, initialDate, isOpen]);

  const formatDateTimeLocal = (date: Date) => {
    const pad = (n: number) => n < 10 ? '0' + n : n;
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const handleSave = async () => {
    if (!content.trim()) {
        toast.error("Content is required");
        return;
    }
    if (!scheduledTime) {
        toast.error("Scheduled time is required");
        return;
    }

    setLoading(true);
    try {
        const payload = {
            content,
            scheduled_time: new Date(scheduledTime).toISOString(),
            status: 'scheduled'
        };

        if (postToEdit) {
            await puter(`/posts/${postToEdit.id}`, payload);
            toast.success("Post updated successfully");
        } else {
            // Check if we have user_id in payload? 
            // Usually backend infers from auth token, but let's see. 
            // In API client we send auth header. Backend likely attaches user.
            await poster('/posts', payload); 
            toast.success("Post scheduled successfully");
        }
        onSuccess();
        onClose();
    } catch (error: any) {
        toast.error(error.message || "Failed to save post");
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async () => {
      if (!postToEdit) return;
      if (!confirm("Are you sure you want to delete this scheduled post?")) return;
      
      setLoading(true);
      try {
          await remover(`/posts/${postToEdit.id}`);
          toast.success("Post deleted");
          onSuccess();
          onClose();
      } catch (error: any) {
          toast.error("Failed to delete post");
      } finally {
          setLoading(false);
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg rounded-xl border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold font-heading">
                {postToEdit ? "Edit Scheduled Post" : "Schedule New Post"}
            </h2>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                <X className="h-4 w-4" />
            </Button>
        </div>

        <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Content
                </label>
                <Textarea 
                    placeholder="What do you want to share? (You can use AI to generate this in the Trends tab)"
                    className="min-h-[150px] resize-none"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium leading-none">
                    Schedule Time
                </label>
                <div className="flex items-center gap-2">
                    <Input 
                        type="datetime-local" 
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="flex-1 font-mono text-sm"
                    />
                </div>
            </div>

            {postToEdit && (
                 <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 p-2 rounded">
                    <span>Current Status:</span>
                    <span className={cn(
                        "uppercase font-bold", 
                        postToEdit.status === 'scheduled' ? 'text-blue-600' : 
                        postToEdit.status === 'published' ? 'text-green-600' : 'text-amber-600'
                    )}>
                        {postToEdit.status}
                    </span>
                 </div>
            )}
        </div>

        <div className="flex justify-between items-center mt-6 pt-4 border-t">
            {postToEdit ? (
                 <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading}>
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                 </Button>
            ) : <div />} {/* Spacer */}

            <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} disabled={loading}>
                    Cancel
                </Button>
                <Button onClick={handleSave} disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {postToEdit ? "Save Changes" : "Schedule Post"}
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
}
