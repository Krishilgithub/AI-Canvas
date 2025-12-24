import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6 p-6 md:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div>
          <h1 className="text-3xl font-bold font-heading tracking-tight">Analytics & Insights</h1>
          <p className="text-muted-foreground mt-2">Track your content performance across all platforms.</p>
       </div>

       <AnalyticsDashboard />
    </div>
  )
}
