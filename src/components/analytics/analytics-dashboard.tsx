"use client";

import { useEffect, useState } from "react";
import { fetcher } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { ArrowUp, ArrowDown, Activity, Users, MousePointer2, Loader2, Database } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function AnalyticsDashboard() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30);
  const [platform, setPlatform] = useState("all");
  const [seeding, setSeeding] = useState(false);

  const loadData = () => {
    setLoading(true);
    fetcher(`/analytics?days=${timeRange}&platform=${platform}`)
      .then((res) => {
        setData(res.data || []);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load analytics");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [timeRange, platform]);

  const handleSeed = () => {
    setSeeding(true);
    fetcher(`/api/v1/analytics/seed`, { method: "POST" })
      .then((res) => {
        toast.success(res.message || "Data seeded successfully");
        loadData();
      })
      .catch(() => toast.error("Failed to seed data"))
      .finally(() => setSeeding(false));
  };

  // Calculate Aggregates
  const totalImpressions = data.reduce((acc, curr) => acc + curr.impressions, 0);
  const totalEngagement = data.reduce((acc, curr) => acc + curr.engagement, 0);
  const avgClickRate = data.length ? ((data.reduce((acc, curr) => acc + curr.clicks, 0) / totalImpressions) * 100).toFixed(2) : "0";

  if (loading) {
    return (
      <div className="grid gap-6 animate-pulse">
         <div className="grid gap-4 md:grid-cols-3">
            {[1,2,3].map(i => <div key={i} className="h-32 bg-secondary/20 rounded-xl" />)}
         </div>
         <div className="h-[400px] bg-secondary/20 rounded-xl" />
      </div>
    );
  }

  const handleExport = async () => {
    try {
        // Authenticated download
        const token = (await import('@/lib/supabase/client').then(m => m.createClient().auth.getSession())).data.session?.access_token;
        const isProd = process.env.NODE_ENV === "production";
        const baseUrl = isProd ? "https://ai-canvass.vercel.app/api/v1/automation" : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1/automation");
        const response = await fetch(`${baseUrl}/analytics/export`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error("Download failed");
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("Export downloaded");
    } catch (err) {
        toast.error("Failed to export data");
    }
  };

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
         <h2 className="text-xl font-semibold">Analytics Overview</h2>
         <div className="flex gap-2">
             {!loading && totalImpressions === 0 && (
                 <Button variant="outline" size="sm" onClick={handleSeed} disabled={seeding}>
                     {seeding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
                     Generate Mock Data
                 </Button>
             )}
             <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="h-9 w-[140px]">
                   <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                   <SelectItem value="all">All Platforms</SelectItem>
                   <SelectItem value="linkedin">LinkedIn</SelectItem>
                   <SelectItem value="twitter">Twitter / X</SelectItem>
                   <SelectItem value="instagram">Instagram</SelectItem>
                   <SelectItem value="reddit">Reddit</SelectItem>
                   <SelectItem value="slack">Slack</SelectItem>
                </SelectContent>
             </Select>
             <Button variant="outline" size="sm" onClick={handleExport}>
                 <ArrowUp className="h-4 w-4 mr-2 rotate-45" /> Export CSV
             </Button>
             <div className="h-6 w-px bg-border mx-2" />
             {[7, 30, 90].map(days => (
               <Button 
                 key={days} 
                 variant={timeRange === days ? "default" : "outline"} 
                 size="sm"
                 onClick={() => setTimeRange(days)}
               >
                 Last {days} Days
               </Button>
             ))}
         </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard 
           title="Total Impressions" 
           value={totalImpressions.toLocaleString()} 
           icon={<Users className="h-4 w-4 text-muted-foreground" />}
           trend="+12% from last period"
        />
        <StatsCard 
           title="Total Engagement" 
           value={totalEngagement.toLocaleString()} 
           icon={<Activity className="h-4 w-4 text-muted-foreground" />}
           trend="+5% from last period"
        />
        <StatsCard 
           title="Click Rate" 
           value={`${avgClickRate}%`} 
           icon={<MousePointer2 className="h-4 w-4 text-muted-foreground" />}
           trend="-2% from last period"
           trendNegative
        />
      </div>

      {/* Main Chart */}
      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>Performance Overview</CardTitle>
          <CardDescription>Impressions vs Engagement over time.</CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                   dataKey="date" 
                   tickFormatter={(str) => {
                      const d = new Date(str);
                      return `${d.getDate()}/${d.getMonth()+1}`;
                   }}
                   stroke="#888888"
                   fontSize={12}
                   tickLine={false}
                   axisLine={false}
                />
                <YAxis 
                   stroke="#888888"
                   fontSize={12}
                   tickLine={false}
                   axisLine={false}
                   tickFormatter={(value) => `${value}`}
                />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <Tooltip 
                   contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                   itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Area type="monotone" dataKey="impressions" stroke="#8884d8" fillOpacity={1} fill="url(#colorImpressions)" strokeWidth={2} />
                <Area type="monotone" dataKey="engagement" stroke="#82ca9d" fillOpacity={1} fill="url(#colorEngagement)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function StatsCard({ title, value, icon, trend, trendNegative }: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend: string;
  trendNegative?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1 flex items-center">
            {trendNegative ? <ArrowDown className="text-red-500 h-3 w-3 mr-1" /> : <ArrowUp className="text-green-500 h-3 w-3 mr-1" />}
            <span className={trendNegative ? "text-red-500" : "text-green-500"}>{trend}</span>
        </p>
      </CardContent>
    </Card>
  )
}
