"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Filter, Sparkles, Sliders, LayoutList, History } from "lucide-react";
import { ConfigurationPanel } from "@/components/linkedin/configuration-panel";
import { ContentApproval } from "@/components/linkedin/content-approval";
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
                 <CardDescription>Generations Today</CardDescription>
                 <CardTitle className="text-2xl">12</CardTitle>
              </CardHeader>
              <CardContent>
                 <div className="text-xs text-muted-foreground">4 drafts pending review.</div>
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
                 </div>
                 <div className="flex gap-2">
                    <div className="relative">
                       <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                       <Input placeholder="Search trends..." className="pl-8 w-64 bg-background" />
                    </div>
                    <Button variant="outline" size="icon"><Filter className="h-4 w-4" /></Button>
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
                          <th className="px-6 py-3">Competition</th>
                          <th className="px-6 py-3 text-right">Action</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                       {[
                         { topic: "The rise of 'Agentic' workflows in SaaS", cat: "Artificial Intelligence", velocity: 98, diff: "Medium" },
                         { topic: "Why 'Founder Mode' is controversial", cat: "Startups", velocity: 92, diff: "High" },
                         { topic: "Next.js 15 Server Actions patterns", cat: "Web Development", velocity: 74, diff: "Low" },
                         { topic: "Remote work vs. RTO mandates data", cat: "Future of Work", velocity: 65, diff: "Very High" },
                         { topic: "Micro-SaaS acquisition multiples", cat: "Business", velocity: 58, diff: "Medium" },
                       ].map((row, i) => (
                          <tr key={i} className="group hover:bg-secondary/5 transition-colors">
                             <td className="px-6 py-4 font-medium text-foreground">{row.topic}</td>
                             <td className="px-6 py-4"><span className="px-2 py-1 rounded-full bg-secondary text-xs font-medium border border-border">{row.cat}</span></td>
                             <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                   <span className={row.velocity > 80 ? "text-green-500 font-bold" : "text-amber-500 font-medium"}>{row.velocity}/100</span>
                                   <div className="h-1.5 w-16 bg-secondary rounded-full overflow-hidden">
                                      <div className={`h-full rounded-full ${row.velocity > 80 ? "bg-green-500" : "bg-amber-500"}`} style={{ width: `${row.velocity}%` }} />
                                   </div>
                                </div>
                             </td>
                             <td className="px-6 py-4 text-muted-foreground">{row.diff}</td>
                             <td className="px-6 py-4 text-right">
                                <Button size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                   <Sparkles className="mr-2 h-3 w-3" /> Draft Post
                                </Button>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
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
