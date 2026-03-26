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
  Zap,
  TrendingUp,
  Clock,
  Loader2,
  Hash,
} from "lucide-react";
import { TwitterConfigurationPanel } from "@/components/twitter/twitter-configuration-panel";
import { ContentApproval } from "@/components/linkedin/content-approval";
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
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-6 py-4"><div className="h-3.5 w-48 rounded bg-secondary/60" /></td>
      <td className="px-6 py-4"><div className="h-5 w-16 rounded-full bg-secondary/60" /></td>
      <td className="px-6 py-4"><div className="h-3.5 w-24 rounded bg-secondary/60" /></td>
      <td className="px-6 py-4 text-right"><div className="h-7 w-24 rounded ml-auto bg-secondary/60" /></td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TwitterPage() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/50 pb-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-500 shrink-0">
            {/* X / Twitter bird */}
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.845L1.254 2.25H8.08l4.258 5.627 5.906-5.627zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold font-heading tracking-tight">X / Twitter</h1>
            <p className="text-muted-foreground text-sm">Tweets, threads & trend automation · 280 char limit</p>
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
          <ContentApproval platform="twitter" />
        </div>
      )}
      {activeTab === "config" && <TwitterConfigurationPanel />}
      {activeTab === "logs" && <HistoryView platform="twitter" />}
    </div>
  );
}

// ─── TrendsView ───────────────────────────────────────────────────────────────
function TrendsView() {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [category, setCategory] = useState("All");
  const [scanning, setScanning] = useState(false);
  const { stage, setStage } = useScanStager(scanning);

  const categories = ["All", "Tech", "Memes", "Crypto", "News", "AI"];

  const loadTrends = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetcher(`/trends?page=${page}&limit=10&category=${category}&platform=twitter`);
      const list = res.data || res;
      setTrends(Array.isArray(list) ? list : []);
      if (res.meta) setTotalPages(Math.ceil(res.meta.total / res.meta.limit));
    } catch {
      toast.error("Could not fetch trends");
    } finally {
      setLoading(false);
    }
  }, [page, category]);

  useEffect(() => { loadTrends(); }, [loadTrends]);

  const handleScan = async () => {
    if (scanning) return;
    setScanning(true);
    try {
      await poster("/seed", { platform: "twitter" });
      setStage("done" as ScanStage);
      toast.success("Trends scanned! Drafts ready in Review Queue.");
      setTimeout(() => { setScanning(false); loadTrends(); }, 2000);
    } catch {
      setStage("error" as ScanStage);
      toast.error("Scan failed. Try again.");
      setTimeout(() => setScanning(false), 2000);
    }
  };

  const pendingCount = 0; // placeholder — could fetch from approval API

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-sky-500/20 bg-gradient-to-br from-sky-500/5 to-transparent">
          <CardHeader className="pb-2">
            <CardDescription className="text-sky-600 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" /> Tweet Potential
            </CardDescription>
            <CardTitle className="text-2xl text-sky-600">High</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Trending hashtags match your niche today.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" /> Active Trends
            </CardDescription>
            <CardTitle className="text-2xl">{loading ? "—" : trends.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Detected in the last 24h · 280 char limit.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Drafts Pending
            </CardDescription>
            <CardTitle className="text-2xl">{pendingCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Awaiting your review in the queue.</p>
          </CardContent>
        </Card>
      </div>

      {/* Scan progress */}
      {scanning && <ScanProgressStepper stage={stage} />}

      {/* Main trends table */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Hash className="h-4 w-4 text-sky-500" />
                Real-time Trend Analysis
              </CardTitle>
              <CardDescription>Topics gaining velocity on X right now.</CardDescription>
              <div className="flex gap-2 mt-3 flex-wrap">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => { setCategory(cat); setPage(1); }}
                    className={cn(
                      "text-xs px-3 py-1 rounded-full border transition-colors",
                      category === cat
                        ? "bg-sky-500 text-white border-sky-500"
                        : "bg-background hover:bg-secondary"
                    )}
                  >
                    {cat}
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
              {scanning ? "Scanning…" : "Scan Trends"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border/50">
            <table className="w-full text-sm text-left bg-background">
              <thead className="text-muted-foreground bg-secondary/30 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-3">Topic / Hashtag</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Viral Velocity</th>
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
                        icon={Hash}
                        title="No trends detected yet"
                        description={`Click "Scan Trends" to pull the latest X / Twitter trends for your niche.`}
                        action={{ label: "Scan Trends", onClick: handleScan }}
                        compact
                      />
                    </td>
                  </tr>
                ) : (
                  trends.map((row, i) => (
                    <tr key={i} className="group hover:bg-secondary/5 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground">
                        <span className="text-sky-500 mr-1">#</span>{row.topic}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full bg-secondary text-xs font-medium border border-border">
                          {row.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={row.velocity_score > 80 ? "text-green-500 font-bold" : "text-amber-500 font-medium"}>
                            {row.velocity_score}/100
                          </span>
                          <div className="h-1.5 w-20 bg-secondary rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${row.velocity_score > 80 ? "bg-green-500" : "bg-amber-500"}`}
                              style={{ width: `${row.velocity_score}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            toast.promise(
                              poster("/create-draft", { trend_id: row.id, platform: "twitter" }),
                              {
                                loading: "Drafting tweet with AI…",
                                success: 'Draft created! Check "Review Queue".',
                                error: "Failed to create draft",
                              }
                            );
                          }}
                        >
                          <Sparkles className="mr-1.5 h-3 w-3" /> Draft Tweet
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-4">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages || 1} · {trends.length} results
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
