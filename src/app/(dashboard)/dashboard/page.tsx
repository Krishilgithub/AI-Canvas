"use client";
import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  CheckCircle2,
  Clock,
  Users,
  Activity,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Zap,
  FileText,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetcher } from "@/lib/api-client";
import { toast } from "sonner";
import { AnalyticsView } from "@/components/dashboard/analytics-view";
import { ManualPostGenerator } from "@/components/automation/manual-post-generator";
import { Progress } from "@/components/ui/progress";
import {
  ScanProgressStepper,
  useScanStager,
  type ScanStage,
} from "@/components/dashboard/scan-progress-stepper";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

interface QuotaInfo {
  used: number;
  limit: number | null;
  tier: string;
  allowed: boolean;
}

interface ActivityItem {
  id: string;
  content: string;
  status: string;
  created_at: string;
  error_message?: string;
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string }> = {
  needs_approval: { label: "Awaiting Approval", dot: "bg-amber-500", text: "text-amber-600" },
  published:      { label: "Published",         dot: "bg-green-500", text: "text-green-600" },
  failed:         { label: "Failed",            dot: "bg-red-500",   text: "text-red-600"   },
  scheduled:      { label: "Scheduled",         dot: "bg-blue-500",  text: "text-blue-600"  },
  in_progress:    { label: "Publishing…",       dot: "bg-violet-500",text: "text-violet-600"},
};

