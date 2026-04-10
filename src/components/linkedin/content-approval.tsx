"use client";

import { useState, useEffect, useCallback } from "react";
import { fetcher, poster, puter, remover } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";

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
  AlertTriangle,
  FileText,
  CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { DraftComments } from "@/components/shared/draft-comments";
import { MediaPickerModal } from "@/components/shared/media-library";


// ─── Types ────────────────────────────────────────────────────────────────────
interface Draft {
  id: string;
  content: string;
  status: string;
  platform?: string;
  created_at: string;
  scheduled_time?: string | null;
  media_urls?: string[];
}

// ─── Platform character limits ───────────────────────────────────────────────
const CHAR_LIMITS: Record<string, number> = {
  twitter: 280,
  x: 280,
  linkedin: 3000,
  instagram: 2200,
  reddit: 40000,
  youtube: 500,
};

function getPlatformLimit(platform?: string): number | null {
  if (!platform) return 3000; // LinkedIn default
  return CHAR_LIMITS[platform.toLowerCase()] ?? null;
}

// ─── CharCounter ─────────────────────────────────────────────────────────────
function CharCounter({ text, platform }: { text: string; platform?: string }) {
  const limit = getPlatformLimit(platform);
  if (!limit) return null;
  const count = text.length;
  const pct = count / limit;
  const isOk = count <= limit;
  const isWarn = pct >= 0.85 && isOk;

  return (
    <div className={cn("flex items-center gap-2 text-xs font-mono", !isOk ? "text-red-500" : isWarn ? "text-amber-500" : "text-muted-foreground")}>
      {!isOk && <AlertTriangle className="h-3 w-3" />}
      <span>{count}</span>
      <span className="opacity-50">/</span>
      <span>{limit}</span>
      {!isOk && (
        <span className="font-semibold">({count - limit} over limit)</span>
      )}
    </div>
  );
}

// ─── Platform badge ───────────────────────────────────────────────────────────
const PLATFORM_META: Record<string, { color: string; label: string }> = {
  linkedin:  { color: "bg-[#0077b5]/10 text-[#0077b5] border-[#0077b5]/20",  label: "LinkedIn"  },
  twitter:   { color: "bg-sky-500/10 text-sky-600 border-sky-500/20",         label: "X / Twitter" },
  x:         { color: "bg-sky-500/10 text-sky-600 border-sky-500/20",         label: "X / Twitter" },
  instagram: { color: "bg-pink-500/10 text-pink-600 border-pink-500/20",      label: "Instagram" },
  reddit:    { color: "bg-orange-500/10 text-orange-600 border-orange-500/20",label: "Reddit"    },
  youtube:   { color: "bg-red-500/10 text-red-600 border-red-500/20",         label: "YouTube"   },
};

