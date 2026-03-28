"use client";

import { useState, useEffect, useCallback } from "react";
import { fetcher } from "@/lib/api-client";
import {
  Card, CardHeader, CardTitle, CardContent, CardDescription,
} from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Clock, Info, RefreshCw, FlaskConical, Loader2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { RemixModal } from "./remix-modal";
import { DraftComments } from "./draft-comments";
import { toast } from "sonner";

interface HistoryViewProps {
  platform: string;
}

interface PostInsight {
  hook_score: number;
  cta_score: number;
  analysis: string;
  suggestions: string[];
}

// ─── Inline Post Autopsy Panel ────────────────────────────────────────────────
function PostAutopsy({ postId, platform }: { postId: string; platform: string }) {
  const [insight, setInsight] = useState<PostInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const analyze = async () => {
    if (insight) { setOpen(v => !v); return; }
    setLoading(true);
    setOpen(true);
    try {
      const result = await fetcher("/api/v1/insights/autopsy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: postId }),
      });
      setInsight(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Analysis failed";
      toast.error(msg.includes("AI analysis") ? "Add Gemini API key in Settings to use Post Autopsy" : msg);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const ScoreBar = ({ score, label }: { score: number; label: string }) => (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn(
          "font-semibold",
          score >= 7 ? "text-green-600" : score >= 5 ? "text-amber-600" : "text-red-500"
        )}>{score}/10</span>
      </div>
      <div className="h-1.5 bg-secondary/30 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700",
            score >= 7 ? "bg-green-500" : score >= 5 ? "bg-amber-500" : "bg-red-500"
          )}
          style={{ width: `${score * 10}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="mt-3 border-t border-dashed border-border pt-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={analyze}
        disabled={loading}
        className="h-7 text-xs gap-1.5 text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:hover:bg-violet-500/10"
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <FlaskConical className="h-3 w-3" />}
        {loading ? "Analyzing..." : insight ? (open ? "Hide Autopsy" : "Show Autopsy") : "🔬 Analyze this post"}
      </Button>

      {open && insight && (
        <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200 bg-violet-500/5 border border-violet-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-violet-600" />
            <span className="text-xs font-semibold text-violet-700 dark:text-violet-400">Post Autopsy Results</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ScoreBar score={insight.hook_score} label="Hook Strength" />
            <ScoreBar score={insight.cta_score} label="CTA Clarity" />
          </div>

          <p className="text-xs text-muted-foreground italic border-l-2 border-violet-500/40 pl-3">
            {insight.analysis}
          </p>

          {insight.suggestions.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Improvement Tips:
              </p>
              {insight.suggestions.map((s, i) => (
                <div key={i} className="flex gap-2 text-xs text-foreground/80">
                  <span className="text-violet-600 font-bold shrink-0">{i + 1}.</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main History View ────────────────────────────────────────────────────────
export function HistoryView({ platform }: HistoryViewProps) {
  const [logs, setLogs] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedPost, setSelectedPost] = useState<Record<string, any> | null>(null);
  const [remixPost, setRemixPost] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      try {
        const res = await fetcher(
          `/posts?status=published,failed&platform=${platform.toLowerCase()}&page=${page}&limit=10`
        );
        const list = res.data || res;
        setLogs(Array.isArray(list) ? list : []);
        if (res.meta) setTotalPages(Math.ceil(res.meta.total / res.meta.limit));
      } catch (err) {
        console.error("Fetch history error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [platform, page]);

  return (
    <>
      <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <CardHeader>
          <CardTitle className="capitalize">{platform} Automation History</CardTitle>
          <CardDescription>
            Log of processed posts. Click any post to view details. Use "🔬 Analyze" for AI performance feedback.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground animate-pulse">
                Loading history...
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-xl">
                No historical posts found for {platform}.
              </div>
            ) : (
              logs.map((log, i) => (
                <div
                  key={log.id || i}
                  className="p-4 rounded-xl border border-border/50 hover:border-primary/30 transition-all duration-200 group"
                >
                  {/* Top row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div
                      className="flex flex-col gap-1 max-w-[70%] cursor-pointer"
                      onClick={() => setSelectedPost(log)}
                    >
                      <span className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
                        {log.content?.substring(0, 60)}...
                      </span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {new Date(log.created_at || Date.now()).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-2 sm:mt-0">
                      {log.status === "published" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 h-8 text-xs font-semibold"
                          onClick={(e) => { e.stopPropagation(); setRemixPost(log); }}
                        >
                          <RefreshCw className="h-3.5 w-3.5 mr-1" />
                          Remix
                        </Button>
                      )}
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider border",
                        log.status === "published"
                          ? "bg-green-500/10 text-green-600 border-green-500/20"
                          : "bg-red-500/10 text-red-600 border-red-500/20"
                      )}>
                        {log.status}
                      </span>
                    </div>
                  </div>

                  {/* Post Autopsy (published posts only) */}
                  {log.status === "published" && log.id && (
                    <PostAutopsy postId={log.id} platform={platform} />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {!loading && logs.length > 0 && (
            <div className="flex items-center justify-between pt-6 mt-4 border-t border-border/50">
              <div className="text-xs text-muted-foreground font-medium">
                Page {page} of {totalPages || 1}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="h-8 w-8 p-0">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="h-8 w-8 p-0">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Post Details Modal */}
      <Dialog open={!!selectedPost} onOpenChange={(open) => !open && setSelectedPost(null)}>
        <DialogContent className="sm:max-w-[580px] bg-background max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Post Details
              {selectedPost && (
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider border",
                  selectedPost.status === "published"
                    ? "bg-green-500/10 text-green-600 border-green-500/20"
                    : "bg-red-500/10 text-red-600 border-red-500/20"
                )}>
                  {selectedPost.status}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedPost && new Date(selectedPost.created_at).toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          {selectedPost && (
            <div className="space-y-4 pt-2">
              {selectedPost.error_message && (
                <div className="bg-red-500/10 text-red-600 p-3 rounded-lg text-sm border border-red-500/20 flex gap-2 items-start">
                  <Info className="h-5 w-5 shrink-0" />
                  <p>{selectedPost.error_message}</p>
                </div>
              )}

              <div className="bg-secondary/30 rounded-xl p-4 border border-border/50">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Generated Content</h4>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                  {selectedPost.content}
                </p>
              </div>

              {selectedPost.ai_metadata?.topic && (
                <div className="bg-secondary/10 rounded-xl p-4 border border-border/30">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">AI Context</h4>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Trend Topic:</span> {selectedPost.ai_metadata.topic}
                  </p>
                </div>
              )}

              {/* Inline comments for the selected post */}
              {selectedPost.id && (
                <DraftComments postId={selectedPost.id} defaultCollapsed={false} />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Remix Modal */}
      <RemixModal
        isOpen={!!remixPost}
        onClose={() => setRemixPost(null)}
        post={remixPost}
      />
    </>
  );
}
