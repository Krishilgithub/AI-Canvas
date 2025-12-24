"use client";
import { useState, useEffect } from "react";
import { fetcher } from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, Filter, Download, Clock, Activity } from "lucide-react";

interface LogEntry {
  id: string;
  action: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  created_at: string;
  metadata?: any;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
     fetcher('/logs')
       .then(data => {
          setLogs(Array.isArray(data) ? data : []);
          setLoading(false);
       })
       .catch(err => {
         console.error("Logs error:", err);
         toast.error("Failed to fetch logs");
         setLoading(false);
       });
  }, []);

  const getIcon = (level: string) => {
    switch (level) {
      case 'success': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
       <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold font-heading">Automation Logs</h1>
          <p className="text-muted-foreground">Audit trail of all AI agent activities and system events.</p>
       </div>

       <div className="grid gap-4 md:grid-cols-3">
          <Card>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Runs (24h)</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
             </CardHeader>
             <CardContent>
                <div className="text-2xl font-bold">142</div>
                <p className="text-xs text-muted-foreground">+20.1% from yesterday</p>
             </CardContent>
          </Card>
           <Card>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
             </CardHeader>
             <CardContent>
                <div className="text-2xl font-bold">98.5%</div>
                <p className="text-xs text-muted-foreground">Only 2 failures detected</p>
             </CardContent>
          </Card>
           <Card>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
                <Clock className="h-4 w-4 text-blue-500" />
             </CardHeader>
             <CardContent>
                <div className="text-2xl font-bold">1.2s</div>
                <p className="text-xs text-muted-foreground">Optimal performance</p>
             </CardContent>
          </Card>
       </div>

       <Card>
          <CardHeader>
             <CardTitle>System Activity</CardTitle>
             <CardDescription>Real-time log stream from the automation engine.</CardDescription>
          </CardHeader>
          <CardContent>
              <div className="h-[500px] w-full rounded-md border p-4 overflow-y-auto">
                <div className="space-y-4">
                   {loading && <div className="text-center py-8">Loading logs...</div>}
                   {!loading && logs.length === 0 && <div className="text-center py-8 text-muted-foreground">No logs found</div>}
                   {logs.map((log) => (
                      <div key={log.id} className="flex items-start justify-between p-4 border rounded-lg bg-card/50 hover:bg-card transition-colors">
                         <div className="flex gap-4">
                            <div className="mt-1">
                               {getIcon(log.level)}
                            </div>
                            <div>
                               <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-sm">{log.action || 'System Action'}</h4>
                                  <Badge variant="outline" className="text-[10px] uppercase">{log.level}</Badge>
                               </div>
                               <p className="text-sm text-muted-foreground">{log.message}</p>
                            </div>
                         </div>
                         <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString()}
                         </div>
                      </div>
                   ))}
                </div>
              </div>
          </CardContent>
       </Card>
    </div>
  )
}
