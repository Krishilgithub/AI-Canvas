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
  MessageSquare,
  ArrowBigUp,
} from "lucide-react";
import { ConfigurationPanel } from "@/components/reddit/configuration-panel";
import { ContentApproval } from "@/components/reddit/content-approval";
import { HistoryView } from "@/components/shared/history-view";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function RedditPage() {
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
            Reddit Automation
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor subreddits, engage with discussions, and automate posts.
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
      {activeTab === "approval" && <ContentApproval />}
      {activeTab === "config" && <ConfigurationPanel />}
      {activeTab === "logs" && <HistoryView platform="reddit" />}
    </div>
  );
}

function TrendsView() {
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [subreddit, setSubreddit] = useState("All");

  const subreddits = [
    "All",
    "saas",
    "entrepreneur",
    "technology",
    "artificial",
  ]; // Mock list, potentially fetch from config

  useEffect(() => {
    // Avoid setting state synchronously if not needed immediately for UI, but loading state is fine
    // setLoading(true); // Moved inside the async operation or avoided if strict mode complains

    // Simulate fetch with timeout or actual fetch
    const loadTrends = async () => {
      setLoading(true);
      try {
        const res = await fetcher(
          `/trends?page=${page}&limit=10&platform=reddit&subreddit=${subreddit}`,
        );
        const list = res.data || res;
        setTrends(Array.isArray(list) ? list : []);
        if (res.meta) setTotalPages(Math.ceil(res.meta.total / res.meta.limit));
      } catch (err) {
        console.error("Fetch error:", err);
        // toast.error("Could not connect to backend"); // Quiet fail for demo
      } finally {
        setLoading(false);
      }
    };

    loadTrends();
  }, [page, subreddit]);

  return (
    <div className="space-y-6" suppressHydrationWarning>
      {/* Quick Stats Row */}
      <div
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
        suppressHydrationWarning
      >
        <Card className="bg-gradient-to-br from-[#FF4500]/5 to-transparent border-[#FF4500]/10">
          <CardHeader className="pb-2">
            <CardDescription>Karma Potential</CardDescription>
            <CardTitle className="text-2xl text-[#FF4500]">Very High</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              r/saas is trending with "AI Agents" today.
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Subreddits</CardDescription>
            <CardTitle className="text-2xl">{subreddits.length - 1}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Monitoring for new discussions.
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Next Scheduled</CardDescription>
            <CardTitle className="text-2xl">16:30</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Comment on r/webdev thread
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Subreddit Pulse</CardTitle>
              <CardDescription>
                Trending discussions in your niche.
              </CardDescription>
              <div className="flex gap-2 mt-2">
                {subreddits.map((sub) => (
                  <button
                    key={sub}
                    onClick={() => {
                      setSubreddit(sub);
                      setPage(1);
                    }}
                    className={cn(
                      "text-xs px-2 py-1 rounded-full border transition-colors",
                      subreddit === sub
                        ? "bg-[#FF4500] text-white border-[#FF4500]"
                        : "bg-background hover:bg-secondary",
                    )}
                  >
                    {sub === "All" ? "All" : `r/${sub}`}
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
                    poster("/seed?platform=reddit").then(() =>
                      window.location.reload(),
                    ),
                    {
                      loading: "Simulating Reddit Agents...",
                      success: "Discussions found & Drafts generated!",
                      error: "Failed to simulate agents",
                    },
                  );
                }}
              >
                <Sparkles className="mr-2 h-4 w-4" /> Simulate Agent
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-border/50">
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
                  <tr>
                    <td colSpan={4} className="p-4 text-center">
                      Scanning Reddit...
                    </td>
                  </tr>
                ) : trends.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center">
                      No trending threads found. Click &quot;Simulate
                      Agent&quot;.
                    </td>
                  </tr>
                ) : (
                  trends.map((row, i) => (
                    <tr
                      key={i}
                      className="group hover:bg-secondary/5 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-foreground max-w-xs truncate">
                        {row.topic}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded-full bg-secondary text-xs font-medium border border-border">
                          r/{row.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <ArrowBigUp className="h-4 w-4 text-[#FF4500]" />
                          <span className="font-bold">
                            {row.velocity_score * 5}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            (+{row.velocity_score}/hr)
                          </span>
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
                                platform: "reddit",
                              }),
                              {
                                loading: "Writing Reddit post...",
                                success: 'Draft created! Check "Review Queue".',
                                error: "Failed to create draft",
                              },
                            );
                          }}
                        >
                          <MessageSquare className="mr-2 h-3 w-3" /> Draft Reply
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

