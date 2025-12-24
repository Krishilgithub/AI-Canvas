
import { useState, useEffect } from "react";
import { fetcher, poster } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label"; // Added Label import
import { Linkedin, CheckCircle2, RotateCcw, Save, AlertCircle, Clock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function ConfigurationPanel() {
  const [config, setConfig] = useState<any>({
     niches: ['SaaS'],
     keywords: [],
     tone_profile: { professionalism: 75, voice: 'thought_leader' },
     require_approval: true
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
     fetcher('/config')
        .then(data => {
           if (data && data.niches) setConfig(data);
           setLoading(false);
        })
        .catch(console.error);
  }, []);


  const saveConfig = async () => {
     try {
        await poster('/config', config);
        toast.success("Configuration saved successfully", { description: "Your AI agent will use these new settings." });
     } catch(e) { 
        console.error(e); 
        toast.error("Failed to save configuration");
     }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
       
       <div className="grid md:grid-cols-2 gap-8">
          {/* Account Connection */}
          <Card className="border-border shadow-sm">
             <CardHeader>
                <CardTitle>Connected Accounts</CardTitle>
                <CardDescription>Manage your social media connections and permissions.</CardDescription>
             </CardHeader>
             <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-card/50">
                    <div className="flex items-center gap-3">
                       <div className="h-10 w-10 bg-[#0077b5] rounded-lg flex items-center justify-center text-white">
                          <Linkedin className="h-6 w-6" />
                       </div>
                       <div>
                          <div className="font-medium text-sm">Krishil Agrawal</div>
                          <div className="text-xs text-green-600 flex items-center gap-1">
                             <span className="h-1.5 w-1.5 rounded-full bg-green-600 animate-pulse" />
                             Connected
                          </div>
                       </div>
                    </div>
                     <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">Disconnect</Button>
                </div>
             </CardContent>
          </Card>

          {/* Posting Preferences */}
          <Card className="border-border shadow-sm">
             <CardHeader>
                <CardTitle>Automation Rules</CardTitle>
                <CardDescription>Set boundaries for your AI agent.</CardDescription>
             </CardHeader>
             <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                   <div className="space-y-0.5">
                      <Label>Require Approval</Label>
                      <p className="text-xs text-muted-foreground">Drafts must be approved before posting.</p>
                   </div>
                   <Switch checked={config.require_approval} onCheckedChange={(c: boolean) => setConfig({...config, require_approval: c})} />
                </div>
             </CardContent>
          </Card>
       </div>

       {/* Content Strategy */}
       <Card className="border-border shadow-sm">
          <CardHeader>
             <CardTitle>Content Strategy</CardTitle>
             <CardDescription>Train the AI on what to write about.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                   <Label>Niches & Topics</Label>
                   <Input 
                      placeholder="e.g. SaaS, AI, Growth" 
                      value={config.niches.join(', ')}
                      onChange={(e) => setConfig({...config, niches: e.target.value.split(',').map((s: string) => s.trim())})}
                   />
                   <p className="text-xs text-muted-foreground">Comma-separated list of high-level topics.</p>
                </div>
                <div className="space-y-2">
                   <Label>Keywords to Include</Label>
                   <Input 
                      placeholder="e.g. #buildinginpublic" 
                      value={config.keywords?.join(', ')} 
                      onChange={(e) => setConfig({...config, keywords: e.target.value.split(',').map((s: string) => s.trim())})}
                   />
                </div>
             </div>
             <div>
                <Label className="mb-2 block">Tone of Voice</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                   {['Professional', 'Casual', 'Controversial', 'Educational'].map(tone => (
                      <div key={tone} className={`border rounded-md p-3 text-center text-sm cursor-pointer transition-colors ${config.tone_profile?.voice === tone.toLowerCase() ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-secondary/50'}`}
                           onClick={() => setConfig({...config, tone_profile: { ...config.tone_profile, voice: tone.toLowerCase() }})}>
                         {tone}
                      </div>
                   ))}
                </div>
             </div>
          </CardContent>
          <div className="p-6 border-t bg-secondary/5 flex justify-end">
             <Button onClick={saveConfig} className="bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all">
                Save Configuration
             </Button>
          </div>
       </Card>

    </div>
  )
}
