"use client";

import { useEffect, useState } from "react";
import { fetcher } from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Loader2, TrendingUp } from "lucide-react";

export function AnalyticsView() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<'impressions' | 'engagement'>('impressions');

  useEffect(() => {
    fetcher('/analytics?days=30')
      .then(res => {
          setData(res.data || []);
          setLoading(false);
      })
      .catch(err => {
          console.error(err);
          setLoading(false);
      });
  }, []);

  if (loading) return <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>;

  if (data.length === 0) return (
      <Card className="h-80 flex items-center justify-center text-muted-foreground">
          No analytics data available for this period.
      </Card>
  );

  const key = metric;
  const maxVal = Math.max(...data.map(d => d[key] || 0), 10); // avoid div by zero

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="space-y-1">
            <CardTitle className="text-base font-semibold">Performance Overview</CardTitle>
            <p className="text-sm text-muted-foreground">Daily {metric} over the last 30 days</p>
        </div>
        <div className="flex bg-secondary rounded-lg p-1">
            <button 
                onClick={() => setMetric('impressions')}
                className={cn("px-3 py-1 text-xs font-medium rounded-md transition-all", metric === 'impressions' ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
                Impressions
            </button>
            <button 
                onClick={() => setMetric('engagement')}
                className={cn("px-3 py-1 text-xs font-medium rounded-md transition-all", metric === 'engagement' ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
                Engagement
            </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex items-end gap-2 pt-4">
            {data.map((item, i) => {
                const val = item[key] || 0;
                const height = (val / maxVal) * 100;
                return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap z-10">
                            {new Date(item.date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}: {val}
                        </div>
                        
                        {/* Bar */}
                        <div 
                            className={cn(
                                "w-full rounded-t-sm transition-all duration-500 ease-out hover:opacity-80",
                                metric === 'impressions' ? "bg-blue-500" : "bg-purple-500"
                            )}
                            style={{ height: `${Math.max(height, 4)}%` }}
                        />
                    </div>
                );
            })}
        </div>
        {/* X-Axis Labels (every 5th day) */}
        <div className="flex justify-between mt-2 px-1">
             {data.map((item, i) => (
                 i % 5 === 0 ? (
                     <span key={i} className="text-[10px] text-muted-foreground">
                         {new Date(item.date).toLocaleDateString(undefined, {day:'2-digit', month: '2-digit'})}
                     </span>
                 ) : null
             ))}
        </div>
      </CardContent>
    </Card>
  );
}
