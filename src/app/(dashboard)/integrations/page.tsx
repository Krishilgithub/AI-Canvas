import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Linkedin, MessageSquare, Send, Mail, Check } from "lucide-react";

export default function IntegrationsPage() {
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
                    {app.connected ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-600 border border-green-500/20">
                            <Check className="h-3 w-3" /> Connected
                        </span>
                    ) : (
                        <Button size="sm" variant="outline" className="h-8">Connect</Button>
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
