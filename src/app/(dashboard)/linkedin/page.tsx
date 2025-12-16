"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Filter, TrendingUp, MoreHorizontal, Sparkles, Send, Trash2, RefreshCw, ChevronLeft, ChevronRight, Copy, Check } from "lucide-react";

export default function LinkedInPage() {
  const [activeTab, setActiveTab] = useState("trends");

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/50 pb-6">
          <div>
             <h1 className="text-3xl font-bold font-heading tracking-tight">LinkedIn Automation</h1>
             <p className="text-muted-foreground mt-1">Manage content pipeline, analyze trends, and auto-schedule posts.</p>
          </div>
          <div className="flex gap-1 bg-secondary/50 p-1 rounded-lg border border-border/50">
             {["trends", "patterns", "generator", "queue"].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 capitalize ${activeTab === tab ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-background/50'}`}
                >
                  {tab}
                </button>
             ))}
          </div>
       </div>

       {activeTab === "trends" && <TrendsView />}
       {activeTab === "patterns" && <PatternsView />}
       {activeTab === "generator" && <GeneratorView />}
       {activeTab === "queue" && <QueueView />}
    </div>
  )
}

function TrendsView() {
  return (
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
  )
}

function PatternsView() {
   return (
      <div className="grid md:grid-cols-3 gap-6">
         {[1,2,3].map(i => (
            <Card key={i} className="overflow-hidden">
               <div className="h-2 bg-primary w-full" />
               <CardHeader>
                  <CardTitle className="text-lg">The &quot;Contrarian Take&quot; Hook</CardTitle>
                  <CardDescription>High engagement pattern detected.</CardDescription>
               </CardHeader>
               <CardContent className="space-y-4">
                  <div className="bg-secondary/30 p-4 rounded-md text-sm italic text-muted-foreground border border-dashed border-border">
                     &quot;Most people think [Common Belief] is true. But actually, [Contrarian Truth] is what determines success...&quot;
                  </div>
                  <div className="flex justify-between text-sm">
                     <span className="text-muted-foreground">Used by Top 1% Creators</span>
                     <span className="font-bold text-green-500">+140% reach</span>
                  </div>
                  <Button variant="outline" className="w-full">Use This Template</Button>
               </CardContent>
            </Card>
         ))}
      </div>
   )
}

function GeneratorView() {
   return (
      <div className="grid lg:grid-cols-2 gap-8 h-[calc(100vh-200px)]">
         <Card className="flex flex-col h-full border-border">
            <CardHeader>
               <CardTitle>Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 flex-1 overflow-y-auto">
               <div className="space-y-2">
                  <label className="text-sm font-medium">Topic or Context</label>
                  <textarea className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="e.g. Discussing the shift from SaaS to Service-as-Software..." />
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label className="text-sm font-medium">Tone</label>
                     <select className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                        <option>Authoritative</option>
                        <option>Casual</option>
                        <option>Contrarian</option>
                     </select>
                  </div>
                  <div className="space-y-2">
                     <label className="text-sm font-medium">Format</label>
                     <select className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                        <option>Short Post</option>
                        <option>Listicle</option>
                        <option>Story</option>
                     </select>
                  </div>
               </div>
               
               <Button className="w-full h-12 text-base shadow-lg shadow-primary/20">
                  <Sparkles className="mr-2 h-4 w-4" /> Generate Drafts
               </Button>
            </CardContent>
         </Card>
         
         <Card className="flex flex-col h-full border-border bg-secondary/10">
            <CardHeader className="flex flex-row justify-between items-center bg-background border-b rounded-t-lg">
               <CardTitle>Preview</CardTitle>
               <div className="flex gap-2">
                  <Button variant="ghost" size="icon" disabled><ChevronLeft className="h-4 w-4" /></Button>
                  <span className="text-sm font-medium self-center">1 / 3</span>
                  <Button variant="ghost" size="icon" disabled><ChevronRight className="h-4 w-4" /></Button>
               </div>
            </CardHeader>
            <CardContent className="flex-1 p-6 overflow-y-auto font-sans">
               <div className="bg-background border shadow-sm rounded-xl p-6 max-w-md mx-auto">
                   <div className="flex gap-3 mb-4">
                      <div className="h-10 w-10 rounded-full bg-secondary" />
                      <div>
                         <div className="h-3 w-24 bg-secondary rounded mb-1" />
                         <div className="h-2 w-16 bg-secondary/50 rounded" />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <div className="h-4 bg-secondary/30 rounded w-full" />
                      <div className="h-4 bg-secondary/30 rounded w-full" />
                      <div className="h-4 bg-secondary/30 rounded w-5/6" />
                      <div className="h-4 bg-secondary/30 rounded w-full" />
                   </div>
                   <div className="mt-4 h-48 bg-secondary/10 rounded-lg border border-dashed flex items-center justify-center text-muted-foreground text-sm">
                      (Image Placeholder)
                   </div>
               </div>
            </CardContent>
            <div className="p-4 border-t bg-background flex justify-between gap-4 rounded-b-lg">
               <Button variant="outline" className="flex-1 border-destructive text-destructive hover:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4" /> Reject</Button>
               <Button variant="ghost" className="flex-1"><RefreshCw className="mr-2 h-4 w-4" /> Rewrite</Button>
               <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white"><Check className="mr-2 h-4 w-4" /> Approve</Button>
            </div>
         </Card>
      </div>
   )
}

function QueueView() {
   return (
      <Card>
         <CardHeader>
            <CardTitle>Scheduled Queue</CardTitle>
         </CardHeader>
         <CardContent>
             <div className="p-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                <Send className="mx-auto h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                <h3 className="text-lg font-medium mb-1">Queue is empty</h3>
                <p>Generate and approve posts to see them here.</p>
             </div>
         </CardContent>
      </Card>
   )
}
