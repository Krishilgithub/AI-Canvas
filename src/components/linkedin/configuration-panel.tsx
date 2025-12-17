"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Linkedin, CheckCircle2, RotateCcw, Save, AlertCircle, Clock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function ConfigurationPanel() {
  const [isConnected, setIsConnected] = useState(true);
  
  return (
    <div className="grid gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 1. Account Connection Status */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Linkedin className="h-5 w-5 text-[#0077b5]" /> 
            Account Connection
          </CardTitle>
          <CardDescription>
             Manage your connection to the LinkedIn API securely.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <div className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg border border-border/50">
              <div className="flex items-center gap-4">
                 <div className="relative">
                    <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center overflow-hidden border">
                       {isConnected ? (
                         <span className="font-bold text-foreground">KA</span>
                       ) : (
                         <Linkedin className="h-6 w-6 text-muted-foreground" />
                       )}
                    </div>
                    {isConnected && (
                       <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
                          <CheckCircle2 className="h-3 w-3 text-white" />
                       </div>
                    )}
                 </div>
                 <div>
                    <h4 className="font-semibold text-sm">{isConnected ? "Krishil Agrawal" : "Not Connected"}</h4>
                    <p className="text-xs text-muted-foreground">{isConnected ? "Enterprise Plan • Token Valid" : "Connect your profile to start"}</p>
                 </div>
              </div>
              <Button 
                variant={isConnected ? "outline" : "default"} 
                size="sm"
                onClick={() => setIsConnected(!isConnected)}
              >
                {isConnected ? "Disconnect" : "Connect Account"}
              </Button>
           </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* 2. Content Strategy */}
        <Card>
          <CardHeader>
             <CardTitle className="text-base">Content Strategy</CardTitle>
             <CardDescription>Define what the AI should talk about.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="space-y-3">
                <label className="text-sm font-medium">Core Topics (Niches)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                   {["SaaS Growth", "AI Engineering", "Leadership"].map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                         {tag} <button className="hover:text-destructive ml-1">×</button>
                      </span>
                   ))}
                   <button className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-muted-foreground border border-border hover:bg-secondary/80 transition-colors">+ Add</button>
                </div>
                <Input placeholder="Type a topic and press Enter..." className="h-9" />
             </div>

             <div className="space-y-3">
                <label className="text-sm font-medium">Target Audience Keywords</label>
                 <Input placeholder="e.g. Founders, CTOs, Investors" className="h-9" defaultValue="Founders, VCs, Product Managers" />
                 <p className="text-xs text-muted-foreground">Used to align vocabulary with your reader's expertise level.</p>
             </div>
          </CardContent>
        </Card>

        {/* 3. Tone & Identity */}
        <Card>
          <CardHeader>
             <CardTitle className="text-base">Tone & Style</CardTitle>
             <CardDescription>Control the personality of generated content.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="space-y-3">
                <div className="flex justify-between">
                   <label className="text-sm font-medium">Professionalism</label>
                   <span className="text-xs text-muted-foreground">Professional but conversational</span>
                </div>
                <input type="range" className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary" min="1" max="100" defaultValue="75" />
             </div>
             
             <div className="space-y-3">
                 <label className="text-sm font-medium">Voice Preset</label>
                 <div className="grid grid-cols-3 gap-2">
                    {["Thought Leader", "Storyteller", "Analyst"].map((mode, i) => (
                       <div key={mode} className={cn(
                          "cursor-pointer rounded-md border p-3 text-center text-xs font-medium transition-all hover:bg-secondary/50",
                          i === 0 ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20" : "border-input bg-background text-muted-foreground"
                       )}>
                          {mode}
                       </div>
                    ))}
                 </div>
             </div>

             <div className="flex items-center gap-2 mt-4 text-xs text-amber-600 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                 <AlertCircle className="h-4 w-4" />
                 <span>&quot;Avoid emojis&quot; rule is currently active.</span>
             </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Frequency & Rules */}
      <Card>
         <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Schedule & Automation Rules</CardTitle>
         </CardHeader>
         <CardContent>
            <div className="grid md:grid-cols-3 gap-8">
               <div className="space-y-4">
                  <label className="text-sm font-medium">Posting Frequency</label>
                  <div className="space-y-2">
                     {["Once daily (Mon-Fri)", "Twice daily", "Custom Schedule"].map((opt, i) => (
                        <div key={i} className="flex items-center space-x-2">
                           <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${i === 0 ? 'border-primary' : 'border-muted-foreground'}`}>
                              {i === 0 && <div className="w-2 h-2 rounded-full bg-primary" />}
                           </div>
                           <span className="text-sm">{opt}</span>
                        </div>
                     ))}
                  </div>
               </div>
               
               <div className="space-y-4">
                   <label className="text-sm font-medium">Time Optimization</label>
                   <div className="flex items-start gap-3 p-3 border rounded-md bg-secondary/10">
                      <Zap className="h-4 w-4 text-amber-500 mt-0.5" />
                      <div>
                         <p className="text-sm font-medium">Smart Scheduling</p>
                         <p className="text-xs text-muted-foreground mt-1">AI analyzes your audience activity to post at peak engagement times automatically.</p>
                      </div>
                   </div>
               </div>

               <div className="space-y-4">
                  <label className="text-sm font-medium">Workflow Gates</label>
                  <div className="space-y-3">
                     <div className="flex items-center justify-between border p-2 rounded bg-background">
                        <span className="text-sm">Require Approval</span>
                        <Switch defaultChecked />
                     </div>
                     <div className="flex items-center justify-between border p-2 rounded bg-background">
                        <span className="text-sm text-muted-foreground">Auto-Retweet</span>
                         <Switch disabled />
                     </div>
                  </div>
               </div>
            </div>
         </CardContent>
         <CardFooter className="border-t bg-secondary/10 flex justify-between items-center py-4">
             <p className="text-xs text-muted-foreground">Last configuration saved 2 days ago</p>
             <Button><Save className="mr-2 h-4 w-4" /> Save Configuration</Button>
         </CardFooter>
      </Card>
    </div>
  )
}
