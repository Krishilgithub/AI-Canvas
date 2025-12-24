"use client";
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowUpRight, CheckCircle2, Clock, Users, Activity, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetcher } from "@/lib/api-client";
import { toast } from "sonner";
import { AnalyticsView } from "@/components/dashboard/analytics-view";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // ... (keep useEffect) ...
  
  if (loading) {
     // ... (keep loading) ...
  }

  const m = stats?.metrics || {};
  const activity = stats?.activity || [];
  
  return (
     <div className="animate-in fade-in duration-500">
        <div className="flex items-center justify-between mb-8">
           <div>
               <h1 className="text-3xl font-bold font-heading tracking-tight">Dashboard</h1>
               <p className="text-muted-foreground">Welcome back, Krishil. Here&apos;s what&apos;s happening today.</p>
           </div>
           <Button>
              <Activity className="mr-2 h-4 w-4" /> Run Quick Scan
           </Button>
        </div>
        
        {/* Metrics Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
           {[
             { title: "Total Reach", value: m.total_reach || "0", change: "Coming soon", icon: Users, color: "text-blue-500" },
             { title: "Avg. Engagement", value: m.engagement_rate || "0%", change: "Coming soon", icon: ArrowUpRight, color: "text-green-500" },
             { title: "Pending Approval", value: m.pending_approvals?.toString() || "0", change: "Requires attention", icon: Clock, color: "text-amber-500" },
             { title: "Published This Week", value: m.published_this_week?.toString() || "0", change: "Target: 5", icon: CheckCircle2, color: "text-purple-500" },
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
           <div className="col-span-2">
              <AnalyticsView />
           </div>
           
           {/* Quick Actions / System Status */}
           <Card className="col-span-1 bg-secondary/10 border-dashed">
              {/* Keep System Status Content */}
              <CardHeader>
                 <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">LinkedIn API</span>
                    <span className="flex items-center gap-2 text-green-500 font-medium"><span className="h-2 w-2 rounded-full bg-green-500" /> Connected</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Twitter API</span>
                    <span className="flex items-center gap-2 text-green-500 font-medium"><span className="h-2 w-2 rounded-full bg-green-500" /> Connected</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">OpenAI Models</span>
                    <span className="flex items-center gap-2 text-green-500 font-medium"><span className="h-2 w-2 rounded-full bg-green-500" /> Operational</span>
                 </div>
                 
                 <div className="pt-4 border-t border-dashed mt-4">
                    <p className="text-sm font-medium mb-2">Used Credits</p>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                       <div className="h-full bg-primary w-[65%]" />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                       <span>650 / 1000</span>
                       <span>Resets in 12d</span>
                    </div>
                 </div>
              </CardContent>
           </Card>
        </div>

        {/* Recent Activity */}
        <Card className="mb-8">
           <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
           </CardHeader>
           <CardContent>
              <div className="space-y-6">
                 {activity.length === 0 ? (
                     <div className="text-center py-8 text-muted-foreground">
                         No recent activity found.
                     </div>
                 ) : activity.map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between group">
                       <div className="flex items-center gap-4">
                          <div className={`h-2 w-2 rounded-full ${item.status === 'needs_approval' ? 'bg-amber-500' : item.status === 'published' ? 'bg-green-500' : 'bg-secondary'}`} />
                          <div>
                             <p className="font-medium group-hover:text-primary transition-colors cursor-pointer line-clamp-1 max-w-[300px]">{item.content}</p>
                             <p className="text-sm text-muted-foreground flex items-center gap-2">
                                LinkedIn • {new Date(item.created_at).toLocaleDateString()}
                             </p>
                          </div>
                       </div>
                       <div className="flex items-center gap-2">
                           <span className="text-xs capitalize px-2 py-1 rounded bg-secondary/50">{item.status.replace('_', ' ')}</span>
                       </div>
                    </div>
                 ))}
              </div>
           </CardContent>
        </Card>
     </div>
  )
}