function PlatformBadge({ platform }: { platform?: string }) {
  if (!platform) return null;
  const meta = PLATFORM_META[platform.toLowerCase()];
  if (!meta) return <Badge variant="outline" className="text-[10px] capitalize">{platform}</Badge>;
  return (
    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide", meta.color)}>
      {meta.label}
    </span>
  );
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: "bg-green-500/10 text-green-600 border-green-500/20",
    published: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    rejected: "bg-red-500/10 text-red-600 border-red-500/20",
    needs_approval: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  };
  const label: Record<string, string> = {
    approved: "Approved",
    published: "Published",
    rejected: "Rejected",
    needs_approval: "Review",
  };
  const cls = map[status] || "bg-secondary text-muted-foreground";
  return (
    <span className={cn("text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border", cls)}>
      {label[status] ?? status.replace(/_/g, " ")}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function ContentApproval({ platform }: { platform?: string }) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [content, setContent] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkApproving, setBulkApproving] = useState(false);

  // AI Toolbar state
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number; text: string; top: number; left: number } | null>(null);
  const [isRewriting, setIsRewriting] = useState(false);

  // Generate dialog
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [genTopic, setGenTopic] = useState("");
  const [genAudience, setGenAudience] = useState("");
  const [genVoice, setGenVoice] = useState("professional");
  const [genLength, setGenLength] = useState("medium");
  const [professionalism, setProfessionalism] = useState("high");
  const [autoHashtags, setAutoHashtags] = useState(true);
  const [vibeCheck, setVibeCheck] = useState("");
  const [contentPillars, setContentPillars] = useState("");
  const [primaryFocus, setPrimaryFocus] = useState("");
  const [autoTags, setAutoTags] = useState(true);
  const [smartDesc, setSmartDesc] = useState(true);

  // ── Fetch drafts ───────────────────────────────────────────────────────────
  const fetchDrafts = useCallback((pageNum = 1, append = false) => {
    const url = `/posts?status=needs_approval&page=${pageNum}&limit=10${platform ? `&platform=${platform}` : ""}`;
    fetcher(url)
      .then((res) => {
        const list = res.data || res;
        const items: Draft[] = Array.isArray(list) ? list : [];
        setDrafts((prev) => (append ? [...prev, ...items] : items));

        if (res.meta) {
          const total = res.meta.total ?? items.length;
          const limit = res.meta.limit ?? 10;
          setHasMore(pageNum < Math.ceil(total / limit));
        } else {
          setHasMore(items.length === 10);
        }

        if (items.length > 0 && !append) {
          setSelectedPostId(items[0].id);
          setContent(items[0].content);
        }
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        toast.error("Could not fetch drafts");
      })
      .finally(() => setIsLoadingMore(false));
  }, [platform]);

  useEffect(() => { fetchDrafts(1, false); }, [fetchDrafts]);
  useEffect(() => {
    if (page === 1) return;
    setIsLoadingMore(true);
    fetchDrafts(page, true);
  }, [page, fetchDrafts]);

  useEffect(() => {
    if (selectedPostId) {
      const post = drafts.find((d) => d.id === selectedPostId);
      if (post) setContent(post.content);
    }
  }, [selectedPostId, drafts]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 80 && hasMore && !isLoadingMore) {
      setPage((p) => p + 1);
    }
  };

  const activePost = drafts.find((d) => d.id === selectedPostId);
  const charLimit = getPlatformLimit(activePost?.platform ?? platform);
  const isOverLimit = charLimit ? content.length > charLimit : false;

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!activePost) return;
    toast.promise(puter(`/posts/${activePost.id}`, { content, media_urls: activePost.media_urls }), {
      loading: "Saving changes…",
      success: () => { fetchDrafts(1, false); setEditMode(false); return "Draft saved!"; },
      error: "Failed to save draft",
    });
  };

  const handleRegenerate = () => {
    if (!activePost) return;
    toast.promise(
      poster("/create-draft", { 
        trend_id: activePost.id, 
        regenerate: true,
        platform: activePost.platform ?? platform ?? "linkedin"
      }),
      {
        loading: "Regenerating with AI…",
        success: () => { fetchDrafts(1, false); return "New draft ready in queue!"; },
        error: "Failed to regenerate",
      }
    );
  };

  const handleDelete = () => {
    if (!activePost) return;
    toast.promise(remover(`/posts/${activePost.id}`), {
      loading: "Deleting…",
      success: () => {
        const remaining = drafts.filter((d) => d.id !== activePost.id);
        setDrafts(remaining);
        setSelectedPostId(remaining.length > 0 ? remaining[0].id : null);
        return "Draft deleted";
      },
      error: "Failed to delete",
    });
  };

  // ── Bulk approve ─────────────────────────────────────────────────────────
  const handleBulkApprove = async () => {
    if (bulkSelected.size === 0) return;
    setBulkApproving(true);
    try {
      await Promise.all(
        Array.from(bulkSelected).map((id) => {
          const draft = drafts.find(d => d.id === id);
          const overridePlatform = draft?.platform ?? platform ?? "linkedin";
          return poster("/trigger-post", { post_id: id, platform: overridePlatform });
        })
      );
      toast.success(`${bulkSelected.size} post${bulkSelected.size > 1 ? "s" : ""} published!`);
      setBulkSelected(new Set());
      fetchDrafts(1, false);
    } catch {
      toast.error("Some posts failed to publish");
    } finally {
      setBulkApproving(false);
    }
  };

  const toggleBulk = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setBulkSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allSelected = drafts.length > 0 && bulkSelected.size === drafts.length;
  const someSelected = bulkSelected.size > 0;

  // ── AI Toolbar Handling ──────────────────────────────────────────────────
  const handleMouseUp = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    if (start !== end) {
      const text = textarea.value.substring(start, end);
      // Position just above the cursor for simplicity
      setSelectionRange({
        start,
        end,
        text,
        top: e.clientY - 50,
        left: Math.max(10, e.clientX - 150),
      });
    } else {
      setSelectionRange(null);
    }
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.ai-toolbar')) {
        setSelectionRange(null);
      }
    };
    if (selectionRange) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [selectionRange]);

  const handleRewrite = async (instruction: string) => {
    if (!selectionRange || !activePost) return;
    setIsRewriting(true);
    try {
      const res = await poster("/rewrite", {
        text: selectionRange.text,
        instruction,
        platform: activePost.platform ?? platform ?? "linkedin",
      });
      if (res.rewritten) {
        const newContent = content.substring(0, selectionRange.start) + res.rewritten + content.substring(selectionRange.end);
        setContent(newContent);
        setSelectionRange(null);
        toast.success("Text improved!");
      }
    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : null) || "Rewrite failed");
    } finally {
      setIsRewriting(false);
    }
  };

  // ── Generate ──────────────────────────────────────────────────────────────
  const handleGenerateDraft = async () => {
    if (!genTopic.trim()) { toast.error("Please enter a topic"); return; }
    setIsGenerating(true);
    try {
      const currentPlatform = platform || "linkedin";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: Record<string, any> = {
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
    } catch {
      toast.error("Error connecting to generator");
    } finally {
      setIsGenerating(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 lg:h-[calc(100vh-220px)] animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ══ LEFT: Queue ══════════════════════════════════════════════════════ */}
      <div className="lg:col-span-4 flex flex-col gap-3 h-auto max-h-[500px] lg:h-full lg:max-h-[calc(100vh-220px)]">

        {/* Queue header */}
        <div className="flex items-center justify-between shrink-0 gap-2">
          <div>
            <h3 className="font-semibold text-base leading-tight">Content Queue</h3>
            <p className="text-xs text-muted-foreground">{drafts.length} draft{drafts.length !== 1 ? "s" : ""} awaiting review</p>
          </div>
          <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 shrink-0">
                <Sparkles className="h-3.5 w-3.5" /> Generate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate New Draft</DialogTitle>
                <DialogDescription>AI will research current trends and create a post draft for you.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="topic">Topic *</Label>
                  <Input id="topic" placeholder="e.g., AI in Healthcare, B2B Sales" value={genTopic} onChange={(e) => setGenTopic(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="audience">Target Audience</Label>
                  <Input id="audience" placeholder="e.g., CEOs, Developers, Founders" value={genAudience} onChange={(e) => setGenAudience(e.target.value)} />
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
                      <Label className="cursor-pointer">Auto-Hashtags</Label>
                      <Switch checked={autoHashtags} onCheckedChange={setAutoHashtags} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Vibe</Label>
                      <Input placeholder="e.g. Sarcastic, Analytic, Hype" value={vibeCheck} onChange={(e) => setVibeCheck(e.target.value)} />
                    </div>
                  </>
                )}
                {platform === "youtube" && (
                  <>
                    <div className="grid gap-2">
                      <Label>Content Pillars</Label>
                      <Input placeholder="e.g. Edu, Entertaining" value={contentPillars} onChange={(e) => setContentPillars(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Primary Focus</Label>
                      <Input placeholder="Main keyword/concept" value={primaryFocus} onChange={(e) => setPrimaryFocus(e.target.value)} />
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
                <Button onClick={handleGenerateDraft} disabled={isGenerating || !genTopic.trim()}>
                  {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating…</> : "Generate Draft"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Bulk action bar */}
        {drafts.length > 1 && (
          <div className="flex items-center gap-3 px-3 py-2 bg-secondary/30 rounded-lg border border-border shrink-0">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => {
                if (allSelected) setBulkSelected(new Set());
                else setBulkSelected(new Set(drafts.map((d) => d.id)));
              }}
              id="select-all"
              className="h-4 w-4 rounded accent-primary cursor-pointer"
            />
            <label htmlFor="select-all" className="text-xs font-medium cursor-pointer flex-1">
              {someSelected ? `${bulkSelected.size} selected` : "Select all"}
            </label>
            {someSelected && (
              <Button
                size="sm"
                onClick={handleBulkApprove}
                disabled={bulkApproving}
                className="h-7 text-xs gap-1.5 bg-green-600 hover:bg-green-700 text-white"
              >
                {bulkApproving
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <CheckSquare className="h-3 w-3" />}
                Publish {bulkSelected.size}
              </Button>
            )}
          </div>
        )}

        {/* Draft list */}
        <div
          className="flex-1 overflow-y-auto pr-1 space-y-2"
          onScroll={handleScroll}
          data-lenis-prevent="true"
        >
          {drafts.length === 0 && !isLoadingMore && (
            <div className="border-2 border-dashed rounded-xl">
              <EmptyState
                icon={FileText}
                title="No drafts in queue"
                description="Run a trend scan or click Generate to create AI drafts for review."
                action={{ label: "Generate Draft", onClick: () => setShowGenerateDialog(true) }}
                compact
              />
            </div>
          )}

          {drafts.map((draft) => {
            const limit = getPlatformLimit(draft.platform ?? platform);
            const wordCount = draft.content.trim().split(/\s+/).filter(Boolean).length;
            const isOver = limit ? draft.content.length > limit : false;

            return (
              <div
                key={draft.id}
                onClick={() => { setSelectedPostId(draft.id); setEditMode(false); }}
                className={cn(
                  "p-3.5 rounded-xl border cursor-pointer transition-all duration-200 relative",
                  selectedPostId === draft.id
                    ? "bg-card border-primary ring-1 ring-primary/20 shadow-md"
                    : "bg-card/50 border-border hover:border-primary/50 hover:bg-secondary/20"
                )}
              >
                {/* Checkbox for bulk */}
                <div
                  className="absolute top-3 right-3"
                  onClick={(e) => toggleBulk(draft.id, e)}
                >
                  <input
                    type="checkbox"
                    checked={bulkSelected.has(draft.id)}
                    onChange={() => toggleBulk(draft.id)}
                    className="h-4 w-4 rounded accent-primary cursor-pointer"
                  />
                </div>

                {/* Platform + Status */}
                <div className="flex items-center gap-1.5 mb-2 pr-7 flex-wrap">
                  <PlatformBadge platform={draft.platform ?? platform} />
                  <StatusBadge status={draft.status} />
                  {isOver && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 font-bold">
                      ⚠ Over limit
                    </span>
                  )}
                </div>

                {/* Preview snippet */}
                <p className={cn(
                  "text-xs leading-relaxed line-clamp-2 mb-2",
                  selectedPostId === draft.id ? "text-foreground" : "text-muted-foreground"
                )}>
                  {draft.content}
                </p>

                {/* Meta row */}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-2.5 w-2.5" />
                    {new Date(draft.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                  <span>{wordCount} words · {draft.content.length}{limit ? `/${limit}` : ""} chars</span>
                </div>
              </div>
            );
          })}

          {isLoadingMore && (
            <div className="flex justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!hasMore && drafts.length > 0 && (
            <p className="text-center text-xs text-muted-foreground py-2">All drafts loaded</p>
          )}
        </div>
      </div>

      {/* ══ RIGHT: Editor / Preview ══════════════════════════════════════════ */}
      {activePost ? (
        <Card className="lg:col-span-8 flex flex-col border-border shadow-sm overflow-hidden h-auto lg:h-full lg:max-h-[calc(100vh-220px)]">
          {/* Header */}
          <div className="border-b px-5 py-3.5 flex items-center justify-between bg-card shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-sm">Reviewing Draft</h3>
                  <PlatformBadge platform={activePost.platform ?? platform} />
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span>Generated by Agent</span>
                  <span>·</span>
                  <CharCounter text={content} platform={activePost.platform ?? platform} />
                </div>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {editMode ? (
                <>
                  <MediaPickerModal 
                    onSelect={(url) => setDrafts(prev => prev.map(d => d.id === activePost.id ? { ...d, media_urls: [...(d.media_urls || []), url] } : d))} 
                  />
                  <Button variant="outline" size="sm" onClick={() => { setEditMode(false); setContent(activePost.content); }}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={isOverLimit}>
                    Save Changes
                  </Button>
                </>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setEditMode(true)}>
                  <Edit3 className="h-3.5 w-3.5 mr-1.5" /> Edit
                </Button>
              )}
            </div>
          </div>

          {/* Over-limit warning banner */}
          {isOverLimit && (
            <div className="flex items-center gap-2 bg-red-500/10 border-b border-red-500/20 px-5 py-2.5 text-red-600 text-xs shrink-0">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>
                This post is <strong>{content.length - (charLimit ?? 0)} characters over</strong> the{" "}
                {activePost.platform ?? platform ?? "platform"} limit ({charLimit} chars). Trim before publishing.
              </span>
            </div>
          )}

          {/* Scroll area */}
          <div className="flex-1 min-h-0 overflow-y-auto bg-secondary/5 p-6 md:p-8" data-lenis-prevent="true">
            <div className="max-w-2xl mx-auto space-y-4">
              {/* Schedule editor */}
              {editMode && (
                <div className="bg-card border p-4 rounded-xl shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" /> Schedule
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Publish Date & Time</label>
                      <input
                        type="datetime-local"
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={activePost.scheduled_time ? new Date(activePost.scheduled_time).toISOString().slice(0, 16) : ""}
                        onChange={(e) => {
                          const newTime = e.target.value ? new Date(e.target.value).toISOString() : null;
                          setDrafts((prev) => prev.map((d) => d.id === activePost.id ? { ...d, scheduled_time: newTime } : d));
                        }}
                      />
                    </div>
                    <div className="flex items-end">
                      <p className="text-xs text-muted-foreground mb-2">
                        {activePost.scheduled_time
                          ? `Scheduled for ${new Date(activePost.scheduled_time).toLocaleString()}`
                          : "Not scheduled — will publish immediately when approved."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Post preview */}
              <div className="bg-card border shadow-sm rounded-xl overflow-hidden">
                {/* Profile header */}
                <div className="p-4 border-b flex gap-3 items-center">
                  <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary text-sm shrink-0">
                    KA
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Krishil Agrawal</div>
                    <div className="text-xs text-muted-foreground">
                      Building AI Canvas · Just now · <span className="opacity-60">🌐</span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 md:p-6 text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                  {editMode ? (
                    <>
                      <textarea
                        className="w-full min-h-[260px] bg-transparent resize-y focus:outline-none text-sm leading-relaxed"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onMouseUp={handleMouseUp}
                        autoFocus
                        disabled={isRewriting}
                      />
                      {/* Floating AI Toolbar */}
                      {selectionRange && (
                        <div
                          className="ai-toolbar fixed z-50 flex items-center gap-1 bg-background/95 backdrop-blur-md border shadow-xl rounded-lg p-1.5 animate-in zoom-in duration-200"
                          style={{ top: selectionRange.top, left: selectionRange.left }}
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          <div className="pl-2 pr-1 flex items-center gap-1.5 border-r border-border/50">
                            <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
                            <span className="text-[11px] font-semibold mr-1 uppercase tracking-wider text-muted-foreground">AI Edit</span>
                          </div>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs hover:bg-primary/10 hover:text-primary" onClick={() => handleRewrite("Make this punchier and more engaging")} disabled={isRewriting}>
                            Punchier
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs hover:bg-primary/10 hover:text-primary" onClick={() => handleRewrite("Make this shorter and more concise")} disabled={isRewriting}>
                            Shorter
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs hover:bg-primary/10 hover:text-primary" onClick={() => handleRewrite("Expand on this point with more detail")} disabled={isRewriting}>
                            Longer
                          </Button>
                          {isRewriting && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary ml-1 mr-2" />}
                        </div>
                      )}
                    </>
                  ) : (
                    content
                  )}
                  {activePost.media_urls && activePost.media_urls.length > 0 && (
                    <div className="mt-4 grid gap-2 grid-cols-1 sm:grid-cols-2">
                      {activePost.media_urls.map((url: string, i: number) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={url} alt="Media" className="rounded-lg border object-cover w-full h-auto max-h-[300px]" />
                      ))}
                    </div>
                  )}
                </div>

                {/* Platform engagement bar */}
                <div className="border-t bg-secondary/5 px-4 py-2.5 flex justify-between text-muted-foreground">
                  <div className="flex gap-4 text-xs font-medium text-muted-foreground/70">
                    <span>👍 Like</span><span>💬 Comment</span><span>🔁 Repost</span><span>📩 Send</span>
                  </div>
                </div>
              </div>

              {/* Char count progress bar */}
              {charLimit && (
                <div className="space-y-1.5">
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        content.length > charLimit ? "bg-red-500" : content.length / charLimit > 0.85 ? "bg-amber-500" : "bg-primary"
                      )}
                      style={{ width: `${Math.min((content.length / charLimit) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
                    <span>0</span>
                    <span>{Math.round(charLimit * 0.85)} (85%)</span>
                    <span>{charLimit}</span>
                  </div>
                </div>
              )}

              {/* Draft Comments */}
              <div className="pt-2">
                <DraftComments postId={activePost.id} />
              </div>
            </div>
          </div>

          {/* Action bar */}
          <div className="border-t p-4 bg-card flex items-center justify-between gap-4 shrink-0">
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-foreground gap-2"
              onClick={handleRegenerate}
            >
              <RefreshCw className="h-4 w-4" /> Regenerate
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="border-destructive/30 text-destructive hover:bg-destructive/10"
                onClick={handleDelete}
              >
                <X className="mr-1.5 h-4 w-4" /> Delete
              </Button>

              {activePost.status === "published" ? (
                <Button disabled className="bg-secondary text-muted-foreground">
                  <Check className="mr-1.5 h-4 w-4" /> Published
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    disabled={isOverLimit}
                    onClick={() => {
                      toast.promise(poster("/trigger-post", { 
                        post_id: activePost.id,
                        platform: activePost.platform ?? platform ?? "linkedin"
                      }), {
                        loading: "Publishing now…",
                        success: () => { fetchDrafts(1, false); return "Published!"; },
                        error: "Failed to publish",
                      });
                    }}
                  >
                    <Zap className="mr-1.5 h-4 w-4" /> Publish Now
                  </Button>
                  <Button
                    disabled={isOverLimit}
                    className="bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-900/20"
                    onClick={() => {
                      if (!activePost.scheduled_time) {
                        toast.error("Set a schedule time first — click Edit.");
                        setEditMode(true);
                        return;
                      }
                      toast.promise(
                        puter(`/posts/${activePost.id}`, { status: "scheduled", scheduled_time: activePost.scheduled_time }),
                        {
                          loading: "Scheduling…",
                          success: () => { fetchDrafts(1, false); return "Post scheduled!"; },
                          error: "Failed to schedule",
                        }
                      );
                    }}
                  >
                    <Calendar className="mr-1.5 h-4 w-4" /> Schedule
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>
      ) : (
        <div className="lg:col-span-8 flex items-center justify-center h-[300px] lg:h-full border rounded-xl border-dashed">
          <EmptyState
            icon={FileText}
            title="No draft selected"
            description="Pick a draft from the queue on the left to preview and approve it."
            compact
          />
        </div>
      )}
    </div>
  );
}