function getStatusConfig(status?: string | null) {
  const safeStatus = status || "unknown";
  return STATUS_CONFIG[safeStatus] || { label: safeStatus.replace(/_/g, " "), dot: "bg-secondary", text: "text-muted-foreground" };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<{ metrics: Record<string, string | number>; activity: ActivityItem[] } | null>(null);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [connections, setConnections] = useState<string[]>([]);

  const { stage, setStage } = useScanStager(scanning);

  const loadData = useCallback(async () => {
    try {
      const [overviewRes, activityRes, quotaRes, connRes] = await Promise.all([
        fetcher("/api/v1/analytics/overview"),
        fetcher("/api/v1/analytics/activity"),
        fetcher("/api/v1/automation/quota").catch(() => null),
        fetcher("/api/v1/automation/connections").catch(() => []),
      ]);

      setStats({
        metrics: {
          total_reach: overviewRes.totalReach,
          engagement_rate: overviewRes.engagement + "%",
          published_this_week: overviewRes.totalPosts,
          posting_streak: overviewRes.postingStreak || 0,
          pending_approvals: activityRes?.filter((a: ActivityItem) => a.status === "needs_approval").length ?? 0,
          failed_posts: activityRes?.filter((a: ActivityItem) => a.status === "failed").length ?? 0,
        },
        activity: activityRes || [],
      });

      if (quotaRes) setQuota(quotaRes);

      const list = Array.isArray(connRes) ? connRes : [];
      setConnections(
        list
          .filter((c: { status: string }) => c.status === "connected" || c.status === "active")
          .map((c: { platform: string }) => c.platform)
      );
    } catch (error) {
      console.error("Dashboard load error", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRetry = async (postId: string) => {
    try {
      setRetryingId(postId);
      await fetcher(`/api/v1/automation/posts/${postId}/retry`, { method: "POST" });
      toast.success("Post retried and published successfully!");
      loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Retry failed";
      toast.error(message);
    } finally {
      setRetryingId(null);
    }
  };

  const handleRunScan = async () => {
    if (scanning) return;
    setScanning(true);
    try {
      await fetcher("/api/v1/automation/scan", { method: "POST" });
      setStage("done" as ScanStage);
      toast.success("Scan completed! Trends and drafts are ready.");
      setTimeout(() => {
        setScanning(false);
        loadData();
      }, 2000);
    } catch {
      setStage("error" as ScanStage);
      toast.error("Scan failed. Please try again.");
      setTimeout(() => setScanning(false), 2000);
    }
  };

  if (loading) return <DashboardSkeleton />;

  const m = stats?.metrics || {};
  const activity = stats?.activity || [];
  const failedPosts = activity.filter((a) => a.status === "failed");
  const pendingPosts = activity.filter((a) => a.status === "needs_approval");
  const quotaPercent = quota?.limit ? Math.round((quota.used / quota.limit) * 100) : 0;
  const hasConnections = connections.length > 0;

  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-heading tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here&apos;s what&apos;s happening today.</p>
        </div>
        <Button onClick={handleRunScan} disabled={scanning} className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          {scanning ? "Scanning…" : "Run Quick Scan"}
        </Button>
      </div>

      {/* ── Gamified Onboarding Banner ── */}
      {(!hasConnections || !quota || Number(m.published_this_week) === 0) && (
        <Card className="border-indigo-500/20 bg-gradient-to-br from-blue-600 to-indigo-700 shadow-xl overflow-hidden relative">
          {/* Background pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
          <CardContent className="pt-6 relative z-10 text-white">
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white tracking-tight">Welcome to AI Canvas! Let&apos;s get you set up.</h3>
                  <Badge className="bg-white/20 text-white border-white/10 hover:bg-white/30 backdrop-blur-sm">
                    {Math.round(((!hasConnections ? 0 : 33) + (!quota ? 0 : 33) + (Number(m.published_this_week) === 0 ? 0 : 34)))}% Complete
                  </Badge>
                </div>
                <p className="text-sm text-indigo-100">
                  Complete these quick steps to fully unlock autonomous social media growth.
                </p>
              </div>
              <div className="w-full sm:w-1/3 min-w-[200px] flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-medium text-white/90">
                  <span className="flex items-center gap-1.5"><span className={cn("h-3 w-3 rounded-full flex items-center justify-center border", quota ? "bg-white border-white" : "border-white/40")}>{quota && <CheckCircle2 className="h-2 w-2 text-indigo-600" />}</span> LLM Key</span>
                  <span className="flex items-center gap-1.5"><span className={cn("h-3 w-3 rounded-full flex items-center justify-center border", hasConnections ? "bg-white border-white" : "border-white/40")}>{hasConnections && <CheckCircle2 className="h-2 w-2 text-indigo-600" />}</span> Connection</span>
                  <span className="flex items-center gap-1.5"><span className={cn("h-3 w-3 rounded-full flex items-center justify-center border", Number(m.published_this_week) > 0 ? "bg-white border-white" : "border-white/40")}>{Number(m.published_this_week) > 0 && <CheckCircle2 className="h-2 w-2 text-indigo-600" />}</span> 1st Post</span>
                </div>
                <Progress value={(!hasConnections ? 0 : 33) + (!quota ? 0 : 33) + (Number(m.published_this_week) === 0 ? 0 : 34)} className="h-2 bg-black/20 [&>div]:bg-white" />
              </div>
            </div>
            
            <div className="grid sm:grid-cols-3 gap-3 mt-5">
              <Button variant="outline" size="sm" className={cn("justify-start border-white/20 text-white hover:bg-white/10 hover:text-white bg-white/5 backdrop-blur-sm", quota && "opacity-50 pointer-events-none")} asChild>
                <a href="/settings?tab=llm">{quota ? "✓ API Key Added" : "1. Add LLM API Key"}</a>
              </Button>
              <Button variant="outline" size="sm" className={cn("justify-start border-white/20 text-white hover:bg-white/10 hover:text-white bg-white/5 backdrop-blur-sm", hasConnections && "opacity-50 pointer-events-none")} asChild>
                <a href="/integrations">{hasConnections ? "✓ Accounts Linked" : "2. Connect Social Accounts"}</a>
              </Button>
              <Button variant="outline" size="sm" className={cn("justify-start border-white/20 text-white hover:bg-white/10 hover:text-white bg-white/5 backdrop-blur-sm", Number(m.published_this_week) > 0 && "opacity-50 pointer-events-none")} onClick={handleRunScan}>
                {Number(m.published_this_week) > 0 ? "✓ Generative Engine Active" : "3. Run First AI Scan"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contextual banners */}
      {!hasConnections && (
        <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/30 text-blue-600 rounded-xl px-4 py-3">
          <Wifi className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium flex-1">
            No platforms connected — AI Canvas can&apos;t publish content until you connect an account.
          </p>
          <Button size="sm" variant="outline" className="border-blue-400 text-blue-600 hover:bg-blue-50 shrink-0" asChild>
            <a href="/integrations">Connect Now →</a>
          </Button>
        </div>
      )}

      {quota && !quota.allowed && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 text-red-600 rounded-xl px-4 py-3">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">
            You&apos;ve used all {quota.limit} AI generations for this month on the <strong>{quota.tier}</strong> plan.{" "}
            <a href="/settings?tab=billing" className="underline">Upgrade to Pro →</a>
          </p>
        </div>
      )}

      {failedPosts.length > 0 && (
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 text-amber-600 rounded-xl px-4 py-3">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">
            {failedPosts.length} post{failedPosts.length > 1 ? "s" : ""} failed to publish. See &quot;Recent Activity&quot; to retry.
          </p>
        </div>
      )}

      {/* Scan progress stepper */}
      {scanning && <ScanProgressStepper stage={stage} />}

      {/* Pending approvals quick-action */}
      {pendingPosts.length > 0 && !scanning && (
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
          <Clock className="h-5 w-5 text-amber-500 shrink-0" />
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400 flex-1">
            <strong>{pendingPosts.length} draft{pendingPosts.length > 1 ? "s" : ""}</strong> waiting for your approval.
          </p>
          <Button size="sm" variant="outline" className="border-amber-400 text-amber-600 hover:bg-amber-50 shrink-0" asChild>
            <a href="/linkedin">Review →</a>
          </Button>
        </div>
      )}

      {/* Metric cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Posting Streak", value: String(m.posting_streak || 0), sub: "Consecutive days active", icon: Activity, color: "text-rose-500", bg: "bg-rose-500/10", suffix: "🔥" },
          { title: "Total Reach", value: m.total_reach || "0", sub: "All time impressions", icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
          { title: "Pending Approval", value: String(m.pending_approvals || 0), sub: Number(m.pending_approvals) > 0 ? "Tap to review" : "All clear!", icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
          { title: "Published This Week", value: String(m.published_this_week || 0), sub: "Target: 5 per week", icon: CheckCircle2, color: "text-purple-500", bg: "bg-purple-500/10" },
        ].map((item, i) => (
          <Card key={i} className={cn("transition-all duration-200 hover:-translate-y-0.5", i === 0 && Number(m.posting_streak) > 5 ? "ring-2 ring-rose-500/50 shadow-lg shadow-rose-500/20" : "hover:shadow-md")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{item.title}</CardTitle>
              <div className={`h-8 w-8 rounded-lg ${item.bg} flex items-center justify-center`}>
                <item.icon className={`h-4 w-4 ${item.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-heading">{item.value} {item.suffix && <span className="opacity-80 ml-1">{item.suffix}</span>}</div>
              <p className={cn("text-xs mt-1", i === 0 && Number(m.posting_streak) > 0 ? "text-rose-600 font-medium" : "text-muted-foreground")}>
                {i === 0 && Number(m.posting_streak) > 0 ? `You're on fire! Keep it up.` : item.sub}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart + System Status */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="col-span-1 lg:col-span-2">
          <AnalyticsView />
        </div>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-base">System Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                label: "Platform Connections",
                status: hasConnections ? `${connections.length} connected` : "None connected",
                online: hasConnections,
              },
              {
                label: "Gemini AI",
                status: quota && quota.used > 0 ? "Operational" : "Not configured",
                online: !!(quota && quota.used > 0),
              },
              {
                label: "Auto-Scheduler",
                status: "Running",
                online: true,
              },
            ].map((s) => (
              <div key={s.label} className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{s.label}</span>
                <span className={`flex items-center gap-1.5 font-medium ${s.online ? "text-green-600" : "text-muted-foreground"}`}>
                  {s.online ? <Wifi className="h-3 w-3 text-green-500" /> : <WifiOff className="h-3 w-3 text-muted-foreground" />}
                  {s.status}
                </span>
              </div>
            ))}

            {quota && (
              <div className="pt-4 border-t border-border mt-2">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-400" />
                    AI Generations
                  </p>
                  <Badge variant="outline" className="capitalize text-xs">{quota.tier}</Badge>
                </div>
                <Progress value={quota.limit ? quotaPercent : 0} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                  <span>{quota.used} used</span>
                  <span>{quota.limit ? `${quota.limit} limit` : "Unlimited"}</span>
                </div>
                {quota.limit && quotaPercent >= 80 && (
                  <p className="text-xs text-amber-600 mt-1.5">
                    {quotaPercent >= 100 ? "Quota exceeded! " : "Approaching limit. "}
                    <a href="/settings?tab=billing" className="underline">Upgrade →</a>
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Manual Post Generator + Recent Activity Side by Side */}
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Manual Post Generator */}
        <ManualPostGenerator
          onPostGenerated={() => {
            toast.info("Refreshing dashboard…");
            setTimeout(() => loadData(), 1500);
          }}
        />

        {/* Recent Activity */}
        <Card className="flex flex-col h-[calc(100%-0px)] min-h-[400px]">
          <CardHeader className="flex flex-row items-center justify-between pb-2 shrink-0">
            <CardTitle>Recent Activity</CardTitle>
            <Button variant="ghost" size="sm" onClick={loadData} className="gap-1.5 h-8">
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            {activity.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No posts yet"
                description="Run a trend scan or manually create your first post to see activity here."
                action={{ label: "Run Trend Scan", onClick: handleRunScan }}
                secondaryAction={{ label: "Create Post Manually", href: "/linkedin" }}
                compact
              />
            ) : (
              <div className="space-y-4 pt-2">
                {activity.map((item: ActivityItem, i: number) => {
                  const sc = getStatusConfig(item.status);
                  return (
                    <div key={i} className="flex items-start justify-between group py-1">
                      <div className="flex items-start gap-3 min-w-0 flex-1 pr-4">
                        <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${sc.dot}`} />
                        <div className="min-w-0">
                          <p className="font-medium group-hover:text-primary transition-colors line-clamp-2 text-sm leading-snug">
                            {item.content}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                            {new Date(item.created_at).toLocaleDateString(undefined, {
                              month: "short", day: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                            {item.error_message && (
                              <span className="text-red-500" title={item.error_message}>
                                · {item.error_message.slice(0, 45)}…
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className={`text-[11px] capitalize px-2 py-0.5 rounded-full font-medium bg-secondary/50 ${sc.text}`}>
                          {sc.label}
                        </span>
                        {item.status === "failed" && (
                          <Button
                            variant="outline" size="sm"
                            className="text-xs h-7 border-red-300 text-red-600 hover:bg-red-50 w-full"
                            disabled={retryingId === item.id}
                            onClick={() => handleRetry(item.id)}
                          >
                            {retryingId === item.id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <><RefreshCw className="h-3 w-3 mr-1" /> Retry</>}
                          </Button>
                        )}
                        {item.status === "needs_approval" && (
                          <Button variant="outline" size="sm" className="text-xs h-7 w-full" asChild>
                            <a href="/linkedin">Review</a>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
