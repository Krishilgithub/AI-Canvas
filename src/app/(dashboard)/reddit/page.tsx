"use client";
import { useState, useEffect, useCallback } from "react";
import { fetcher, poster } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Sparkles,
  LayoutList,
  Sliders,
  History,
  ChevronLeft,
  ChevronRight,
  ArrowBigUp,
  MessageSquare,
  Flame,
  Clock,
  Loader2,
  Users,
} from "lucide-react";
import { ConfigurationPanel } from "@/components/reddit/configuration-panel";
import { ContentApproval } from "@/components/reddit/content-approval";
import { HistoryView } from "@/components/shared/history-view";
import { ScanProgressStepper, useScanStager, type ScanStage } from "@/components/dashboard/scan-progress-stepper";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Trend {
  id: string;
  topic: string;
  category: string;
  velocity_score: number;
  comment_count?: number;
  upvotes?: number;
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-6 py-4"><div className="h-3.5 w-52 rounded bg-secondary/60" /></td>
      <td className="px-6 py-4"><div className="h-5 w-20 rounded-full bg-secondary/60" /></td>
      <td className="px-6 py-4"><div className="h-3.5 w-20 rounded bg-secondary/60" /></td>
      <td className="px-6 py-4 text-right"><div className="h-7 w-24 rounded ml-auto bg-secondary/60" /></td>
    </tr>
  );
}

