"use client";
import { useState, useEffect } from "react";
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
} from "lucide-react";
import { TwitterConfigurationPanel } from "@/components/twitter/twitter-configuration-panel";
import { ContentApproval } from "@/components/linkedin/content-approval";
import { HistoryView } from "@/components/shared/history-view";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function TwitterPage() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div
      className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
      suppressHydrationWarning
    >
      <div
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/50 pb-6"
        suppressHydrationWarning
      >
        <div>
          <h1 className="text-3xl font-bold font-heading tracking-tight">
            Twitter Automation
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage tweets, analyze trends, and auto-schedule threads.
          </p>
        </div>
        <div
          className="flex gap-1 bg-secondary/30 p-1 rounded-lg border border-border/50 overflow-x-auto max-w-full"
          suppressHydrationWarning
        >
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
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50",
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" && <TrendsView />}
      {/* Passing platform prop to filter drafts */}
      {activeTab === "approval" && <ContentApproval platform="twitter" />}
      {activeTab === "config" && <TwitterConfigurationPanel />}
      {activeTab === "logs" && <HistoryView platform="twitter" />}
    </div>
  );
}

function TrendsView() {
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [category, setCategory] = useState("All");

  const categories = ["All", "Tech", "Memes", "Crypto", "News"];

  useEffect(() => {
    setLoading(true);
    // Assuming backend supports platform filtering for trends or we use generic trends
    fetcher(
      `/trends?page=${page}&limit=10&category=${category}&platform=twitter`,
    )
      .then((res) => {
        const list = res.data || res;
        setTrends(Array.isArray(list) ? list : []);
        if (res.meta) setTotalPages(Math.ceil(res.meta.total / res.meta.limit));
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        toast.error("Could not connect to backend");
        setLoading(false);
      });
  }, [page, category]);

  return (
    <div className="space-y-6" suppressHydrationWarning>
      {/* Quick Stats Row */}
      <div
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
        suppressHydrationWarning
      >
        <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/10">
          <CardHeader className="pb-2">
            <CardDescription>Viral Potential</CardDescription>
            <CardTitle className="text-2xl text-primary">High</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Trending hashtags align with your niche.
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Trends</CardDescription>
            <CardTitle className="text-2xl">{trends.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Detected in last 24h.
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Next Thread</CardDescription>
            <CardTitle className="text-2xl">16:00</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              &quot;AI Tools needed for 2025&quot;
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">
                Real-time Trend Analysis
              </CardTitle>
              <CardDescription>
                Topics currently gaining velocity on Twitter.
              </CardDescription>
              <div className="flex gap-2 mt-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setCategory(cat);
                      setPage(1);
                    }}
                    className={cn(
                      "text-xs px-2 py-1 rounded-full border transition-colors",
                      category === cat
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-secondary",
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  toast.promise(
                    poster("/seed", { platform: "twitter" }).then(() =>
                      window.location.reload(),
                    ),
                    {
                      loading: "Simulating AI agents...",
                      success: "Trends & Drafts generated!",
                      error: "Failed to simulate agents",
                    },
                  );
                }}
              >
                <Sparkles className="mr-2 h-4 w-4" /> Simulate AI Agent
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-border/50">
            <table className="w-full text-sm text-left bg-background">
              <thead className="text-muted-foreground bg-secondary/30 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-3">Topic</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Viral Velocity</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center">
                      Loading trends...
                    </td>
                  </tr>
                ) : trends.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center">
                      No trends detected. Click &quot;Simulate AI Agent&quot; to
                      seed data.
                    </td>
                  </tr>
                ) : (
                  trends.map((row, i) => (
                    <tr
                      key={i}
                      className="group hover:bg-secondary/5 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-foreground">
                        {row.topic}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded-full bg-secondary text-xs font-medium border border-border">
                          {row.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              row.velocity_score > 80
                                ? "text-green-500 font-bold"
                                : "text-amber-500 font-medium"
                            }
                          >
                            {row.velocity_score}/100
                          </span>
                          <div className="h-1.5 w-16 bg-secondary rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${row.velocity_score > 80 ? "bg-green-500" : "bg-amber-500"}`}
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
                              poster("/create-draft", {
                                trend_id: row.id,
                                platform: "twitter",
                              }),
                              {
                                loading: "Generating draft with AI...",
                                success: 'Draft created! Check "Review Queue".',
                                error: "Failed to create draft",
                              },
                            );
                          }}
                        >
                          <Sparkles className="mr-2 h-3 w-3" /> Draft Tweet
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between pt-4">
            <div className="text-xs text-muted-foreground">
              Page {page} of {totalPages || 1}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


