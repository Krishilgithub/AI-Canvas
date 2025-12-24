"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { fetcher, poster, deleter } from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Linkedin, MessageSquare, Send, Mail, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function IntegrationsPage() {
  const [connections, setConnections] = useState<any[]>([]);
  const searchParams = useSearchParams();

  useEffect(() => {
     // Check for callback status
     if (searchParams.get('success') === 'linkedin_connected') {
         toast.success("LinkedIn connected successfully!");
     }
     if (searchParams.get('error')) {
         toast.error("Connection failed", { description: searchParams.get('error') });
     }
     
     loadConnections();
  }, [searchParams]);

  const loadConnections = () => {
      fetcher('/connections')
        .then(data => setConnections(Array.isArray(data) ? data : []))
        .catch(console.error);
  };

  const handleConnect = async (platform: string) => {
     if (platform === 'LinkedIn') {
         // Get Auth URL
         // Note: Auth routes are under /api/v1/auth, but fetcher uses /api/v1/automation
         // So we need to use a direct fetch or adjust fetcher? 
         // Let's assume we can use a relative path trick or full URL if fetcher is rigid.
         // Actually fetcher prepends BASE_URL = 'http://localhost:4000/api/v1/automation'.
         // We need 'http://localhost:4000/api/v1/auth'.
         // I'll make a direct call for now or fix fetcher later. 
         // For now, I'll hack it by going up: fetcher('../auth/linkedin/connect') -> automation/../auth -> auth.
         try {
             // Or better:
             const token = (await import("@/lib/api-client")).getAuthToken();
             const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/auth/linkedin/connect`, {
                 headers: { Authorization: `Bearer ${token}` }
             });
             const data = await res.json();
             if (data.url) window.location.href = data.url;
         } catch(e) {
             toast.error("Failed to initiate connection");
         }
     } else {
         toast.info("Integration coming soon");
     }
  };

  const handleDisconnect = async (platform: string) => {
      if (platform === 'LinkedIn') {
         try {
             const token = (await import("@/lib/api-client")).getAuthToken();
              await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/auth/linkedin`, {
                 method: 'DELETE',
                 headers: { Authorization: `Bearer ${token}` }
             });
             toast.success("Disconnected LinkedIn");
             loadConnections();
         } catch(e) {
             toast.error("Failed to disconnect");
         }
      }
  };

  const isConnected = (platform: string) => {
      return connections.some(c => c.platform === platform.toLowerCase() && c.status === 'connected') || 
             (platform === 'Email'); // Email always 'connected' for now
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
       <div>
           <h1 className="text-3xl font-bold font-heading">Integrations</h1>
           <p className="text-muted-foreground">Connect your platforms to enable publishing and notifications.</p>
       </div>
       
       <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
             { name: "LinkedIn", icon: Linkedin, connected: true, desc: "Primary publishing channel. Read/Write access required.", color: "text-[#0077b5]" },
             { name: "Slack", icon: MessageSquare, connected: false, desc: "Receive real-time notifications for pending approvals.", color: "text-[#4A154B]" },
             { name: "Telegram", icon: Send, connected: false, desc: "Get mobile alerts for high-velocity trends.", color: "text-[#0088cc]" },
             { name: "Email", icon: Mail, connected: true, desc: "Receive weekly performance summaries and critical alerts.", color: "text-orange-500" }
          ].map((app, i) => (
             <Card key={i} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row justify-between items-start space-y-0">
                    <div className="p-3 bg-secondary/30 rounded-xl">
                       <app.icon className={`h-6 w-6 ${app.color}`} />
                    </div>
                     {isConnected(app.name) ? (
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-600 border border-green-500/20">
                                <Check className="h-3 w-3" /> Connected
                            </span>
                            {app.name === 'LinkedIn' && (
                                <Button size="sm" variant="ghost" className="h-6 text-xs text-destructive hover:bg-destructive/10" onClick={() => handleDisconnect(app.name)}>
                                    Disconnect
                                </Button>
                            )}
                        </div>
                    ) : (
                        <Button size="sm" variant="outline" className="h-8" onClick={() => handleConnect(app.name)}>
                            Connect
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="pt-4">
                    <CardTitle className="mb-2 text-lg">{app.name}</CardTitle>
                    <CardDescription className="text-sm">{app.desc}</CardDescription>
                </CardContent>
             </Card>
          ))}
       </div>
    </div>
  )
}
