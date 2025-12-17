"use client";
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, AlertCircle, Clock, Activity } from "lucide-react";

interface LogEntry {
  id: string;
  action: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  created_at: string;
  metadata?: any;
}

export default function AutomationLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // In a real app, fetch from backend via Supabase client
  // const { data } = await supabase.from('automation_logs').select('*')...
  useEffect(() => {
    // Mock Data for Display
    const mockLogs: LogEntry[] = [
       { id: '1', action: 'trigger_post', level: 'success', message: 'Successfully published post to LinkedIn.', created_at: new Date().toISOString() },
       { id: '2', action: 'draft_created', level: 'info', message: 'Generated draft from trend "SaaS Pricing".', created_at: new Date(Date.now() - 3600000).toISOString() },
       { id: '3', action: 'trend_ingest', level: 'info', message: 'Ingested 5 new trends from n8n scraper.', created_at: new Date(Date.now() - 7200000).toISOString() },
       { id: '4', action: 'api_error', level: 'error', message: 'Rate limit exceeded for LinkedIn API.', created_at: new Date(Date.now() - 86400000).toISOString() },
    ];
    setLogs(mockLogs);
    setLoading(false);
  }, []);

  const getStatusIcon = (level: string) => {
    switch (level) {
      case 'success': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-amber-500" />;
      default: return <Clock className="h-4 w-4 text-blue-500" />;
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
             <ScrollArea className="h-[500px] w-full rounded-md border p-4">
                <div className="space-y-4">
                   {logs.map((log) => (
                      <div key={log.id} className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0">
                         <div className="flex items-start gap-4">
                            <div className="mt-1">{getStatusIcon(log.level)}</div>
                            <div className="space-y-1">
                               <p className="text-sm font-medium leading-none">{log.message}</p>
                               <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-[10px] uppercase">{log.action}</Badge>
                                  <span className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span>
                               </div>
                            </div>
                         </div>
                         <Badge variant={log.level === 'error' ? 'destructive' : 'secondary'} className="capitalize">
                            {log.level}
                         </Badge>
                      </div>
                   ))}
                </div>
             </ScrollArea>
          </CardContent>
       </Card>
    </div>
  )
}
