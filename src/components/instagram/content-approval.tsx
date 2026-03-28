"use client";
import { useState, useEffect } from "react";
import { fetcher, puter, remover } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Loader2,
  Calendar as CalendarIcon,
  CheckCircle,
  XCircle,
  RefreshCcw,
  Image as ImageIcon,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const WEBHOOK_URL = "http://localhost:5678/webhook/instagram_draft";

interface Draft {
  id: string;
  type: "image" | "reel";
  imageUrl: string;
  caption: string;
  status: string;
  scheduledFor: string;
  likes: number;
  comments: number;
}

export function ContentApproval() {
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);

  // Editor State
  const [caption, setCaption] = useState("");

  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [genTopic, setGenTopic] = useState("");
  const [genAudience, setGenAudience] = useState("");
  const [genVoice, setGenVoice] = useState("casual");
  const [genLength, setGenLength] = useState("medium");

  useEffect(() => {
    fetcher("/api/v1/posts?platform=instagram&status=draft")
      .then((data) => {
        const mapped = (data || []).map((p: any) => ({
          id: p.id,
          type: p.media_type || "image", // fallback
          imageUrl:
            p.media_url ||
            "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=500&h=500&fit=crop", // fallback
          caption: p.content,
          status: p.status,
          scheduledFor: p.scheduled_at
            ? new Date(p.scheduled_at).toLocaleString()
            : "Unscheduled",
          likes: 0,
          comments: 0,
        }));
        setDrafts(mapped);
      })
      .catch((e) => console.error("Failed to load drafts", e))
      .finally(() => setLoading(false));
  }, []);

  const activePost = drafts.find((d) => d.id === selectedPostId);

  useEffect(() => {
    if (activePost) {
      setCaption(activePost.caption);
    }
  }, [selectedPostId, activePost]);

  const handleApprove = async () => {
    if (!selectedPostId) return;

    try {
      await puter(`/api/v1/posts/${selectedPostId}`, {
        status: "scheduled",
        content: caption, // Save any edits to caption
        scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Schedule for tomorrow for now
      });
      toast.success("Post approved and scheduled!");
      setDrafts(drafts.filter((d) => d.id !== selectedPostId));
      setSelectedPostId(null);
    } catch (e) {
      toast.error("Failed to approve post");
    }
  };

  const handleReject = async () => {
    if (!selectedPostId) return;
    try {
      await remover(`/api/v1/posts/${selectedPostId}`);
      toast("Draft rejected", {
        description: "The agent will learn from this.",
      });
      setDrafts(drafts.filter((d) => d.id !== selectedPostId));
      setSelectedPostId(null);
    } catch (e) {
      toast.error("Failed to reject post");
    }
  };

  const handleGenerateDraft = async () => {
    if (!genTopic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    setIsGenerating(true);
    try {
      const payload = {
        topic: genTopic,
        target_audience: genAudience,
        voice_preset: genVoice,
        length: genLength,
        platform: "instagram",
        timestamp: new Date().toISOString(),
      };

      // In a real app, this would likely go to your backend, which then proxies to n8n
      // or directly to n8n if CORS allows. Assuming direct for this prototype.
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success("Draft generation started!");
        setShowGenerateDialog(false);
        // Reset form
        setGenTopic("");
        setGenAudience("");
        // In a real app, we might poll for the new draft or receive a socket event.
        // For now, we'll just show a success message.
      } else {
        toast.error("Failed to trigger generation");
      }
    } catch (error) {
      toast.error("Error connecting to generator");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 lg:h-[calc(100vh-220px)] animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 1. Queue List */}
      <div className="lg:col-span-4 flex flex-col border-b pb-4 lg:border-b-0 lg:pb-0 lg:border-r lg:pr-4 h-auto max-h-[500px] lg:h-full lg:max-h-[calc(100vh-220px)] overflow-hidden">
        <h3 className="font-semibold text-lg mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            Content Queue
            <Badge variant="secondary">{drafts.length}</Badge>
          </div>
          <Dialog
            open={showGenerateDialog}
            onOpenChange={setShowGenerateDialog}
          >
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Sparkles className="h-3.5 w-3.5" />
                Generate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate New Draft</DialogTitle>
                <DialogDescription>
                  AI will research current trends and create a drafted post for
                  you.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="topic">Topic</Label>
                  <Input
                    id="topic"
                    placeholder="e.g., Summer Fashion Trends, SaaS Growth Hacks"
                    value={genTopic}
                    onChange={(e) => setGenTopic(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="audience">Target Audience</Label>
                  <Input
                    id="audience"
                    placeholder="e.g., Gen Z, Startup Founders"
                    value={genAudience}
                    onChange={(e) => setGenAudience(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Voice Preset</Label>
                    <Select value={genVoice} onValueChange={setGenVoice}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">
                          Professional
                        </SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="humorous">Humorous</SelectItem>
                        <SelectItem value="inspirational">
                          Inspirational
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Length</Label>
                    <Select value={genLength} onValueChange={setGenLength}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="short">Short</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="long">Long</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowGenerateDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleGenerateDraft} disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate Draft"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </h3>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="animate-spin text-muted-foreground" />
            </div>
          ) : drafts.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground border border-dashed rounded-lg">
              All caught up!
            </div>
          ) : (
            drafts.map((draft) => (
              <div
                key={draft.id}
                onClick={() => setSelectedPostId(draft.id)}
                className={cn(
                  "group flex gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                  selectedPostId === draft.id
                    ? "bg-accent border-primary/50 shadow-sm"
                    : "bg-card hover:bg-accent/50",
                )}
              >
                <div className="h-16 w-16 bg-secondary rounded overflow-hidden flex-shrink-0 relative">
                  <img
                    src={draft.imageUrl}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                  {draft.type === "reel" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="bg-white/90 p-1 rounded-full">
                        <div className="border-l-4 border-l-black border-y-4 border-y-transparent h-2 w-0 ml-0.5" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <Badge
                      variant="outline"
                      className="text-[10px] h-5 px-1 uppercase"
                    >
                      {draft.type}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {draft.scheduledFor}
                    </span>
                  </div>
                  <p className="text-sm line-clamp-2 text-muted-foreground group-hover:text-foreground transition-colors">
                    {draft.caption}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. Editor & Preview Area */}
      {activePost ? (
        <div className="lg:col-span-8 grid md:grid-cols-2 gap-8 h-auto lg:h-full lg:overflow-hidden">
          {/* Editor Column */}
          <div className="flex flex-col gap-6 overflow-y-auto pr-2 pb-10">
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3 border-b bg-secondary/5">
                <CardTitle className="text-base flex items-center gap-2">
                  <RefreshCcw className="h-4 w-4 text-muted-foreground" />
                  Review & Edit
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Caption</label>
                  <Textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="min-h-[150px] resize-none font-sans text-base p-4"
                    placeholder="Write a catchy caption..."
                  />
                  <div className="flex justify-end text-xs text-muted-foreground gap-2">
                    <span>{caption.match(/#\w+/g)?.length || 0} Hashtags</span>
                    <span>{caption.length} Characters</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    className="w-full justify-start text-muted-foreground"
                  >
                    <ImageIcon className="mr-2 h-4 w-4" /> Swap Media
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-muted-foreground"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" /> Reschedule
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3 mt-auto">
              <Button
                variant="outline"
                className="flex-1 border-destructive/20 text-destructive hover:bg-destructive/10"
                onClick={handleReject}
              >
                <XCircle className="mr-2 h-4 w-4" /> Reject
              </Button>
              <Button
                variant="default"
                className="flex-[2]"
                onClick={handleApprove}
              >
                <CheckCircle className="mr-2 h-4 w-4" /> Approve & Schedule
              </Button>
            </div>
          </div>

          {/* Smartphone Preview Column */}
          <div className="flex items-center justify-center bg-secondary/10 rounded-xl p-8 border h-full overflow-hidden relative">
            <div className="text-xs text-muted-foreground absolute top-4 uppercase tracking-widest font-semibold opacity-50">
              Preview
            </div>

            {/* Mock Phone Frame */}
            <div className="w-[300px] bg-white dark:bg-black rounded-[3rem] border-[8px] border-slate-800 shadow-2xl overflow-hidden relative h-[600px] flex flex-col">
              {/* Notch */}
              <div className="absolute top-0 w-full h-6 bg-slate-800 z-10 flex justify-center">
                <div className="w-32 h-4 bg-black rounded-b-xl"></div>
              </div>

              {/* Instagram Header */}
              <div className="mt-8 px-4 py-2 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-yellow-400 to-purple-600 p-[1.5px]">
                    <div className="h-full w-full bg-white dark:bg-black rounded-full p-[1.5px]">
                      <div className="h-full w-full bg-slate-200 rounded-full" />
                    </div>
                  </div>
                  <span className="text-xs font-semibold">your_brand</span>
                </div>
                <MoreHorizontal className="h-4 w-4" />
              </div>

              {/* Content Image */}
              <div
                className={cn(
                  "bg-slate-100 relative",
                  activePost.type === "reel" ? "flex-1" : "aspect-square",
                )}
              >
                <img
                  src={activePost.imageUrl}
                  className="w-full h-full object-cover"
                  alt="Post"
                />
              </div>

              {/* Actions Bar */}
              <div className="px-3 py-2">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex gap-3">
                    <Heart className="h-5 w-5" />
                    <MessageCircle className="h-5 w-5" />
                    <Send className="h-5 w-5" />
                  </div>
                  <Bookmark className="h-5 w-5" />
                </div>
                <div className="text-xs font-bold mb-1">
                  {activePost.likes > 0
                    ? `${activePost.likes} likes`
                    : "Be the first to like this"}
                </div>

                {/* Caption Preview */}
                <div className="text-xs space-y-1">
                  <p>
                    <span className="font-bold mr-1">your_brand</span>
                    {caption.split(" ").map((word, i) =>
                      word.startsWith("#") ? (
                        <span key={i} className="text-blue-500 mr-1">
                          {word}
                        </span>
                      ) : (
                        <span key={i} className="mr-1">
                          {word}
                        </span>
                      ),
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="lg:col-span-8 flex items-center justify-center h-[300px] lg:h-full border rounded-xl border-dashed text-muted-foreground flex-col gap-2">
          <ImageIcon className="h-10 w-10 opacity-20" />
          <span>Select a draft to review</span>
        </div>
      )}
    </div>
  );
}
