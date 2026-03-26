"use client";
import { useState, useEffect, useCallback } from "react";
import { fetcher, poster } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import {
  Sparkles, LayoutList, Sliders, History, ChevronLeft, ChevronRight,
  TrendingUp, Clock, FileText, Zap, RefreshCw, ExternalLink,
  Wifi, WifiOff, Activity, Filter, MessageSquare, Flame
} from "lucide-react";
import { ConfigurationPanel } from "@/components/reddit/configuration-panel";
import { ContentApproval } from "@/components/reddit/content-approval";
import { HistoryView } from "@/components/shared/history-view";
import { EmptyState } from "@/components/shared/empty-state";
import { ScanProgressStepper, useScanStager, type ScanStage } from "@/components/dashboard/scan-progress-stepper";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Trend {
  id: string;
  topic: string;
  category: string;
  velocity_score: number;
  created_at: string;
  metadata?: {
    insight?: string;
    suggested_angle?: string;
    confidence?: number;
    impact_score?: number;
    platforms?: string[];
  };
}

interface QuotaInfo {
  used: number;
  limit: number | null;
  tier: string;
  allowed: boolean;
}

// ─── Reddit SVG icon ──────────────────────────────────────────────────────────
function RedditIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="currentColor">
      <path d="M20 10c0-5.523-4.477-10-10-10S0 4.477 0 10c0 5.522 4.477 10 10 10s10-4.478 10-10zm-11.25-1.25a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0zm5 0a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0zm-2.497 4.166c-.92.921-2.586.921-3.506 0a.625.625 0 0 0-.884.884c1.364 1.363 3.91 1.363 5.274 0a.625.625 0 0 0-.884-.884zM17.5 10a1.25 1.25 0 0 0-2.09-.932C14.236 8.42 12.69 8 11 8l.75-3.5 2.452.506a1.25 1.25 0 1 0 .13-.618L11.616 3.9a.625.625 0 0 0-.741.457L10 8c-1.687 0-3.236.42-4.41 1.068A1.25 1.25 0 1 0 3.5 10a1.246 1.246 0 0 0 .54 1.026C4.012 12.8 6.805 14 10 14s5.988-1.2 5.96-2.974A1.246 1.246 0 0 0 17.5 10z" />
    </svg>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function TrendSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="h-12 bg-secondary/40 animate-pulse" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4 border-t border-border/40">
            <div className="h-4 flex-1 rounded bg-secondary/50 animate-pulse" />
            <div className="h-4 w-20 rounded bg-secondary/50 animate-pulse" />
            <div className="h-4 w-24 rounded bg-secondary/50 animate-pulse" />
            <div className="h-7 w-24 rounded bg-secondary/30 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Impact bar ───────────────────────────────────────────────────────────────
function ImpactBar({ score }: { score: number }) {
  const color = score > 80 ? "bg-[#FF4500]" : score > 60 ? "bg-amber-500" : "bg-muted-foreground/40";
  const textColor = score > 80 ? "text-[#FF4500]" : score > 60 ? "text-amber-500" : "text-muted-foreground";
  const label = score > 80 ? "Hot" : score > 60 ? "Rising" : "New";
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1.5 w-20 bg-secondary rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-700", color)} style={{ width: `${score}%` }} />
      </div>
      <span className={cn("text-xs font-semibold tabular-nums", textColor)}>
        {score}/100 <span className="font-normal opacity-70">({label})</span>
      </span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function RedditPage() {
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview",  label: "Overview",       icon: LayoutList },
    { id: "approval",  label: "Review Queue",   icon: Sparkles },
    { id: "config",    label: "Configuration",  icon: Sliders },
    { id: "logs",      label: "History",        icon: History },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" suppressHydrationWarning>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border/50">
        <div className="flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-[#FF4500]/10 flex items-center justify-center text-[#FF4500] shrink-0">
            <RedditIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-heading tracking-tight">Reddit Automation</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Subreddit monitoring · intelligent replies · community posts
            </p>
          </div>
        </div>

        {/* Tab strip */}
        <div className="flex gap-1 bg-secondary/30 p-1 rounded-xl border border-border/50 w-full sm:w-auto overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200",
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

      {activeTab === "overview"  && <TrendsView />}
      {activeTab === "approval"  && <div className="h-[calc(100vh-220px)] overflow-hidden"><ContentApproval /></div>}
      {activeTab === "config"    && <ConfigurationPanel />}
      {activeTab === "logs"      && <HistoryView platform="reddit" />}
    </div>
  );
}

