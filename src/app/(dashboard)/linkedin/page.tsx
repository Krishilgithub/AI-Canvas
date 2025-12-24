"use client";
import { useState, useEffect } from "react";
import { fetcher, poster } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sparkles, Filter, Search, MoreHorizontal, ArrowRight, LayoutList, Sliders, History, ChevronLeft, ChevronRight } from "lucide-react";
import { ConfigurationPanel } from "@/components/linkedin/configuration-panel";
import { ContentApproval } from "@/components/linkedin/content-approval";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function LinkedInPage() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/50 pb-6">
          <div>
             <h1 className="text-3xl font-bold font-heading tracking-tight">LinkedIn Automation</h1>
             <p className="text-muted-foreground mt-1">Manage content pipeline, analyze trends, and auto-schedule posts.</p>
          </div>
          <div className="flex gap-1 bg-secondary/30 p-1 rounded-lg border border-border/50 overflow-x-auto max-w-full">
             {[
               { id: "overview", label: "Overview", icon: LayoutList },
               { id: "approval", label: "Review Queue", icon: Sparkles },
               { id: "config", label: "Configuration", icon: Sliders },
               { id: "logs", label: "History", icon: History }
             ].map(tab => (
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
       {activeTab === "approval" && <ContentApproval />}
       {activeTab === "config" && <ConfigurationPanel />}
       {activeTab === "logs" && <HistoryView />}
    </div>
  )
}

function TrendsView() {
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [category, setCategory] = useState("All");

  const categories = ["All", "Technology", "Business", "Marketing", "AI"];

  useEffect(() => {
    setLoading(true);
    fetcher(`/trends?page=${page}&limit=10&category=${category}`)
      .then(res => {
         const list = res.data || res; // Handle both paginated and non-paginated fallbacks
         setTrends(Array.isArray(list) ? list : []);
         if (res.meta) setTotalPages(Math.ceil(res.meta.total / res.meta.limit));
         setLoading(false);
      })
      .catch(err => {
         console.error("Fetch error:", err);
         toast.error("Could not connect to backend");
         setLoading(false);
      });
  }, [page, category]);


  return (
     <div className="space-y-6">
        {/* Quick Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/10">
              <CardHeader className="pb-2">
                 <CardDescription>Viral Potential</CardDescription>
                 <CardTitle className="text-2xl text-primary">High</CardTitle>
              </CardHeader>
              <CardContent>
                 <div className="text-xs text-muted-foreground">Top 3 trends align with your niche today.</div>
              </CardContent>
           </Card>
            <Card>
              <CardHeader className="pb-2">
                 <CardDescription>Active Trends</CardDescription>
                 <CardTitle className="text-2xl">{trends.length}</CardTitle>
              </CardHeader>
              <CardContent>
                 <div className="text-xs text-muted-foreground">Detected in last 24h.</div>
              </CardContent>
           </Card>
           <Card>
              <CardHeader className="pb-2">
                 <CardDescription>Next Scheduled</CardDescription>
                 <CardTitle className="text-2xl">14:00</CardTitle>
              </CardHeader>
              <CardContent>
                 <div className="text-xs text-muted-foreground">&quot;The Future of Work&quot; (Carousel)</div>
              </CardContent>
           </Card>
        </div>

        <Card className="border-border shadow-sm">
           <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <div>
                    <CardTitle className="text-lg">Real-time Trend Analysis</CardTitle>
                    <CardDescription>Topics currently gaining velocity in your niche.</CardDescription>
                    <div className="flex gap-2 mt-2">
                       {categories.map(cat => (
                          <button
                            key={cat} 
                            onClick={() => { setCategory(cat); setPage(1); }}
                            className={cn("text-xs px-2 py-1 rounded-full border transition-colors", category === cat ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-secondary")}
                          >
                             {cat}
                          </button>
                       ))}
                    </div>
                 </div>
                 <div className="flex gap-2">
                     <Button variant="outline" size="sm" onClick={() => {
                        toast.promise(
                            poster('/seed')
                                .then(() => window.location.reload()),
                            {
                                loading: 'Simulating AI agents...',
                                success: 'Trends & Drafts generated!',
                                error: 'Failed to simulate agents'
                            }
                        );
                    }}>
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
                          <tr><td colSpan={4} className="p-4 text-center">Loading trends...</td></tr>
                       ) : trends.length === 0 ? (
                          <tr><td colSpan={4} className="p-4 text-center">No trends detected. Click "Simulate AI Agent" to seed data.</td></tr>
                       ) : (
                          trends.map((row, i) => (
                             <tr key={i} className="group hover:bg-secondary/5 transition-colors">
                                <td className="px-6 py-4 font-medium text-foreground">{row.topic}</td>
                                <td className="px-6 py-4"><span className="px-2 py-1 rounded-full bg-secondary text-xs font-medium border border-border">{row.category}</span></td>
                                <td className="px-6 py-4">
                                   <div className="flex items-center gap-2">
                                      <span className={row.velocity_score > 80 ? "text-green-500 font-bold" : "text-amber-500 font-medium"}>{row.velocity_score}/100</span>
                                      <div className="h-1.5 w-16 bg-secondary rounded-full overflow-hidden">
                                         <div className={`h-full rounded-full ${row.velocity_score > 80 ? "bg-green-500" : "bg-amber-500"}`} style={{ width: `${row.velocity_score}%` }} />
                                      </div>
                                   </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                   <Button size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => {
                                      toast.promise(
                                          poster('/create-draft', { trend_id: row.id }),
                                          {
                                              loading: 'Generating draft with AI...',
                                              success: 'Draft created! Check "Review Queue".',
                                              error: 'Failed to create draft'
                                          }
                                      );
                                   }}>
                                      <Sparkles className="mr-2 h-3 w-3" /> Draft Post
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
                      <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}>
                         <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading}>
                         <ChevronRight className="h-4 w-4" />
                      </Button>
                  </div>
               </div>
           </CardContent>
        </Card>
     </div>
  )
}

function HistoryView() {
   return (
      <Card>
         <CardHeader>
            <CardTitle>Automation History</CardTitle>
            <CardDescription>Log of all actions taken by the AI agent.</CardDescription>
         </CardHeader>
         <CardContent>
            <div className="space-y-4">
               {[
                  { action: "Published 'SaaS Trends 2025'", time: "2 hours ago", status: "Success" },
                  { action: "Generated 3 drafts for topic 'AI Marketing'", time: "5 hours ago", status: "Success" },
                  { action: "Failed to connect to image generator", time: "Yesterday", status: "Error" },
                  { action: "Trend scan completed (14 new topics)", time: "Yesterday", status: "Success" },
               ].map((log, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-border/50 pb-4 last:border-0 last:pb-0">
                     <span className="font-medium text-sm">{log.action}</span>
                     <div className="flex items-center gap-4 text-xs">
                        <span className="text-muted-foreground">{log.time}</span>
                        <span className={cn("px-2 py-0.5 rounded-full font-medium border", log.status === "Success" ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-red-500/10 text-red-600 border-red-500/20")}>
                           {log.status}
                        </span>
                     </div>
                  </div>
               ))}
            </div>
         </CardContent>
      </Card>
   )
}