// ─── Reddit alien SVG icon ───────────────────────────────────────────────────
function RedditIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="currentColor">
      <path d="M20 10c0-5.523-4.477-10-10-10S0 4.477 0 10c0 5.522 4.477 10 10 10s10-4.478 10-10zm-11.25-1.25a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0zm5 0a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0zm-2.497 4.166c-.92.921-2.586.921-3.506 0a.625.625 0 0 0-.884.884c1.364 1.363 3.91 1.363 5.274 0a.625.625 0 0 0-.884-.884zM17.5 10a1.25 1.25 0 0 0-2.09-.932C14.236 8.42 12.69 8 11 8l.75-3.5 2.452.506a1.25 1.25 0 1 0 .13-.618L11.616 3.9a.625.625 0 0 0-.741.457L10 8c-1.687 0-3.236.42-4.41 1.068A1.25 1.25 0 1 0 3.5 10a1.246 1.246 0 0 0 .54 1.026C4.012 12.8 6.805 14 10 14s5.988-1.2 5.96-2.974A1.246 1.246 0 0 0 17.5 10z" />
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function RedditPage() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/50 pb-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-[#FF4500]/10 flex items-center justify-center text-[#FF4500] shrink-0">
            <RedditIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-heading tracking-tight">Reddit</h1>
            <p className="text-muted-foreground text-sm">Subreddit monitoring, post & comment automation</p>
          </div>
        </div>

        <div className="flex gap-1 bg-secondary/30 p-1 rounded-lg border border-border/50 overflow-x-auto max-w-full">
          {[
            { id: "overview", label: "Overview", icon: LayoutList },
            { id: "approval", label: "Review Queue", icon: Sparkles },
            { id: "config", label: "Configuration", icon: Sliders },
            { id: "logs", label: "History", icon: History },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-2 whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" && <TrendsView />}
      {activeTab === "approval" && (
        <div className="h-[calc(100vh-220px)] overflow-hidden">
          <ContentApproval />
        </div>
      )}
      {activeTab === "config" && <ConfigurationPanel />}
      {activeTab === "logs" && <HistoryView platform="reddit" />}
    </div>
  );
}

// ─── TrendsView ───────────────────────────────────────────────────────────────
function TrendsView() {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [subreddit, setSubreddit] = useState("All");
  const [scanning, setScanning] = useState(false);
  const { stage, setStage } = useScanStager(scanning);

  const subreddits = ["All", "saas", "entrepreneur", "technology", "artificial", "webdev"];

  const loadTrends = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetcher(`/trends?page=${page}&limit=10&platform=reddit&subreddit=${subreddit}`);
      const list = res.data || res;
      setTrends(Array.isArray(list) ? list : []);
      if (res.meta) setTotalPages(Math.ceil(res.meta.total / res.meta.limit));
    } catch {
      // quiet fail — backend may not be seeded yet
    } finally {
      setLoading(false);
    }
  }, [page, subreddit]);

  useEffect(() => { loadTrends(); }, [loadTrends]);

  const handleScan = async () => {
    if (scanning) return;
    setScanning(true);
    try {
      await poster("/seed?platform=reddit");
      setStage("done" as ScanStage);
      toast.success("Reddit threads found! Drafts ready in Review Queue.");
      setTimeout(() => { setScanning(false); loadTrends(); }, 2000);
    } catch {
      setStage("error" as ScanStage);
      toast.error("Scan failed. Try again.");
      setTimeout(() => setScanning(false), 2000);
    }
  };

  const totalUpvotes = trends.reduce((acc, t) => acc + (t.upvotes ?? t.velocity_score * 5), 0);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-[#FF4500]/20 bg-gradient-to-br from-[#FF4500]/5 to-transparent">
          <CardHeader className="pb-2">
            <CardDescription className="text-[#FF4500] flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5" /> Karma Potential
            </CardDescription>
            <CardTitle className="text-2xl text-[#FF4500]">Very High</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">r/saas is trending with &quot;AI Agents&quot; today.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Monitored Subreddits
            </CardDescription>
            <CardTitle className="text-2xl">{subreddits.length - 1}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Scanning for new hot threads every cycle.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <ArrowBigUp className="h-3.5 w-3.5 text-[#FF4500]" /> Total Upvotes in View
            </CardDescription>
            <CardTitle className="text-2xl">{loading ? "—" : totalUpvotes.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Across all trending threads right now.</p>
          </CardContent>
        </Card>
      </div>

      {/* Scan progress */}
      {scanning && <ScanProgressStepper stage={stage} />}

      {/* Main table */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <RedditIcon className="h-4 w-4 text-[#FF4500]" />
                Subreddit Pulse
              </CardTitle>
              <CardDescription>Trending discussions in your monitored subreddits.</CardDescription>
              <div className="flex gap-2 mt-3 flex-wrap">
                {subreddits.map((sub) => (
                  <button
                    key={sub}
                    onClick={() => { setSubreddit(sub); setPage(1); }}
                    className={cn(
                      "text-xs px-3 py-1 rounded-full border transition-colors",
                      subreddit === sub
                        ? "bg-[#FF4500] text-white border-[#FF4500]"
                        : "bg-background hover:bg-secondary"
                    )}
                  >
                    {sub === "All" ? "All" : `r/${sub}`}
                  </button>
                ))}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleScan}
              disabled={scanning}
              className="shrink-0 gap-2"
            >
              {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {scanning ? "Scanning…" : "Scan Reddit"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border/50">
            <table className="w-full text-sm text-left bg-background">
              <thead className="text-muted-foreground bg-secondary/30 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-3">Topic / Thread</th>
                  <th className="px-6 py-3">Subreddit</th>
                  <th className="px-6 py-3">Engagement</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                ) : trends.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <EmptyState
                        icon={MessageSquare}
                        title="No threads detected yet"
                        description={`Click "Scan Reddit" to pull trending discussions from r/${subreddit === "All" ? "your subreddits" : subreddit}.`}
                        action={{ label: "Scan Reddit", onClick: handleScan }}
                        compact
                      />
                    </td>
                  </tr>
                ) : (
                  trends.map((row, i) => {
                    const upvotes = row.upvotes ?? row.velocity_score * 5;
                    const comments = row.comment_count ?? Math.floor(row.velocity_score * 0.8);
                    return (
                      <tr key={i} className="group hover:bg-secondary/5 transition-colors">
                        <td className="px-6 py-4 font-medium text-foreground max-w-xs">
                          <p className="truncate max-w-[280px]" title={row.topic}>{row.topic}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-full bg-[#FF4500]/10 text-[#FF4500] text-xs font-medium border border-[#FF4500]/20">
                            r/{row.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3 text-sm">
                            <span className="flex items-center gap-1 text-[#FF4500] font-bold">
                              <ArrowBigUp className="h-4 w-4" />
                              {upvotes.toLocaleString()}
                            </span>
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <MessageSquare className="h-3.5 w-3.5" />
                              {comments}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              toast.promise(
                                poster("/create-draft", { trend_id: row.id, platform: "reddit" }),
                                {
                                  loading: "Writing Reddit post with AI…",
                                  success: 'Draft ready! Check "Review Queue".',
                                  error: "Failed to create draft",
                                }
                              );
                            }}
                          >
                            <MessageSquare className="mr-1.5 h-3 w-3" /> Draft Reply
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-4">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages || 1} · {trends.length} threads
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || loading}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
