import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, RefreshCw, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AutomationPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
       <div>
           <h1 className="text-3xl font-bold font-heading tracking-tight">Control Center</h1>
           <p className="text-muted-foreground">Monitor your active automation agents and execution logs.</p>
       </div>
       
       <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-2 border-border shadow-md">
             <CardHeader className="bg-secondary/20 border-b border-border/50">
                <CardTitle className="flex items-center gap-2 font-mono text-sm uppercase tracking-wider"><Terminal className="h-4 w-4" /> Live Execution Logs</CardTitle>
             </CardHeader>
             <CardContent className="font-mono text-xs space-y-1.5 min-h-[500px] overflow-y-auto bg-[#0c0c0c] text-green-500 p-6 rounded-b-lg">
                <div className="opacity-50 border-b border-white/10 pb-2 mb-4">Last login: {new Date().toLocaleDateString()} on ttys001</div>
                <div><span className="text-blue-400">[10:42:01]</span> INFO: Initializing Agent 'Trend-Hunter-v4'...</div>
                <div><span className="text-blue-400">[10:42:02]</span> INFO: Connected to Knowledge Graph (Latency: 45ms)</div>
                <div><span className="text-blue-400">[10:42:05]</span> SUCCESS: 14 new viral candidates identified in sector 'SaaS'.</div>
                <div><span className="text-blue-400">[10:42:12]</span> INFO: Analyzing sentiment for Topic #482...</div>
                <div className="text-amber-400"><span className="text-blue-400">[10:42:15]</span> WARN: Rate limit approaching (85%). Pausing for 2s.</div>
                <div><span className="text-blue-400">[10:42:17]</span> INFO: Resuming generation queue...</div>
                <div><span className="text-blue-400">[10:42:25]</span> INFO: Generating hooks for candidate #3...</div>
                <div className="text-red-400"><span className="text-blue-400">[10:43:01]</span> ERROR: Image generation timeout for Post ID #992. Retrying (1/3)...</div>
                <div><span className="text-blue-400">[10:43:05]</span> SUCCESS: Retry successful. Image generated.</div>
                <div><span className="text-blue-400">[10:43:08]</span> INFO: Waiting for human approval...</div>
                <div className="animate-pulse">_</div>
             </CardContent>
          </Card>
          
          <div className="space-y-6">
             <Card>
                <CardHeader><CardTitle>Health Status</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Trend Scraper</span>
                      <span className="flex items-center text-green-500 font-bold bg-green-500/10 px-2 py-0.5 rounded text-xs"><CheckCircle2 className="h-3 w-3 mr-1" /> RUNNING</span>
                   </div>
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Content Engine</span>
                      <span className="flex items-center text-green-500 font-bold bg-green-500/10 px-2 py-0.5 rounded text-xs"><CheckCircle2 className="h-3 w-3 mr-1" /> HEALTHY</span>
                   </div>
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Auto-Poster</span>
                      <span className="flex items-center text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded text-xs"><AlertCircle className="h-3 w-3 mr-1" /> DEGRADED</span>
                   </div>
                </CardContent>
             </Card>
             
             <Card>
                <CardHeader><CardTitle>Resource Usage</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">CPU</span>
                            <span>45%</span>
                        </div>
                        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-primary w-[45%]" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Memory</span>
                            <span>72%</span>
                        </div>
                        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500 w-[72%]" />
                        </div>
                    </div>
                </CardContent>
             </Card>

             <Button variant="outline" className="w-full h-12 border-destructive/50 text-destructive hover:bg-destructive/10"><RefreshCw className="mr-2 h-4 w-4" /> Restart Logic Core</Button>
          </div>
       </div>
    </div>
  )
}