// ─── TrendsView ───────────────────────────────────────────────────────────────
function TrendsView() {
  const [trends, setTrends]         = useState<Trend[]>([]);
  const [loading, setLoading]       = useState(true);
  const [scanning, setScanning]     = useState(false);
  const [scanStage, setScanStage]   = useState<ScanStage>("idle");
  const stager                      = useScanStager(setScanStage);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [category, setCategory]     = useState("All");
  const [quota, setQuota]           = useState<QuotaInfo | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [connection, setConnection] = useState<"connected" | "disconnected" | "checking">("checking");

  const CATEGORIES = ["All", "SaaS", "Entrepreneur", "Technology", "AI", "Startups"];

  const loadTrends = useCallback(() => {
    setLoading(true);
    fetcher(`/trends?page=${page}&limit=10&platform=reddit&subreddit=${category}`)
      .then((res) => {
        const list = res.data ?? res;
        setTrends(Array.isArray(list) ? list : []);
        if (res.meta) setTotalPages(Math.ceil(res.meta.total / res.meta.limit));
        setLoading(false);
      })
      .catch(() => {
        // Quiet fail, may not be seeded.
        setLoading(false);
      });
  }, [page, category]);

  useEffect(() => {
    loadTrends();
  }, [loadTrends]);

  // Load meta info once
  useEffect(() => {
    Promise.allSettled([
      fetcher("/automation/quota"),
      fetcher("/posts?status=needs_approval&platform=reddit&limit=1"),
      fetcher("/connections"),
    ]).then(([quotaRes, pendingRes, connRes]) => {
      if (quotaRes.status === "fulfilled") setQuota(quotaRes.value);
      if (pendingRes.status === "fulfilled") {
        const data = pendingRes.value;
        setPendingCount(data?.meta?.total ?? (Array.isArray(data) ? data.length : 0));
      }
      if (connRes.status === "fulfilled") {
        const conns: { platform: string }[] = Array.isArray(connRes.value) ? connRes.value : [];
        setConnection(conns.some((c) => c.platform === "reddit") ? "connected" : "disconnected");
      }
    });
  }, []);

  const handleScan = async () => {
    if (scanning) return;
    setScanning(true);
    try {
      stager("fetching");
      await new Promise((r) => setTimeout(r, 800));
      stager("analyzing");
      await poster("/seed?platform=reddit", {});
      stager("drafting");
      await new Promise((r) => setTimeout(r, 500));
      stager("done");
      loadTrends();
      toast.success("Subreddits scanned and draft replies queued!");
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      stager("error");
      toast.error("Scan failed", { description: msg });
    } finally {
      setTimeout(() => { setScanning(false); setScanStage("idle"); }, 2500);
    }
  };

  const handleDraft = (trend: Trend) => {
    toast.promise(
      poster("/create-draft", { trend_id: trend.id, platform: "reddit" }),
      {
        loading: "Drafting intelligent reply…",
        success: 'Reply drafted! Check "Review Queue".',
        error: "Failed to generate draft.",
      }
    );
  };

  // ── Stats ────────────────────────────────────────────────────────────────
  const topScore = trends.length ? Math.max(...trends.map((t) => t.velocity_score)) : 0;
  const highImpactCount = trends.filter((t) => t.velocity_score > 70).length;

  return (
    <div className="space-y-6" suppressHydrationWarning>

      {/* ── Stats row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Connection status */}
        <Card className={cn("border", connection === "connected" ? "border-green-500/20 bg-green-500/5" : "border-border")}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center",
                connection === "connected" ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground")}>
                {connection === "connected" ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Account</p>
                <p className={cn("text-sm font-semibold capitalize",
                  connection === "connected" ? "text-green-600" : "text-muted-foreground")}>
                  {connection === "checking" ? "Checking…" : connection}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active trends */}
        <Card>
          <CardContent className="pt-5 pb-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Flame className="h-16 w-16 text-[#FF4500]" />
            </div>
            <div className="flex items-center gap-3 relative">
              <div className="h-9 w-9 rounded-xl bg-[#FF4500]/10 text-[#FF4500] flex items-center justify-center">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Hot Threads</p>
                <p className="text-xl font-bold">{loading ? "…" : trends.length}</p>
              </div>
            </div>
            {highImpactCount > 0 && (
              <p className="text-xs text-[#FF4500] mt-2 font-medium relative">{highImpactCount} viral posts detected</p>
            )}
          </CardContent>
        </Card>

        {/* Pending approval */}
        <Card className={cn(pendingCount > 0 && "border-amber-500/30 bg-amber-500/5")}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center",
                pendingCount > 0 ? "bg-amber-500/10 text-amber-600" : "bg-secondary text-muted-foreground")}>
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Awaiting Review</p>
                <p className={cn("text-xl font-bold", pendingCount > 0 && "text-amber-600")}>{pendingCount}</p>
              </div>
            </div>
            {pendingCount > 0 && (
              <p className="text-xs text-amber-600 mt-2 font-medium">{pendingCount} draft{pendingCount > 1 ? "s" : ""} need approval</p>
            )}
          </CardContent>
        </Card>

        {/* Quota */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Monthly Interactions</p>
                <p className="text-xl font-bold">
                  {quota ? `${quota.used}${quota.limit ? `/${quota.limit}` : ""}` : "…"}
                </p>
              </div>
            </div>
            {quota && quota.limit && (
              <div className="mt-2">
                <div className="h-1 w-full rounded-full bg-secondary overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", quota.used / quota.limit > 0.8 ? "bg-red-500" : "bg-primary")}
                    style={{ width: `${Math.min(100, (quota.used / quota.limit) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{quota.tier} tier</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Scan Progress ─────────────────────────────────────────────── */}
      {scanStage !== "idle" && (
        <ScanProgressStepper
          stage={scanStage}
          platform="Reddit"
          accentColor="#FF4500"
        />
      )}

      {/* ── Trend Table ───────────────────────────────────────────────── */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="h-4 w-4 text-[#FF4500]" />
                Community Pulse
              </CardTitle>
              <CardDescription className="mt-1">
                Trending discussions across your tracked subreddits.
              </CardDescription>

              {/* Category filters */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                <Filter className="h-3.5 w-3.5 text-muted-foreground mt-1 shrink-0" />
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => { setCategory(cat); setPage(1); }}
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-full border transition-all duration-150 font-medium",
                      category === cat
                        ? "bg-[#FF4500] text-white border-[#FF4500] shadow-md shadow-[#FF4500]/20"
                        : "bg-background hover:bg-secondary border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {cat === "All" ? "All" : `r/${cat}`}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
              <Button variant="ghost" size="sm" onClick={loadTrends} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
              <Button
                size="sm"
                onClick={handleScan}
                disabled={scanning}
                className="gap-2 bg-[#FF4500] hover:bg-[#e03d00] text-white"
              >
                <Sparkles className="h-4 w-4" />
                {scanning ? "Scanning…" : "Scan Reddit"}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {loading ? (
            <TrendSkeleton />
          ) : trends.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No threads detected yet"
              description="Click 'Scan Reddit' to analyze Hot & Rising posts from your monitored subreddits."
              action={
                <Button onClick={handleScan} className="gap-2 bg-[#FF4500] hover:bg-[#e03d00] text-white">
                  <Sparkles className="h-4 w-4" /> Run First Scan
                </Button>
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-border/50">
                <table className="w-full text-sm text-left">
                  <thead className="text-muted-foreground bg-secondary/30 text-xs font-semibold uppercase tracking-wide">
                    <tr>
                      <th className="px-5 py-3">Topic / Thread</th>
                      <th className="px-5 py-3 hidden sm:table-cell">Subreddit</th>
                      <th className="px-5 py-3 hidden md:table-cell">Detected</th>
                      <th className="px-5 py-3">Karma Momentum</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 bg-card">
                    {trends.map((row) => (
                      <tr
                        key={row.id}
                        className="group hover:bg-[#FF4500]/5 transition-colors"
                      >
                        <td className="px-5 py-4 max-w-xs">
                          <div className="font-medium text-foreground leading-snug line-clamp-2" title={row.topic}>{row.topic}</div>
                          {row.metadata?.suggested_angle && (
                            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1 italic">
                              ↳ {row.metadata.suggested_angle}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 hidden sm:table-cell">
                          <Badge variant="outline" className="text-xs font-medium bg-[#FF4500]/10 text-[#FF4500] border-[#FF4500]/20">
                            r/{row.category}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-muted-foreground text-xs hidden md:table-cell">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            {new Date(row.created_at).toLocaleDateString("en-US", {
                              month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                            })}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {row.velocity_score > 0 ? (
                            <ImpactBar score={row.velocity_score} />
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Unscored</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                            {row.metadata?.insight && (
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" title={row.metadata.insight} onClick={() => toast.info(row.metadata!.insight!, { description: row.topic })}>
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              className="h-7 px-3 text-xs gap-1.5 bg-[#FF4500] hover:bg-[#e03d00] text-white border-0"
                              onClick={() => handleDraft(row)}
                            >
                              <Zap className="h-3 w-3" /> Draft Reply
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between pt-4">
                <p className="text-xs text-muted-foreground">
                  Page {page} of {totalPages || 1} · {trends.length} threads
                  {topScore > 0 && <> · Max impact: <span className="font-semibold text-foreground">{topScore}/100</span></>}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline" size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || loading}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
