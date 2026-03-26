"use client";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { fetcher, poster, deleter } from "@/lib/api-client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { TeamManagement } from "@/components/settings/team-management";

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>({
    full_name: "",
    email: "",
    bio: "",
    notification_preferences: {
      weekly_digest: true,
      post_approval: true,
      trend_alert: false,
      security_alert: true,
    },
    api_key: null,
    has_api_key: false,
    subscription: { plan: "free", status: "active", next_billing: null },
  });

  const [llmKeys, setLlmKeys] = useState<{ provider: string, key: string, isSaved: boolean }[]>([
    { provider: 'openai', key: '', isSaved: false },
    { provider: 'gemini', key: '', isSaved: false },
    { provider: 'claude', key: '', isSaved: false },
  ]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [profileData, subData, keysData] = await Promise.all([
          fetcher("/user/profile"),
          fetcher("/user/profile/subscription"),
          fetcher("/keys/status").catch(() => ({ keys: [] })) // Fetch LLM keys
        ]);

        setProfile({
          ...profileData,
          notification_preferences: profileData.notification_preferences || {
            weekly_digest: true,
            post_approval: true,
            trend_alert: false,
            security_alert: true,
          },
          subscription: subData,
        });

        // Update llm keys state
        if (keysData?.keys) {
          setLlmKeys(prev => prev.map(k => {
            const savedKey = keysData.keys.find((sk: any) => sk.provider === k.provider);
            return savedKey ? { ...k, isSaved: true, key: '••••••••••••••••' } : k;
          }));
        }
      } catch (error: any) {
        toast.error("Failed to load settings.", {
          description: error.message || "Unknown error",
        });
      }
    };
    loadData();
  }, []);

  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get("success")) {
      toast.success("Subscription updated successfully!");
      router.replace("/settings");
    }
    if (searchParams.get("canceled")) {
      toast.error("Subscription checkout canceled.");
      router.replace("/settings");
    }
  }, [searchParams, router]);

  const handleSaveProfile = async () => {
    try {
      await poster("/user/profile", {
        full_name: profile.full_name,
        bio: profile.bio,
        notification_preferences: profile.notification_preferences,
      });
      toast.success("Profile updated successfully!");
    } catch (error: any) {
      toast.error("Failed to update profile.", {
        description: error.message || "Unknown error",
      });
    }
  };

  const handleGenerateApiKey = async () => {
    try {
      if (
        profile.has_api_key &&
        !confirm("Regenerating will invalidate the old key. Continue?")
      )
        return;

      const data = await poster("/user/profile/api-key", {});
      setProfile({ ...profile, api_key: data.api_key, has_api_key: true });
      toast.success("New API Key generated!");
    } catch (error: any) {
      toast.error("Failed to generate API Key.", {
        description: error.message,
      });
    }
  };

  const handleSaveLlmKey = async (provider: string, key: string) => {
    if (!key || key === '••••••••••••••••') return;
    try {
      await poster("/keys/save", { provider, apiKey: key });
      setLlmKeys(prev => prev.map(k => k.provider === provider ? { ...k, isSaved: true, key: '••••••••••••••••' } : k));
      toast.success(`${provider} API Key saved securely!`);
    } catch (error: any) {
      toast.error(`Failed to save ${provider} key.`, { description: error.message });
    }
  };

  const handleDeleteLlmKey = async (provider: string) => {
    try {
      await deleter(`/keys/remove?provider=${provider}`);
      setLlmKeys(prev => prev.map(k => k.provider === provider ? { ...k, isSaved: false, key: '' } : k));
      toast.success(`${provider} API Key removed!`);
    } catch (error: any) {
      toast.error(`Failed to remove ${provider} key.`, { description: error.message });
    }
  };

  const handleSubscriptionAction = async () => {
    if (profile.subscription?.plan === "pro") {
      toast.info("Manage subscription via Stripe Portal (coming soon).");
      return;
    }

    try {
      toast.loading("Redirecting to checkout...");
      const data = await poster("/payment/create-checkout-session", {
        priceId:
          process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || "price_1Ql...placeholder", // Replace with real Price ID
      });
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast.error("Failed to start checkout.", {
        description: error.message,
      });
    }
  };

  /* Placeholder for future notification settings */

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold font-heading">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Update your personal details used for AI context generation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="h-20 w-20 rounded-full bg-gradient-to-tr from-primary to-primary/50 flex items-center justify-center text-2xl font-bold text-primary-foreground ring-4 ring-background shadow-lg">
              {profile.full_name
                ? profile.full_name.charAt(0).toUpperCase()
                : "U"}
            </div>
            <div className="space-x-3">
              <Button variant="outline">Change Avatar</Button>
              <Button
                variant="ghost"
                className="text-destructive hover:bg-destructive/10"
              >
                Remove
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={profile.full_name || ""}
                onChange={(e) =>
                  setProfile({ ...profile, full_name: e.target.value })
                }
                placeholder="Your Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                value={profile.email || ""}
                disabled
                className="opacity-70 bg-secondary"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Professional Bio</Label>
            <Textarea
              id="bio"
              value={profile.bio || ""}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setProfile({ ...profile, bio: e.target.value })
              }
              placeholder="SaaS Founder building AI automation tools..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              This bio is used by the AI to align content with your personal
              brand.
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveProfile}>Save Changes</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team Collaboration</CardTitle>
          <CardDescription>
            Manage workspace members and permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TeamManagement />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing & Subscription</CardTitle>
          <CardDescription>
            Manage your plan and billing details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg bg-card/50">
            <div>
              <div className="font-medium capitalize">
                Current Plan: {profile.subscription?.plan || "Free"}
              </div>
              <div className="text-sm text-muted-foreground capitalize">
                {profile.subscription?.status} •{" "}
                {profile.subscription?.next_billing
                  ? `Renews ${new Date(profile.subscription.next_billing).toLocaleDateString()}`
                  : "No upcoming billing"}
              </div>
            </div>
            <Button variant="secondary" onClick={handleSubscriptionAction}>
              {profile.subscription?.plan === "pro"
                ? "Manage Subscription"
                : "Upgrade to Pro"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
          <CardDescription>
            Manage your API keys for external integrations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Secret Key</Label>
            <div className="flex gap-2">
              <Input
                value={
                  profile.api_key ||
                  (profile.has_api_key ? "••••••••••••••••" : "")
                }
                placeholder="No API Key generated"
                readOnly
                type={
                  profile.api_key && profile.api_key.startsWith("sk_")
                    ? "text"
                    : "password"
                }
              />
              <Button variant="outline" onClick={handleGenerateApiKey}>
                {profile.has_api_key ? "Regenerate" : "Generate Key"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Keep this key secret. Do not share it in client-side code.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>LLM Provider API Keys</CardTitle>
          <CardDescription>
            Connect your own AI models (OpenAI, Gemini, Claude). Keys are securely encrypted before storage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {llmKeys.map((item) => (
            <div key={item.provider} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="capitalize font-semibold">{item.provider} API Key</Label>
                {item.isSaved ? (
                   <span className="text-xs font-semibold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">Connected</span>
                ) : (
                   <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Not Connected</span>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  type={item.isSaved ? "text" : "password"}
                  disabled={item.isSaved}
                  placeholder={`Enter your ${item.provider} API key...`}
                  value={item.key}
                  onChange={(e) => setLlmKeys(prev => prev.map(k => k.provider === item.provider ? { ...k, key: e.target.value } : k))}
                  className="bg-card"
                />
                {item.isSaved ? (
                  <Button variant="destructive" onClick={() => handleDeleteLlmKey(item.provider)}>
                    Remove
                  </Button>
                ) : (
                  <Button variant="default" onClick={() => handleSaveLlmKey(item.provider, item.key)} disabled={!item.key}>
                    Save
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Notifications</CardTitle>
          <CardDescription>
            Control what alerts you receive via email.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries({
            weekly_digest: "Weekly AI Performance Digest",
            post_approval: "Ready for Approval Alerts",
            trend_alert: "New Trend Opportunities",
            security_alert: "Security Alerts",
          }).map(([key, label]) => (
            <div
              key={key}
              className="flex items-center justify-between py-2 border-b last:border-0 border-border/50"
            >
              <Label htmlFor={key} className="flex-1 cursor-pointer">
                {label}
              </Label>
              <Switch
                id={key}
                checked={(profile.notification_preferences as any)[key]}
                onCheckedChange={(checked) =>
                  setProfile({
                    ...profile,
                    notification_preferences: {
                      ...profile.notification_preferences,
                      [key]: checked,
                    },
                  })
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
