"use client";

import { useState, useEffect } from "react";
import { fetcher, poster, puter, remover } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import {
  Check,
  X,
  RefreshCw,
  Edit3,
  Calendar,
  Zap,
  Clock,
  Sparkles,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function ContentApproval({ platform }: { platform?: string }) {
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [content, setContent] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [genTopic, setGenTopic] = useState("");
  const [genAudience, setGenAudience] = useState("");
  const [genVoice, setGenVoice] = useState("professional");
  const [genLength, setGenLength] = useState("medium");

  // Platform Specific State
  const [professionalism, setProfessionalism] = useState("high");
  const [autoHashtags, setAutoHashtags] = useState(true);
  const [vibeCheck, setVibeCheck] = useState("");
  const [contentPillars, setContentPillars] = useState("");
  const [primaryFocus, setPrimaryFocus] = useState("");
  const [autoTags, setAutoTags] = useState(true);
  const [smartDesc, setSmartDesc] = useState(true);

  // ─── Fetch Drafts (append mode for infinite scroll) ───────────────────────
  const fetchDrafts = (pageNum = 1, append = false) => {
    const url = `/posts?status=needs_approval&page=${pageNum}&limit=10${platform ? `&platform=${platform}` : ""}`;
    fetcher(url)
      .then((res) => {
        const list = res.data || res;
        const items: any[] = Array.isArray(list) ? list : [];
        setDrafts((prev) => (append ? [...prev, ...items] : items));

        if (res.meta) {
          const total = res.meta.total ?? items.length;
          const limit = res.meta.limit ?? 10;
          setHasMore(pageNum < Math.ceil(total / limit));
        } else {
          setHasMore(items.length === 10);
        }

        if (items.length > 0 && !selectedPostId) {
          setSelectedPostId(items[0].id);
          setContent(items[0].content);
        }
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        toast.error("Could not fetch drafts");
      })
      .finally(() => setIsLoadingMore(false));
  };

  // Initial load
  useEffect(() => {
    fetchDrafts(1, false);
  }, []);

  // Load more batch when page increments
  useEffect(() => {
    if (page === 1) return;
    setIsLoadingMore(true);
    fetchDrafts(page, true);
  }, [page]);

  // Sync editor content when selection changes
  useEffect(() => {
    if (selectedPostId) {
      const post = drafts.find((d) => d.id === selectedPostId);
      if (post) setContent(post.content);
    }
  }, [selectedPostId, drafts]);

  // ─── Infinite scroll handler ───────────────────────────────────────────────
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 80 && hasMore && !isLoadingMore) {
      setPage((p) => p + 1);
    }
  };

  // ─── Save Edit ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!activePost) return;
    toast.promise(puter(`/posts/${activePost.id}`, { content }), {
      loading: "Saving changes...",
      success: () => {
        fetchDrafts(1, false);
        return "Draft saved successfully";
      },
      error: "Failed to save draft",
    });
  };

  const activePost = drafts.find((d) => d.id === selectedPostId);

  // ─── Approve / Publish ────────────────────────────────────────────────────
  const handleApprove = async () => {
    if (!activePost) return;
    toast.promise(poster("/trigger-post", { post_id: activePost.id }), {
      loading: "Publishing...",
      success: () => {
        fetchDrafts(1, false);
        return "Post published successfully!";
      },
      error: "Failed to publish post",
    });
  };

  // ─── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!activePost) return;
    toast.promise(remover(`/posts/${activePost.id}`), {
      loading: "Deleting draft...",
      success: () => {
        const remaining = drafts.filter((d) => d.id !== activePost.id);
        setDrafts(remaining);
        setSelectedPostId(remaining.length > 0 ? remaining[0].id : null);
        return "Draft deleted";
      },
      error: "Failed to delete draft",
    });
  };

  // ─── Generate Draft ───────────────────────────────────────────────────────
  const handleGenerateDraft = async () => {
    if (!genTopic.trim()) {
      toast.error("Please enter a topic");
      return;
    }
    setIsGenerating(true);
    try {
      const currentPlatform = platform || "linkedin";
      const payload: any = {
        automation_type: `${currentPlatform}_draft`,
        topic: genTopic,
        target_audience: genAudience,
        voice_preset: genVoice,
        length: genLength,
        platform: currentPlatform,
        timestamp: new Date().toISOString(),
      };

      if (currentPlatform === "linkedin") payload.professionalism = professionalism;
      else if (currentPlatform === "twitter") {
        payload.automated_hashtags = autoHashtags;
        payload.vibe_check = vibeCheck;
      } else if (currentPlatform === "youtube") {
        payload.content_pillars = contentPillars;
        payload.primary_focus = primaryFocus;
        payload.auto_generate_tags = autoTags;
        payload.smart_description = smartDesc;
      }

      const response = await fetch("http://localhost:5678/webhook/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success("Draft generation started!");
        setShowGenerateDialog(false);
        setGenTopic("");
        setGenAudience("");
        fetchDrafts(1, false);
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

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="grid lg:grid-cols-12 gap-6 h-auto lg:h-[calc(100vh-220px)] animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Left: Queue (fixed height, inner scroll) ── */}
      <div className="lg:col-span-4 flex flex-col gap-3 h-full max-h-[calc(100vh-220px)] overflow-hidden">

        {/* Header + Generate */}
        <div className="flex items-center justify-between shrink-0">
          <h3 className="font-semibold text-lg">Content Queue</h3>
          <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
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
                  AI will research current trends and create a drafted post for you.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="topic">Topic</Label>
                  <Input
                    id="topic"
                    placeholder="e.g., Leadership, B2B Sales, Tech Trends"
                    value={genTopic}
                    onChange={(e) => setGenTopic(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="audience">Target Audience</Label>
                  <Input
                    id="audience"
                    placeholder="e.g., CEOs, HR Managers, Developers"
                    value={genAudience}
                    onChange={(e) => setGenAudience(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Voice Preset</Label>
                    <Select value={genVoice} onValueChange={setGenVoice}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="humorous">Humorous</SelectItem>
                        <SelectItem value="inspirational">Inspirational</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Length</Label>
                    <Select value={genLength} onValueChange={setGenLength}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="short">Short</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="long">Long</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {(!platform || platform === "linkedin") && (
                  <div className="grid gap-2">
                    <Label>Professionalism</Label>
                    <Select value={professionalism} onValueChange={setProfessionalism}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="strict">Strict Corporate</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="balanced">Balanced</SelectItem>
                        <SelectItem value="approachable">Approachable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {platform === "twitter" && (
                  <>
                    <div className="flex items-center justify-between border p-3 rounded-md">
                      <Label htmlFor="auto-hashtags" className="cursor-pointer">Auto-Hashtags</Label>
                      <Switch id="auto-hashtags" checked={autoHashtags} onCheckedChange={setAutoHashtags} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="vibe">Vibe Check</Label>
                      <Input id="vibe" placeholder="e.g. Sarcastic, Analytic, Hype" value={vibeCheck} onChange={(e) => setVibeCheck(e.target.value)} />
                    </div>
                  </>
                )}

                {platform === "youtube" && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="pillars">Content Pillars</Label>
                      <Input id="pillars" placeholder="e.g. Edu, Entertaining" value={contentPillars} onChange={(e) => setContentPillars(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="focus">Primary Focus</Label>
                      <Input id="focus" placeholder="Main keyword/concept" value={primaryFocus} onChange={(e) => setPrimaryFocus(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 border p-2 rounded-md">
                        <Switch id="auto-tags" checked={autoTags} onCheckedChange={setAutoTags} />
                        <Label htmlFor="auto-tags" className="text-xs">Auto Tags</Label>
                      </div>
                      <div className="flex items-center gap-2 border p-2 rounded-md">
                        <Switch id="smart-desc" checked={smartDesc} onCheckedChange={setSmartDesc} />
                        <Label htmlFor="smart-desc" className="text-xs">Smart Desc</Label>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>Cancel</Button>
                <Button onClick={handleGenerateDraft} disabled={isGenerating}>
                  {isGenerating ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
                  ) : "Generate Draft"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Infinite-scroll draft list */}
        <div
          className="flex-1 overflow-y-auto pr-1 space-y-2"
          onScroll={handleScroll}
          data-lenis-prevent="true"
        >
          {drafts.length === 0 && !isLoadingMore && (
            <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-xl">
              No drafts found. <br /> Check the Trends tab to generate some.
            </div>
          )}

          {drafts.map((draft) => (
            <div
              key={draft.id}
              onClick={() => setSelectedPostId(draft.id)}
              className={cn(
                "p-4 rounded-xl border cursor-pointer transition-all duration-200 group relative",
                selectedPostId === draft.id
                  ? "bg-card border-primary ring-1 ring-primary/20 shadow-md"
                  : "bg-card/50 border-border hover:border-primary/50 hover:bg-secondary/20",
              )}
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className={cn("font-semibold text-sm line-clamp-1", selectedPostId === draft.id ? "text-primary" : "text-foreground")}>
                  {draft.content.substring(0, 30)}...
                </h4>
                <StatusBadge status={draft.status} />
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                {draft.content}
              </p>
              <div className="flex items-center text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />{" "}
                  {new Date(draft.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}

          {/* Loading spinner */}
          {isLoadingMore && (
            <div className="flex justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* End of list indicator */}
          {!hasMore && drafts.length > 0 && (
            <p className="text-center text-xs text-muted-foreground py-2">All drafts loaded</p>
          )}
        </div>
      </div>

      {/* ── Right: Editor / Preview ── */}
      {activePost ? (
        <Card className="lg:col-span-8 flex flex-col border-border shadow-sm overflow-hidden h-full max-h-[calc(100vh-220px)]">
          <div className="border-b px-6 py-4 flex items-center justify-between bg-card">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <div>
                <h3 className="font-bold text-sm">Reviewing Draft</h3>
                <p className="text-xs text-muted-foreground">
                  Generated by Agent • {content.length} chars
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {editMode ? (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditMode(false); setContent(activePost.content); }}>
                    Cancel
                  </Button>
                  <Button variant="default" size="sm" onClick={() => { handleSave(); setEditMode(false); }}>
                    Save Changes
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setEditMode(true)}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Content
                </Button>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto bg-secondary/5 p-6 md:p-10" data-lenis-prevent="true">
            <div className="max-w-2xl mx-auto space-y-4">
              {editMode && (
                <div className="bg-card border p-4 rounded-xl shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" /> Scheduling
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Publish Date</label>
                      <input
                        type="datetime-local"
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={activePost.scheduled_time ? new Date(activePost.scheduled_time).toISOString().slice(0, 16) : ""}
                        onChange={(e) => {
                          const newTime = e.target.value ? new Date(e.target.value).toISOString() : null;
                          setDrafts(drafts.map((d) => d.id === activePost.id ? { ...d, scheduled_time: newTime } : d));
                        }}
                      />
                    </div>
                    <div className="flex items-end">
                      <p className="text-xs text-muted-foreground mb-2">
                        {activePost.scheduled_time ? `Scheduled for ${new Date(activePost.scheduled_time).toLocaleString()}` : "Not scheduled yet"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Post Preview */}
              <div className="bg-card border shadow-sm rounded-xl overflow-hidden min-h-[300px]">
                <div className="p-4 border-b flex gap-3">
                  <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary">KA</div>
                  <div>
                    <div className="font-semibold text-sm">Krishil Agrawal</div>
                    <div className="text-xs text-muted-foreground">Building AI Canvas • Now • <span className="opacity-60">🌐</span></div>
                  </div>
                </div>

                <div className="p-4 md:p-6 text-sm md:text-base leading-relaxed whitespace-pre-wrap font-sans text-foreground/90">
                  {editMode ? (
                    <textarea className="w-full h-[300px] bg-transparent resize-none focus:outline-none" value={content} onChange={(e) => setContent(e.target.value)} />
                  ) : content}

                  {activePost.media_urls && activePost.media_urls.length > 0 && (
                    <div className="mt-4 grid gap-2 grid-cols-1 sm:grid-cols-2">
                      {activePost.media_urls.map((url: string, i: number) => (
                        <img key={i} src={url} alt="Media" className="rounded-lg border object-cover w-full h-auto max-h-[300px]" />
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t bg-secondary/5 px-4 py-3 flex justify-between text-muted-foreground">
                  <div className="flex gap-4 text-xs font-medium">
                    <span>Like</span><span>Comment</span><span>Repost</span><span>Send</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t p-4 bg-card flex justify-between gap-4">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
              <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
            </Button>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleDelete}
              >
                <X className="mr-2 h-4 w-4" /> Delete
              </Button>

              {activePost.status === "published" ? (
                <Button disabled className="bg-secondary text-muted-foreground">
                  <Check className="mr-2 h-4 w-4" /> Published
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      toast.promise(poster("/trigger-post", { post_id: activePost.id }), {
                        loading: "Publishing now...",
                        success: () => { fetchDrafts(1, false); return "Published successfully!"; },
                        error: "Failed to publish",
                      });
                    }}
                  >
                    <Zap className="mr-2 h-4 w-4" /> Publish Now
                  </Button>
                  <Button
                    onClick={() => {
                      if (!activePost.scheduled_time) {
                        toast.error("Please set a schedule time first (click Edit)");
                        setEditMode(true);
                        return;
                      }
                      toast.promise(
                        puter(`/posts/${activePost.id}`, { status: "scheduled", scheduled_time: activePost.scheduled_time }),
                        { loading: "Scheduling...", success: () => { fetchDrafts(1, false); return "Post scheduled!"; }, error: "Failed to schedule" },
                      );
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20"
                  >
                    <Calendar className="mr-2 h-4 w-4" /> Schedule
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>
      ) : (
        <div className="lg:col-span-8 flex items-center justify-center h-full border rounded-xl border-dashed text-muted-foreground">
          Select a draft to review
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") {
    return <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/20">Approved</span>;
  }
  if (status === "published") {
    return <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">Published</span>;
  }
  if (status === "rejected") {
    return <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 border border-red-500/20">Rejected</span>;
  }
  return <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">Review</span>;
}
