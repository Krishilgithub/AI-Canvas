import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowUpRight, CheckCircle2, Clock, Users, Activity, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
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
             { title: "Total Reach", value: "84.2k", change: "+12% vs last week", icon: Users, color: "text-blue-500" },
             { title: "Avg. Engagement", value: "4.8%", change: "+2.1% vs last week", icon: ArrowUpRight, color: "text-green-500" },
             { title: "Pending Approval", value: "12", change: "Requires attention", icon: Clock, color: "text-amber-500" },
             { title: "Published This Week", value: "24", change: "+4 vs target", icon: CheckCircle2, color: "text-purple-500" },
           ].map((m, i) => (
             <Card key={i} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                   <CardTitle className="text-sm font-medium text-muted-foreground">{m.title}</CardTitle>
                   <m.icon className={`h-4 w-4 ${m.color}`} />
                </CardHeader>
                <CardContent>
                   <div className="text-2xl font-bold font-heading">{m.value}</div>
                   <p className="text-xs text-muted-foreground mt-1">{m.change}</p>
                </CardContent>
             </Card>
           ))}
        </div>
        
        <div className="grid lg:grid-cols-3 gap-8">
           {/* Pending Approvals */}
           <Card className="col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                 <CardTitle>Activity Feed</CardTitle>
                 <Button variant="ghost" size="sm" className="text-muted-foreground">View All</Button>
              </CardHeader>
              <CardContent>
                 <div className="space-y-6">
                    {[
                       { title: "Top 10 AI Tools for 2025", platform: "LinkedIn", status: "Ready for Review", time: "2h ago" },
                       { title: "Why remote work is failing (Controversial)", platform: "Twitter/X", status: "Generating", time: "5m ago" },
                       { title: "Case Study: Scaling to $1M ARR", platform: "LinkedIn", status: "Scheduled", time: "Yesterday" },
                    ].map((item, i) => (
                       <div key={i} className="flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                             <div className={`h-2 w-2 rounded-full ${item.status === 'Ready for Review' ? 'bg-amber-500' : item.status === 'Generating' ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`} />
                             <div>
                                <p className="font-medium group-hover:text-primary transition-colors cursor-pointer">{item.title}</p>
                                <p className="text-sm text-muted-foreground flex items-center gap-2">
                                   {item.platform} • {item.time}
                                </p>
                             </div>
                          </div>
                          <div className="flex items-center gap-2">
                              {item.status === 'Ready for Review' && <Button size="sm" variant="outline">Review</Button>}
                              {item.status === 'Scheduled' && <Button size="sm" variant="ghost" className="text-muted-foreground"><ExternalLink className="h-4 w-4" /></Button>}
                          </div>
                       </div>
                    ))}
                 </div>
              </CardContent>
           </Card>
           
           {/* Quick Actions / System Status */}
           <Card className="col-span-1 bg-secondary/10 border-dashed">
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
     </div>
  )
}
