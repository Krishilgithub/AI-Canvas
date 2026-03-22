"use client";
import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Users,
  Activity,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetcher } from "@/lib/api-client";
import { toast } from "sonner";
import { AnalyticsView } from "@/components/dashboard/analytics-view";
import { ManualPostGenerator } from "@/components/automation/manual-post-generator";
import { Progress } from "@/components/ui/progress";

interface QuotaInfo {
  used: number;
  limit: number | null;
  remaining: number | null;
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

export default function DashboardPage() {
  const [stats, setStats] = useState<{ metrics: Record<string, string | number>; activity: ActivityItem[] } | null>(null);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [overviewRes, activityRes, quotaRes] = await Promise.all([
        fetcher("/api/v1/analytics/overview"),
        fetcher("/api/v1/analytics/activity"),
        fetcher("/api/v1/automation/quota").catch(() => null),
      ]);

      setStats({
        metrics: {
          total_reach: overviewRes.totalReach,
          engagement_rate: overviewRes.engagement + "%",
          published_this_week: overviewRes.totalPosts,
          pending_approvals: activityRes?.filter((a: ActivityItem) => a.status === "needs_approval").length ?? 0,
          failed_posts: activityRes?.filter((a: ActivityItem) => a.status === "failed").length ?? 0,
        },
        activity: activityRes || [],
      });

      if (quotaRes) setQuota(quotaRes);
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
      loadData(); // Refresh
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Retry failed";
      toast.error(message);
    } finally {
      setRetryingId(null);
    }
  };

  const handleRunScan = async () => {
    try {
      toast.info("Scanning for trends...");
      await fetcher("/api/v1/automation/scan", { method: "POST" });
      toast.success("Scan completed! Refreshing...");
      loadData();
    } catch {
      toast.error("Scan failed. Try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const m = stats?.metrics || {};
  const activity = stats?.activity || [];
  const failedPosts = activity.filter((a) => a.status === "failed");
  const quotaPercent = quota?.limit ? Math.round(((quota.used) / quota.limit) * 100) : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "needs_approval": return "bg-amber-500";
      case "published": return "bg-green-500";
      case "failed": return "bg-red-500";
      case "scheduled": return "bg-blue-500";
      default: return "bg-secondary";
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold font-heading tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here&apos;s what&apos;s happening today.</p>
        </div>
        <Button onClick={handleRunScan}>
          <Activity className="mr-2 h-4 w-4" /> Run Quick Scan
        </Button>
      </div>

      {/* Quota Warning Banner */}
      {quota && !quota.allowed && (
        <div className="mb-6 flex items-center gap-3 bg-red-500/10 border border-red-500/30 text-red-600 rounded-lg px-4 py-3">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">
            You&apos;ve used all {quota.limit} AI generations for this month on the <strong>{quota.tier}</strong> plan.
            <a href="/settings?tab=billing" className="ml-2 underline">Upgrade to Pro →</a>
          </p>
        </div>
      )}

      {/* Failed Posts Alert */}
      {failedPosts.length > 0 && (
        <div className="mb-6 flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 text-amber-600 rounded-lg px-4 py-3">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">
            {failedPosts.length} post{failedPosts.length > 1 ? "s" : ""} failed to publish. See &quot;Recent Activity&quot; below to retry.
          </p>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { title: "Total Reach", value: m.total_reach || "0", change: "All time", icon: Users, color: "text-blue-500" },
          { title: "Avg. Engagement", value: m.engagement_rate || "0%", change: "Based on posts", icon: ArrowUpRight, color: "text-green-500" },
          { title: "Pending Approval", value: String(m.pending_approvals || 0), change: "Requires attention", icon: Clock, color: "text-amber-500" },
          { title: "Published This Week", value: String(m.published_this_week || 0), change: "Target: 5", icon: CheckCircle2, color: "text-purple-500" },
        ].map((item, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{item.title}</CardTitle>
              <item.icon className={`h-4 w-4 ${item.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-heading">{item.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{item.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics & System */}
      <div className="grid lg:grid-cols-3 gap-8 mb-8">
        <div className="col-span-1 lg:col-span-2">
          <AnalyticsView />
        </div>

        {/* System Status + Quota */}
        <Card className="col-span-1 bg-secondary/10 border-dashed">
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "LinkedIn API", status: "Connected", color: "text-green-500", dot: "bg-green-500" },
              { label: "Gemini AI", status: "Operational", color: "text-green-500", dot: "bg-green-500" },
              { label: "LangSmith", status: "Tracing", color: "text-blue-500", dot: "bg-blue-500" },
            ].map((s) => (
              <div key={s.label} className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{s.label}</span>
                <span className={`flex items-center gap-2 ${s.color} font-medium`}>
                  <span className={`h-2 w-2 rounded-full ${s.dot}`} /> {s.status}
                </span>
              </div>
            ))}

            {/* Live Quota */}
            {quota && (
              <div className="pt-4 border-t border-dashed mt-4">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Zap className="h-3 w-3 text-amber-400" /> AI Generations
                  </p>
                  <Badge variant="outline" className="capitalize text-xs">{quota.tier}</Badge>
                </div>
                <Progress value={quota.limit ? quotaPercent : 0} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{quota.used} used</span>
                  <span>{quota.limit ? `${quota.limit} limit` : "Unlimited"}</span>
                </div>
                {quota.limit && quotaPercent >= 80 && (
                  <p className="text-xs text-amber-600 mt-1">
                    {quotaPercent >= 100 ? "Quota exceeded!" : "Approaching limit."}{" "}
                    <a href="/settings?tab=billing" className="underline">Upgrade</a>
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Create Manual Post */}
      <div className="mb-8">
        <ManualPostGenerator
          onPostGenerated={() => {
            toast.info("Refreshing dashboard...");
            setTimeout(() => loadData(), 1500);
          }}
        />
      </div>

      {/* Recent Activity */}
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Activity</CardTitle>
          <Button variant="ghost" size="sm" onClick={loadData}>
            <RefreshCw className="h-3 w-3 mr-1" /> Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {activity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No recent activity found.</div>
            ) : (
              activity.map((item: ActivityItem, i: number) => (
                <div key={i} className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${getStatusColor(item.status)}`} />
                    <div>
                      <p className="font-medium group-hover:text-primary transition-colors cursor-pointer line-clamp-1 max-w-[300px]">
                        {item.content}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        {new Date(item.created_at).toLocaleDateString()}
                        {item.error_message && (
                          <span className="text-red-500 text-xs" title={item.error_message}>
                            · {item.error_message.slice(0, 40)}...
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs capitalize px-2 py-1 rounded bg-secondary/50">
                      {item.status.replace(/_/g, " ")}
                    </span>
                    {item.status === "failed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 border-red-400 text-red-600 hover:bg-red-50"
                        disabled={retryingId === item.id}
                        onClick={() => handleRetry(item.id)}
                      >
                        {retryingId === item.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <><RefreshCw className="h-3 w-3 mr-1" /> Retry</>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
