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
import { TeamManagement } from "@/components/settings/team-management";

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
             <CardTitle>Team Collaboration</CardTitle>
             <CardDescription>Manage workspace members and permissions.</CardDescription>
          </CardHeader>
          <CardContent>
             <TeamManagement />
          </CardContent>
       </Card>

       <Card>
          <CardHeader>
             <CardTitle>Account Notifications</CardTitle>
             <CardDescription>Control what alerts you receive via email.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
               {Object.entries({
                   weekly_digest: "Weekly AI Performance Digest",
                   post_approval: "Ready for Approval Alerts",
                   trend_alert: "New Trend Opportunities",
                   security_alert: "Security Alerts"
               }).map(([key, label]) => (
                   <div key={key} className="flex items-center justify-between py-2 border-b last:border-0 border-border/50">
                       <Label htmlFor={key} className="flex-1 cursor-pointer">{label}</Label>
                       <Switch 
                           id={key}
                           checked={(profile.notification_preferences as any)[key]}
                           onCheckedChange={(checked) => setProfile({
                               ...profile,
                               notification_preferences: {
                                   ...profile.notification_preferences,
                                   [key]: checked
                               }
                           })}
                       />
                   </div>
               ))}
          </CardContent>
       </Card>
    </div>
  )
}
