"use client";

import { useEffect, useState, useCallback } from "react";
import { fetcher } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import {
  ArrowUp, ArrowDown, Activity, Users, MousePointer2, RefreshCw,
  BarChart2, TrendingUp, AlertCircle, Info,
} from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AnalyticsRow {
  date: string;
  platform: string;
  impressions: number;
  clicks: number;
  engagement: number;
  likes: number;
  comments: number;
  shares: number;
}

interface OverviewData {
  totalPosts: number;
  scheduledPosts: number;
  needsApproval: number;
  totalReach: number;
  engagement: number;
}

// ─── Analytics Dashboard ─────────────────────────────────────────────────────
export function AnalyticsDashboard() {
  const [data, setData]           = useState<AnalyticsRow[]>([]);
  const [overview, setOverview]   = useState<OverviewData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [timeRange, setTimeRange] = useState(30);
  const [platform, setPlatform]   = useState("all");

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.allSettled([
      fetcher(`/analytics/platform-stats?days=${timeRange}&platform=${platform}`),
      fetcher(`/analytics/overview?platform=${platform}`),
    ]).then(([statsRes, overviewRes]) => {
      if (statsRes.status === "fulfilled") {
        const raw = statsRes.value;
        setData(Array.isArray(raw) ? raw : (raw?.data ?? []));
      }
      if (overviewRes.status === "fulfilled") {
        setOverview(overviewRes.value);
      }
    }).catch(() => {
      toast.error("Failed to load analytics");
    }).finally(() => setLoading(false));
  }, [timeRange, platform]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExport = async () => {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const token = (await createClient().auth.getSession()).data.session?.access_token;
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1/automation";
      const response = await fetch(`${baseUrl}/analytics/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `analytics_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Analytics exported");
    } catch {
      toast.error("Export failed");
    }
  };

  // ── Aggregates from chart data ────────────────────────────────────────────
  const totalImpressions = data.reduce((acc, r) => acc + (r.impressions || 0), 0);
  const totalEngagement  = data.reduce((acc, r) => acc + (r.engagement  || 0), 0);
  const totalClicks      = data.reduce((acc, r) => acc + (r.clicks      || 0), 0);
  const avgClickRate     = totalImpressions > 0
    ? ((totalClicks / totalImpressions) * 100).toFixed(1)
    : null;

  const hasData = data.length > 0 && totalImpressions > 0;

  // ── Skeleton ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="grid gap-6 animate-pulse">
        <div className="grid gap-4 md:grid-cols-3">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-secondary/20 rounded-xl" />)}
        </div>
        <div className="h-[400px] bg-secondary/20 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-semibold">Analytics Overview</h2>
          {!hasData && (
            <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5" />
              Showing real data — publish posts to start seeing metrics here.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="linkedin">LinkedIn</SelectItem>
              <SelectItem value="twitter">Twitter / X</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="reddit">Reddit</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={loadData} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!hasData}>
            <ArrowUp className="h-4 w-4 mr-2 rotate-45" /> Export CSV
          </Button>
          <div className="h-6 w-px bg-border" />
          {[7, 30, 90].map(days => (
            <Button
              key={days}
              variant={timeRange === days ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(days)}
            >
              {days}d
            </Button>
          ))}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Total Impressions"
          value={hasData ? totalImpressions.toLocaleString() : "0"}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          empty={!hasData}
          emptyHint="Connect a platform and publish posts to see impressions"
        />
        <StatsCard
          title="Total Engagement"
          value={hasData ? totalEngagement.toLocaleString() : "0"}
          icon={<Activity className="h-4 w-4 text-muted-foreground" />}
          empty={!hasData}
          emptyHint="Likes, comments, and shares will appear here"
        />
        <StatsCard
          title="Click-Through Rate"
          value={avgClickRate !== null ? `${avgClickRate}%` : "—"}
          icon={<MousePointer2 className="h-4 w-4 text-muted-foreground" />}
          empty={!hasData}
          emptyHint="CTR is calculated from real platform data"
        />
      </div>

      {/* Overview stats from the /overview endpoint */}
      {overview && (
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Total Posts", value: overview.totalPosts, color: "text-foreground" },
            { label: "Scheduled",  value: overview.scheduledPosts, color: "text-blue-600" },
            { label: "Needs Review", value: overview.needsApproval, color: overview.needsApproval > 0 ? "text-amber-600" : "text-foreground" },
            { label: "Total Reach", value: overview.totalReach.toLocaleString(), color: "text-foreground" },
          ].map(({ label, value, color }) => (
            <Card key={label} className="flex flex-col justify-between">
              <CardHeader className="pb-1">
                <CardDescription className="text-xs">{label}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className={cn("text-2xl font-bold", color)}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Main Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Performance Over Time
              </CardTitle>
              <CardDescription>
                {hasData
                  ? `Impressions vs. Engagement — last ${timeRange} days`
                  : "No data yet — publish your first post to see your performance chart"}
              </CardDescription>
            </div>
            {hasData && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#8884d8] inline-block" /> Impressions
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#82ca9d] inline-block" /> Engagement
                </span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!hasData ? (
            <div className="h-[300px] flex flex-col items-center justify-center gap-4 text-muted-foreground">
              <BarChart2 className="h-12 w-12 opacity-20" />
              <div className="text-center">
                <p className="font-medium text-foreground">No analytics data yet</p>
                <p className="text-sm mt-1">Your performance chart will appear here after you publish posts.</p>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2 max-w-md">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  Analytics data is populated from real platform metrics. Connect your accounts in <strong>Settings → Integrations</strong> to enable tracking.
                </span>
              </div>
            </div>
          ) : (
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#8884d8" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#82ca9d" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tickFormatter={(str) => {
                      const d = new Date(str);
                      return `${d.getDate()}/${d.getMonth() + 1}`;
                    }}
                    stroke="#888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Area type="monotone" dataKey="impressions" stroke="#8884d8" fill="url(#colorImpressions)" strokeWidth={2} />
                  <Area type="monotone" dataKey="engagement"  stroke="#82ca9d" fill="url(#colorEngagement)"  strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── StatsCard ────────────────────────────────────────────────────────────────
export function StatsCard({
  title, value, icon, trend, trendNegative, empty, emptyHint,
}: {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: string;
  trendNegative?: boolean;
  empty?: boolean;
  emptyHint?: string;
}) {
  return (
    <Card className={cn(empty && "opacity-70")}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {empty && emptyHint ? (
          <p className="text-xs text-muted-foreground mt-1">{emptyHint}</p>
        ) : trend ? (
          <p className="text-xs text-muted-foreground mt-1 flex items-center">
            {trendNegative
              ? <ArrowDown className="text-red-500   h-3 w-3 mr-1" />
              : <ArrowUp   className="text-green-500 h-3 w-3 mr-1" />}
            <span className={trendNegative ? "text-red-500" : "text-green-500"}>{trend}</span>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
