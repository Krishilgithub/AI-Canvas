"use client";
import { useState, useEffect } from "react";
// import { fetcher, poster } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Instagram,
  LayoutGrid,
  Settings,
  History,
  Sparkles,
  Music2,
  TrendingUp,
  Play,
  Hash,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Heart,
} from "lucide-react";
import { ConfigurationPanel } from "@/components/instagram/configuration-panel";
import { ContentApproval } from "@/components/instagram/content-approval";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function InstagramPage() {
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
          <h1 className="text-3xl font-bold font-heading tracking-tight flex items-center gap-2">
            <span className="bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-transparent bg-clip-text">
              Instagram Automation
            </span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Grow your visual presence with AI-curated aesthetics and trends.
          </p>
        </div>
        <div
          className="flex gap-1 bg-secondary/30 p-1 rounded-lg border border-border/50 overflow-x-auto max-w-full"
          suppressHydrationWarning
        >
          {[
            { id: "overview", label: "Trends", icon: TrendingUp },
            { id: "approval", label: "Review Queue", icon: LayoutGrid },
            { id: "config", label: "Configuration", icon: Settings },
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
      {activeTab === "logs" && <HistoryView />}
    </div>
  );
}

function TrendsView() {
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [type, setType] = useState("audio"); // audio or hashtag

  useEffect(() => {
    // Simulate fetch
    setLoading(true);
    setTimeout(() => {
      const mockAudio = [
        {
          id: 1,
          title: "Original Audio - aesthetic.vibe",
          category: "Reels",
          velocity: 95,
          usage: "1.2M",
          artist: "aesthetic.vibe",
        },
        {
          id: 2,
          title: "Golden Hour",
          category: "Music",
          velocity: 88,
          usage: "850K",
          artist: "JVKE",
        },
        {
          id: 3,
          title: "Motivation Speech",
          category: "Voiceover",
          velocity: 72,
          usage: "450K",
          artist: "Success Mindset",
        },
      ];
      const mockTags = [
        {
          id: 4,
          title: "#techlife",
          category: "Tech",
          velocity: 82,
          usage: "5.4M",
        },
        {
          id: 5,
          title: "#saasmarketing",
          category: "Business",
          velocity: 65,
          usage: "120K",
        },
        {
          id: 6,
          title: "#minimalistsetup",
          category: "Design",
          velocity: 91,
          usage: "2.1M",
        },
      ];
      setTrends(type === "audio" ? mockAudio : mockTags);
      setLoading(false);
    }, 800);
  }, [type, page]);

  return (
    <div className="space-y-6" suppressHydrationWarning>
      {/* Quick Stats Row */}
      <div
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
        suppressHydrationWarning
      >
        <Card className="bg-gradient-to-br from-pink-500/5 to-transparent border-pink-500/10">
          <CardHeader className="pb-2">
            <CardDescription>Viral Potential</CardDescription>
            <CardTitle className="text-2xl text-pink-500">High</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Reels audio &quot;Golden Hour&quot; is trending.
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Engagement Rate</CardDescription>
            <CardTitle className="text-2xl">4.8%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="text-green-500 font-medium">↑ 1.2%</span> from
              last week
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Next Scheduled</CardDescription>
            <CardTitle className="text-2xl">18:00</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Carousel post about &quot;AI Tools&quot;
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Trending Now</CardTitle>
              <CardDescription>
                High-velocity audio and hashtags for maximum reach.
              </CardDescription>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setType("audio")}
                  className={cn(
                    "text-xs px-3 py-1 rounded-full border transition-colors flex items-center gap-1",
                    type === "audio"
                      ? "bg-pink-500 text-white border-pink-500"
                      : "bg-background hover:bg-secondary",
                  )}
                >
                  <Music2 className="h-3 w-3" /> Audio
                </button>
                <button
                  onClick={() => setType("hashtag")}
                  className={cn(
                    "text-xs px-3 py-1 rounded-full border transition-colors flex items-center gap-1",
                    type === "hashtag"
                      ? "bg-blue-500 text-white border-blue-500"
                      : "bg-background hover:bg-secondary",
                  )}
                >
                  <Hash className="h-3 w-3" /> Hashtags
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  toast.promise(
                    new Promise((resolve) => setTimeout(resolve, 1500)),
                    {
                      loading: "Analyzing trends...",
                      success: "Trends updated!",
                      error: "Failed to update",
                    },
                  );
                }}
              >
                <Sparkles className="mr-2 h-4 w-4" /> Refresh Trends
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-border/50">
            <table className="w-full text-sm text-left bg-background">
              <thead className="text-muted-foreground bg-secondary/30 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-3">Asset</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Velocity (Reach)</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {loading ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-8 text-center text-muted-foreground"
                    >
                      Scanning Instagram...
                    </td>
                  </tr>
                ) : trends.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center">
                      No trends found.
                    </td>
                  </tr>
                ) : (
                  trends.map((row, i) => (
                    <tr
                      key={i}
                      className="group hover:bg-secondary/5 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {type === "audio" ? (
                            <div className="h-8 w-8 rounded bg-pink-100 dark:bg-pink-900/20 flex items-center justify-center text-pink-500">
                              <Play className="h-4 w-4 fill-current" />
                            </div>
                          ) : (
                            <div className="h-8 w-8 rounded bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                              <Hash className="h-4 w-4" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-foreground">
                              {row.title}
                            </div>
                            {row.artist && (
                              <div className="text-xs text-muted-foreground">
                                {row.artist}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded-full bg-secondary text-xs font-medium border border-border">
                          {row.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <TrendingUp
                            className={cn(
                              "h-4 w-4",
                              row.velocity > 90
                                ? "text-green-500"
                                : "text-yellow-500",
                            )}
                          />
                          <span className="font-bold">{row.velocity}</span>
                          <span className="text-xs text-muted-foreground">
                            ({row.usage})
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="hover:bg-pink-500/10 hover:text-pink-500"
                          onClick={() => {
                            toast.success(
                              `Using ${row.title} for next draft generation.`,
                            );
                          }}
                        >
                          Use Expected
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function HistoryView() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>History</CardTitle>
        <CardDescription>Recent automated actions.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[
            {
              action: "Posted Reel: \\'Office Tour\\'",
              time: "2 hours ago",
              status: "Success",
              type: "reel",
            },
            {
              action: "Auto-replied to @user123's story",
              time: "5 hours ago",
              status: "Success",
              type: "dm",
            },
            {
              action: "Liked 42 posts in #saas",
              time: "Today, 9:00 AM",
              status: "Success",
              type: "engagement",
            },
            {
              action: "Failed to fetch copyright info",
              time: "Yesterday",
              status: "Error",
              type: "system",
            },
          ].map((log, i) => (
            <div
              key={i}
              className="flex items-center justify-between border-b border-border/50 pb-4 last:border-0 last:pb-0"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center",
                    log.type === "reel"
                      ? "bg-purple-100 text-purple-600"
                      : log.type === "dm"
                        ? "bg-blue-100 text-blue-600"
                        : log.type === "engagement"
                          ? "bg-pink-100 text-pink-600"
                          : "bg-gray-100 text-gray-600",
                  )}
                >
                  {log.type === "reel" && <Play className="h-4 w-4" />}
                  {log.type === "dm" && <MessageCircle className="h-4 w-4" />}
                  {log.type === "engagement" && <Heart className="h-4 w-4" />}
                  {log.type === "system" && <Settings className="h-4 w-4" />}
                </div>
                <span className="font-medium text-sm">{log.action}</span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-muted-foreground">{log.time}</span>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full font-medium border",
                    log.status === "Success"
                      ? "bg-green-500/10 text-green-600 border-green-500/20"
                      : "bg-red-500/10 text-red-600 border-red-500/20",
                  )}
                >
                  {log.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
