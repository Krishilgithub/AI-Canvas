import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SettingsPage() {
  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in duration-500">
       <div>
           <h1 className="text-3xl font-bold font-heading">Settings</h1>
           <p className="text-muted-foreground">Manage your account and preferences.</p>
       </div>
       
       <Card>
          <CardHeader>
             <CardTitle>Profile Information</CardTitle>
             <CardDescription>Update your personal details used for AI context generation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="flex items-center gap-6">
                <div className="h-20 w-20 rounded-full bg-gradient-to-tr from-primary to-primary/50 flex items-center justify-center text-2xl font-bold text-primary-foreground ring-4 ring-background shadow-lg">KA</div>
                <div className="space-x-3">
                   <Button variant="outline">Change Avatar</Button>
                   <Button variant="ghost" className="text-destructive hover:bg-destructive/10">Remove</Button>
                </div>
             </div>
             
             <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-sm font-medium">Full Name</label>
                   <Input defaultValue="Krishil Agrawal" />
                </div>
                <div className="space-y-2">
                   <label className="text-sm font-medium">Email Address</label>
                   <Input defaultValue="krishil@example.com" disabled />
                </div>
             </div>
             
             <div className="space-y-2">
                <label className="text-sm font-medium">Professional Bio</label>
                <textarea 
                   className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y" 
                   defaultValue="SaaS Founder building AI automation tools. Passionate about scaling startups and engineering leadership." 
                />
                <p className="text-xs text-muted-foreground">This bio is used by the AI to align content with your personal brand.</p>
             </div>
             
             <div className="flex justify-end">
                <Button>Save Changes</Button>
             </div>
          </CardContent>
       </Card>
       
       <Card>
          <CardHeader>
             <CardTitle>Notification Preferences</CardTitle>
             <CardDescription>Control when and how you receive alerts.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="space-y-6">
                {[
                   { label: "Weekly Digest", desc: "Summary of engagement and growth stats" },
                   { label: "Post Approval Needed", desc: "When AI has generated a new draft" },
                   { label: "New Trend Detected", desc: "High velocity trend in your niche" },
                   { label: "Security Alerts", desc: "Login attempts from new devices" }
                ].map((n, i) => (
                   <div key={i} className="flex items-center justify-between pb-4 border-b last:border-0 last:pb-0">
                      <div>
                         <p className="font-medium">{n.label}</p>
                         <p className="text-sm text-muted-foreground">{n.desc}</p>
                      </div>
                      <div className="relative inline-block w-11 h-6 cursor-pointer">
                           <input type="checkbox" className="peer sr-only" defaultChecked={i !== 3} />
                           <div className="w-11 h-6 bg-secondary/50 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </div>
                   </div>
                ))}
             </div>
          </CardContent>
       </Card>
    </div>
  )
}
