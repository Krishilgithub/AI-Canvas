"use client";
import { useState, useEffect } from 'react';
import { fetcher, poster } from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>({ 
      full_name: '', 
      email: '', 
      bio: '', 
      notification_preferences: {
          weekly_digest: true,
          post_approval: true,
          trend_alert: false,
          security_alert: true
      }
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await fetcher('/profile');
        setProfile({
            ...data,
            notification_preferences: data.notification_preferences || {
                weekly_digest: true,
                post_approval: true,
                trend_alert: false,
                security_alert: true
            }
        });
      } catch (error: any) {
        toast.error("Failed to load profile.", { description: error.message || 'Unknown error' });
      }
    };
    loadProfile();
  }, []);

  const handleSaveProfile = async () => {
    try {
      await poster('/profile', profile);
      toast.success("Profile updated successfully!");
    } catch (error: any) {
      toast.error("Failed to update profile.", { description: error.message || 'Unknown error' });
    }
  };

  /* Placeholder for future notification settings
  const handleToggleNotification = async (id: string, checked: boolean) => {
     // Implementation when backend supports notifications
  };
  */

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
                    <Label htmlFor="name">Full Name</Label>
                    <Input 
                        id="name" 
                        value={profile.full_name || ''} 
                        onChange={(e) => setProfile({...profile, full_name: e.target.value})} 
                        placeholder="Your Name" 
                    />
                 </div>
                 <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" value={profile.email || ''} disabled className="opacity-70 bg-secondary" />
                 </div>
             </div>
             
             <div className="space-y-2">
                <Label htmlFor="bio">Professional Bio</Label>
                <Textarea 
                   id="bio" 
                   value={profile.bio || ''} 
                   onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setProfile({...profile, bio: e.target.value})}
                   placeholder="SaaS Founder building AI automation tools. Passionate about scaling startups and engineering leadership." 
                   rows={4} 
                />
                <p className="text-xs text-muted-foreground">This bio is used by the AI to align content with your personal brand.</p>
             </div>
             
              <div className="flex justify-end">
                 <Button onClick={handleSaveProfile}>Save Changes</Button>
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
                    { id: "weekly_digest", label: "Weekly Digest", desc: "Summary of engagement and growth stats" },
                    { id: "post_approval", label: "Post Approval Needed", desc: "When AI has generated a new draft" },
                    { id: "trend_alert", label: "New Trend Detected", desc: "High velocity trend in your niche" },
                    { id: "security_alert", label: "Security Alerts", desc: "Login attempts from new devices" }
                 ].map((n) => (
                    <div key={n.id} className="flex items-center justify-between pb-4 border-b last:border-0 last:pb-0">
                       <div>
                          <p className="font-medium">{n.label}</p>
                          <p className="text-sm text-muted-foreground">{n.desc}</p>
                       </div>
                       <Switch 
                          checked={profile.notification_preferences?.[n.id] ?? false}
                          onCheckedChange={(checked) => setProfile({
                              ...profile,
                              notification_preferences: {
                                  ...profile.notification_preferences,
                                  [n.id]: checked
                              }
                          })}
                       />
                    </div>
                 ))}
             </div>
          </CardContent>
       </Card>
    </div>
  )
}
