"use client";

import { useState, useEffect } from "react";
import { X, Calendar, Clock, Loader2, Trash2, Image as ImageIcon, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { poster, puter, remover } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { socketClient } from "@/lib/socket-client";

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
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // Socket Connection
  useEffect(() => {
    socketClient.connect();
    // In a real app, successful connection might be managed globally or in context
    
    return () => {
         // Don't disconnect on modal close, as we want to keep one connection, 
         // but if we were managing connection lifetime here:
         // socketClient.disconnect();
    };
  }, []);

  // Room Join/Leave & Typing Listeners
  useEffect(() => {
      if (postToEdit) {
          socketClient.joinPost(postToEdit.id);

          const handleTyping = (user: { email: string }) => {
              setTypingUsers(prev => {
                  if (prev.includes(user.email)) return prev;
                  return [...prev, user.email];
              });
          };

          const handleStopTyping = (user: { email: string }) => {
              setTypingUsers(prev => prev.filter(e => e !== user.email)); // Note: backend sends userId but frontend uses email for display. Need to adjust backend/frontend sync.
              // For simplicity, let's assume we receive email or can't easily map ID back without local user content.
              // Correction: Backend emits { userId, email } on user_typing.
          };

          // To correct the logic:
          const onType = (u: any) => {
             setTypingUsers(prev => prev.includes(u.email) ? prev : [...prev, u.email]);
          }
          const onStop = (u: any) => {
             // In simple version, just clear list after timeout if we can't match perfectly, 
             // but let's try to match logic. 
             // Backend 'user_stopped_typing' sends userId. We need to store map of userId->email.
             // Or just simplify: "Someone is typing..."
          }

          socketClient.onTyping(onType);
          // socketClient.onStopTyping(onStop); // TODO: Robust stop logic

          // Simple clear typing after 3 seconds of no updates
          const interval = setInterval(() => {
              setTypingUsers([]);
          }, 3000);

          return () => {
              socketClient.leavePost(postToEdit.id);
              socketClient.offTyping(onType);
              clearInterval(interval);
          };
      }
  }, [postToEdit]);

  // Handle Input Change
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setContent(e.target.value);
      if (postToEdit) {
          socketClient.startTyping(postToEdit.id);
      }
  };

  useEffect(() => {
    if (postToEdit) {
        setContent(postToEdit.content);
        if (postToEdit.scheduled_time) {
            const date = new Date(postToEdit.scheduled_time);
            setScheduledTime(formatDateTimeLocal(date));
        }
        setMediaUrls(postToEdit.media_urls || []);
    } else if (initialDate) {
        setContent("");
        const date = new Date(initialDate);
        date.setHours(9, 0, 0, 0);
        setScheduledTime(formatDateTimeLocal(date));
        setMediaUrls([]);
    } else {
        const date = new Date();
        date.setDate(date.getDate() + 1);
        date.setHours(9, 0, 0, 0);
        setScheduledTime(formatDateTimeLocal(date));
        setContent("");
        setMediaUrls([]);
    }
  }, [postToEdit, initialDate, isOpen]);

  const formatDateTimeLocal = (date: Date) => {
    const pad = (n: number) => n < 10 ? '0' + n : n;
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      
      setUploading(true);
      const supabase = createClient();
      const files = Array.from(e.target.files);
      const newUrls: string[] = [];

      try {
          for (const file of files) {
              const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
              const { error } = await supabase.storage.from('post-media').upload(fileName, file);
              
              if (error) {
                  console.error(error);
                  toast.error(`Failed to upload ${file.name}`);
                  continue;
              }
              
              const { data } = supabase.storage.from('post-media').getPublicUrl(fileName);
              if (data) newUrls.push(data.publicUrl);
          }
          setMediaUrls(prev => [...prev, ...newUrls]);
          toast.success(`Uploaded ${newUrls.length} image(s)`);
      } catch (err) {
          console.error(err);
          toast.error("Upload failed");
      } finally {
          setUploading(false);
          // Reset input
          e.target.value = "";
      }
  };

  const removeMedia = (index: number) => {
      setMediaUrls(prev => prev.filter((_, i) => i !== index));
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
            status: 'scheduled',
            media_urls: mediaUrls
        };

        if (postToEdit) {
            await puter(`/posts/${postToEdit.id}`, payload);
            toast.success("Post updated successfully");
        } else {
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

  // ... (handleDelete same as before)
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
        className="relative w-full max-w-lg rounded-xl border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
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
                <label className="text-sm font-medium leading-none">
                    Content
                </label>
                <div className="relative">
                    <Textarea 
                        placeholder="What do you want to share?"
                        className="min-h-[120px] resize-none pb-6"
                        value={content}
                        onChange={handleContentChange}
                    />
                     {typingUsers.length > 0 && (
                        <p className="text-[10px] text-muted-foreground animate-pulse absolute bottom-2 left-2 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                            {typingUsers.join(', ')} is typing...
                        </p>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Media</label>
                <div className="flex gap-2 flex-wrap">
                    {mediaUrls.map((url, i) => (
                        <div key={i} className="relative h-16 w-16 rounded overflow-hidden border group">
                            <img src={url} alt="Media" className="h-full w-full object-cover" />
                            <button 
                                onClick={() => removeMedia(i)}
                                className="absolute top-0 right-0 bg-black/50 text-white p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                    <div className="relative">
                        <input 
                            type="file" 
                            accept="image/*" 
                            multiple 
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={handleUpload}
                            disabled={uploading}
                        />
                        <Button variant="outline" size="icon" className="h-16 w-16" disabled={uploading}>
                            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
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
            ) : <div />}

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
