"use client";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { fetcher, poster, deleter } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { TeamManagement } from "@/components/settings/team-management";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import {
  User, CreditCard, Key, Bell, Users, CheckCircle2, Crown,
  RefreshCw, Trash2, Copy, Eye, EyeOff, Loader2, Zap, Shield,
  ChevronRight, Sparkles, ExternalLink, Lock, AlertTriangle,
  Brain,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface NotificationPrefs {
  weekly_digest: boolean;
  post_approval: boolean;
  trend_alert: boolean;
  security_alert: boolean;
}
interface Subscription { plan: string; status: string; next_billing: string | null; }
interface Profile {
  full_name: string; email: string; bio: string;
  notification_preferences: NotificationPrefs;
  api_key: string | null; has_api_key: boolean;
  subscription: Subscription;
}
interface LlmKey { provider: string; key: string; isSaved: boolean; }

// ─── Nav sections ─────────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  { id: "profile",       label: "Profile",          icon: User,      desc: "Name, bio & avatar" },
  { id: "billing",       label: "Billing",          icon: CreditCard, desc: "Plan & payments" },
  { id: "api-keys",      label: "API Keys",         icon: Key,       desc: "Access credentials" },
  { id: "llm",           label: "AI Models",        icon: Brain,     desc: "LLM provider keys" },
  { id: "team",          label: "Team",             icon: Users,     desc: "Members & roles" },
  { id: "notifications", label: "Notifications",    icon: Bell,      desc: "Email preferences" },
];

const LLM_META: Record<string, { label: string; color: string; hint: string }> = {
  openai: { label: "OpenAI", color: "text-emerald-500", hint: "Starts with sk-..." },
  gemini: { label: "Google Gemini", color: "text-blue-500", hint: "Found in Google AI Studio" },
  claude:  { label: "Anthropic Claude", color: "text-violet-500", hint: "Starts with sk-ant-..." },
};

// ─── Shared sub-section header ────────────────────────────────────────────────
function SectionHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground mt-0.5">{desc}</p>
    </div>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function Divider() {
  return <div className="border-t border-border/50 my-6" />;
}

// ─── Field row ────────────────────────────────────────────────────────────────
function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid md:grid-cols-[200px_1fr] gap-4 items-start py-5 border-b border-border/40 last:border-0">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("profile");
  const [profile, setProfile] = useState<Profile>({
    full_name: "", email: "", bio: "",
    notification_preferences: { weekly_digest: true, post_approval: true, trend_alert: false, security_alert: true },
    api_key: null, has_api_key: false,
    subscription: { plan: "free", status: "active", next_billing: null },
  });
  const [llmKeys, setLlmKeys] = useState<LlmKey[]>([
    { provider: "openai", key: "", isSaved: false },
    { provider: "gemini", key: "", isSaved: false },
    { provider: "claude",  key: "", isSaved: false },
  ]);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const [profileData, subData, keysData] = await Promise.all([
          fetcher("/user/profile"),
          fetcher("/user/profile/subscription"),
          fetcher("/keys/status").catch(() => ({ keys: [] })),
        ]);
        setProfile({
          ...profileData,
          notification_preferences: profileData.notification_preferences || {
            weekly_digest: true, post_approval: true, trend_alert: false, security_alert: true,
          },
          subscription: subData,
        });
        if (keysData?.keys) {
          setLlmKeys((p) => p.map((k) => {
            const s = keysData.keys.find((sk: { provider: string }) => sk.provider === k.provider);
            return s ? { ...k, isSaved: true, key: "••••••••••••••••" } : k;
          }));
        }
      } catch { toast.error("Failed to load settings."); }
    })();
  }, []);

  useEffect(() => {
    if (searchParams.get("success")) { toast.success("Subscription updated!"); router.replace("/settings"); }
    if (searchParams.get("canceled")) { toast.error("Checkout canceled."); router.replace("/settings"); }
  }, [searchParams, router]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await poster("/user/profile", {
        full_name: profile.full_name, bio: profile.bio,
        notification_preferences: profile.notification_preferences,
      });
      toast.success("Profile saved.");
    } catch { toast.error("Failed to save."); }
    finally { setSaving(false); }
  };

  const deleteAccount = async () => {
    try {
      setSaving(true);
      await deleter("/user/profile");
      // Import isn't loaded locally so we simulate sign out by clearing storage
      localStorage.clear();
      toast.success("Account permanently deleted.");
      setTimeout(() => { window.location.href = "/login"; }, 1000);
    } catch {
      toast.error("Failed to delete account. Please try again.");
    } finally {
      setSaving(false);
      setDeleteModalOpen(false);
    }
  };

  const generateApiKey = async () => {
    try {
      const data = await poster("/user/profile/api-key", {});
      setProfile({ ...profile, api_key: data.api_key, has_api_key: true });
      setShowApiKey(true);
      toast.success("New API Key generated!");
    } catch { toast.error("Failed to generate key."); }
  };

  const saveLlmKey = async (provider: string, key: string) => {
    if (!key || key === "••••••••••••••••") return;
    try {
      await poster("/keys/save", { provider, apiKey: key });
      setLlmKeys((p) => p.map((k) => k.provider === provider ? { ...k, isSaved: true, key: "••••••••••••••••" } : k));
      toast.success(`${provider} key saved.`);
    } catch { toast.error(`Failed to save ${provider} key.`); }
  };

  const deleteLlmKey = async (provider: string) => {
    try {
      await deleter(`/keys/remove?provider=${provider}`);
      setLlmKeys((p) => p.map((k) => k.provider === provider ? { ...k, isSaved: false, key: "" } : k));
      toast.success(`${provider} key removed.`);
    } catch { toast.error(`Failed to remove ${provider} key.`); }
  };

  const manageBilling = async () => {
    try {
      const data = await poster("/payment/create-portal-session", {});
      if (data?.url) window.location.href = data.url;
      else toast.error("Could not open billing portal. Contact support.");
    } catch { toast.error("Billing portal unavailable."); }
  };

  const upgradeToPro = async () => {
    const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;
    if (!priceId) { toast.error("Stripe not configured."); return; }
    try {
      const data = await poster("/payment/create-checkout-session", { priceId });
      if (data?.url) window.location.href = data.url;
    } catch { toast.error("Failed to start checkout."); }
  };

  const plan = profile.subscription?.plan || "free";
  const initials = profile.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <div className="animate-in fade-in duration-300">
      {/* Page title */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-heading tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account, billing, and automation preferences.</p>
      </div>

      <div className="flex gap-8 items-start">

        {/* ── Left nav ──────────────────────────────────────────────────── */}
        <nav className="hidden lg:flex flex-col w-52 shrink-0 sticky top-6 gap-0.5">
          {NAV_SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left w-full",
                activeSection === s.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              )}
            >
              <s.icon className="h-4 w-4 shrink-0" />
              {s.label}
              {activeSection === s.id && <ChevronRight className="h-3.5 w-3.5 ml-auto" />}
            </button>
          ))}
        </nav>

        {/* ── Mobile tab strip ──────────────────────────────────────────── */}
        <div className="lg:hidden w-full mb-6 flex gap-2 overflow-x-auto pb-2">
          {NAV_SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                activeSection === s.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/60 text-muted-foreground"
              )}
            >
              <s.icon className="h-3.5 w-3.5" />
              {s.label}
            </button>
          ))}
        </div>

        {/* ── Right content panel ───────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-0">

          {/* ═══ PROFILE ═══════════════════════════════════════════════════ */}
          {activeSection === "profile" && (
            <>
              <div className="bg-card rounded-2xl border border-border shadow-sm">
              {/* Avatar / name hero */}
              <div className="p-6 border-b border-border/50">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-primary/50 flex items-center justify-center text-3xl font-bold text-primary-foreground shadow-lg">
                      {initials}
                    </div>
                    <Badge variant="outline" className={cn(
                      "absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] px-2 whitespace-nowrap border font-semibold",
                      plan === "pro" ? "bg-primary/10 text-primary border-primary/20"
                        : plan === "enterprise" ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        : "bg-secondary text-muted-foreground"
                    )}>
                      {plan === "pro" ? <><Zap className="h-2.5 w-2.5 mr-0.5 inline" />Pro</>
                        : plan === "enterprise" ? <><Crown className="h-2.5 w-2.5 mr-0.5 inline" />Enterprise</>
                        : "Free"}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{profile.full_name || "Your Name"}</h3>
                    <p className="text-sm text-muted-foreground">{profile.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Avatar is auto-generated from initials. Custom avatars coming soon.
                    </p>
                  </div>
                </div>
              </div>

              {/* Fields */}
              <div className="p-6">
                <FieldRow label="Full Name" hint="Used in AI-generated content and email notifications.">
                  <Input
                    value={profile.full_name || ""}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    placeholder="Your full name"
                    className="max-w-sm"
                  />
                </FieldRow>

                <FieldRow label="Email" hint="Your account email. Contact support to change it.">
                  <Input value={profile.email || ""} disabled className="max-w-sm opacity-60 bg-secondary" />
                </FieldRow>

                <FieldRow label="Professional Bio" hint="The AI uses this to align content with your personal brand voice.">
                  <Textarea
                    value={profile.bio || ""}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setProfile({ ...profile, bio: e.target.value })}
                    placeholder="SaaS Founder building AI automation tools for content creators…"
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">{(profile.bio || "").length}/500 characters</p>
                </FieldRow>
              </div>

              <div className="px-6 py-4 bg-secondary/20 border-t border-border/50 rounded-b-2xl flex justify-end">
                <Button onClick={saveProfile} disabled={saving} className="min-w-[100px]">
                  {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : "Save Changes"}
                </Button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="mt-8 bg-card rounded-2xl border border-red-500/30 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-red-500/10 bg-red-500/5">
                <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" /> Danger Zone
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Once you delete your account, there is no going back. All of your data will be permanently wiped.
                </p>
              </div>
              <div className="p-6 flex items-center justify-between">
                <div>
                  <p className="font-medium">Permanently delete account</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    This action deletes your posts, integrations, active subscription, and profile forever.
                  </p>
                </div>
                
                {/* Delete Confirmation Modal */}
                <ConfirmDialog 
                  title="Are you absolutely sure?"
                  description="This action cannot be undone. This will permanently delete your account and remove your active integrations and scheduled posts from our servers."
                  confirmLabel={saving ? "Deleting..." : "Permanently Delete"}
                  destructive
                  onConfirm={deleteAccount}
                >
                  {(open) => (
                    <Button variant="destructive" onClick={open} disabled={saving}>
                      Delete Account
                    </Button>
                  )}
                </ConfirmDialog>
              </div>
            </div>
          </>
          )}

          {/* ═══ BILLING ══════════════════════════════════════════════════ */}
          {activeSection === "billing" && (
            <div className="space-y-4">
              {/* Current plan card */}
              <div className={cn(
                "rounded-2xl border p-6 relative overflow-hidden",
                plan === "pro" ? "border-primary/30 bg-gradient-to-br from-primary/5 to-transparent"
                  : plan === "enterprise" ? "border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent"
                  : "border-border bg-card"
              )}>
                {plan !== "free" && (
                  <div className="absolute top-0 right-0 h-32 w-32 rounded-full blur-3xl opacity-20"
                    style={{ background: plan === "pro" ? "hsl(var(--primary))" : "#f59e0b" }} />
                )}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "h-12 w-12 rounded-xl flex items-center justify-center",
                      plan === "pro" ? "bg-primary/10 text-primary"
                        : plan === "enterprise" ? "bg-amber-500/10 text-amber-500"
                        : "bg-secondary text-muted-foreground"
                    )}>
                      {plan === "enterprise" ? <Crown className="h-6 w-6" /> : plan === "pro" ? <Zap className="h-6 w-6" /> : <User className="h-6 w-6" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold capitalize">{plan} Plan</span>
                        {profile.subscription?.status === "active" && plan !== "free" && (
                          <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20 gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {profile.subscription?.next_billing
                          ? `Renews ${new Date(profile.subscription.next_billing).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
                          : plan === "free" ? "No billing — free tier" : "Lifetime / no billing cycle"}
                      </p>
                    </div>
                  </div>
                  {plan === "free" ? (
                    <Button onClick={upgradeToPro} className="gap-2 shrink-0">
                      <Sparkles className="h-4 w-4" /> Upgrade to Pro
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={manageBilling} className="gap-2 shrink-0">
                      <ExternalLink className="h-4 w-4" /> Manage Billing
                    </Button>
                  )}
                </div>
              </div>

              {/* Free → Pro feature grid */}
              {plan === "free" && (
                <div className="rounded-2xl border border-border bg-card p-6">
                  <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" /> What you unlock with Pro
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      "Unlimited AI-generated drafts",
                      "All 5 platforms (LinkedIn, X, Reddit, YouTube, Instagram)",
                      "Smart auto-scheduling",
                      "AI smart timing (peak-hour posting)",
                      "Bulk approval actions",
                      "Advanced analytics dashboard",
                      "Priority support",
                      "Team collaboration (up to 5 members)",
                    ].map((feat) => (
                      <div key={feat} className="flex items-center gap-2.5 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 pt-5 border-t border-border/50 flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Starting at <span className="font-bold text-foreground">$29/mo</span></p>
                    <Button onClick={upgradeToPro} className="gap-2">
                      <Sparkles className="h-4 w-4" /> Start Free Trial
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ API KEYS ═════════════════════════════════════════════════ */}
          {activeSection === "api-keys" && (
            <div className="bg-card rounded-2xl border border-border shadow-sm">
              <div className="p-6 border-b border-border/50">
                <SectionHeader
                  title="AI Canvas API Key"
                  desc="Use this key to call the AI Canvas API from your own applications."
                />
                <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-6">
                  <Lock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    This key grants full access to your account. Never expose it in client-side code, public repos, or browser console logs.
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>Secret Key</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      className="font-mono text-sm"
                      value={
                        profile.api_key && showApiKey
                          ? profile.api_key
                          : profile.has_api_key
                          ? "sk_••••••••••••••••••••••••"
                          : ""
                      }
                      placeholder="No key generated yet"
                    />
                    {profile.has_api_key && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => setShowApiKey(!showApiKey)}>
                          {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const val = profile.api_key || "sk_••••••••";
                            navigator.clipboard.writeText(val);
                            toast.success("Copied!");
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {profile.has_api_key ? (
                      <ConfirmDialog
                        title="Regenerate API Key?"
                        description="This will immediately invalidate your current key. Any apps using it will break."
                        confirmLabel="Regenerate"
                        destructive
                        onConfirm={generateApiKey}
                      >
                        {(open) => (
                          <Button variant="outline" onClick={open} className="gap-2 shrink-0">
                            <RefreshCw className="h-4 w-4" /> Regenerate
                          </Button>
                        )}
                      </ConfirmDialog>
                    ) : (
                      <Button onClick={generateApiKey} className="shrink-0">Generate Key</Button>
                    )}
                  </div>
                  {profile.api_key && showApiKey && (
                    <p className="text-xs text-amber-600 font-medium flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Store this key now — it won&apos;t be shown again after you leave this page.
                    </p>
                  )}
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-secondary/40 border border-border/50">
                  <Shield className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    <strong className="text-foreground">How it works:</strong> Include your key in the <code className="px-1 py-0.5 bg-secondary rounded text-xs">Authorization: Bearer sk_...</code> header when calling the AI Canvas API. See <a className="underline hover:text-foreground" href="/docs">documentation</a> for endpoint details.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ AI MODELS ════════════════════════════════════════════════ */}
          {activeSection === "llm" && (
            <div className="bg-card rounded-2xl border border-border shadow-sm">
              <div className="p-6 border-b border-border/50">
                <SectionHeader
                  title="AI Model Provider Keys"
                  desc="Connect your own LLM API keys. Keys are encrypted at rest — we never see your raw key."
                />
              </div>
              <div className="divide-y divide-border/50">
                {llmKeys.map((item) => {
                  const meta = LLM_META[item.provider];
                  return (
                    <div key={item.provider} className="p-6 flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="flex items-center gap-3 sm:w-52 shrink-0">
                        <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center">
                          <Brain className={cn("h-4 w-4", meta?.color)} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{meta?.label}</p>
                          <p className="text-xs text-muted-foreground">{meta?.hint}</p>
                        </div>
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <Input
                            type={item.isSaved ? "text" : "password"}
                            disabled={item.isSaved}
                            placeholder={`Enter your ${meta?.label} API key…`}
                            value={item.key}
                            onChange={(e) => setLlmKeys((p) => p.map((k) => k.provider === item.provider ? { ...k, key: e.target.value } : k))}
                            className="font-mono text-sm"
                          />
                          {item.isSaved ? (
                            <ConfirmDialog
                              title={`Remove ${meta?.label} key?`}
                              description={`This will disconnect ${meta?.label} from AI Canvas. You'll need to re-enter the key to use it.`}
                              confirmLabel="Remove"
                              destructive
                              onConfirm={() => deleteLlmKey(item.provider)}
                            >
                              {(open) => (
                                <Button variant="outline" onClick={open} className="shrink-0 gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </ConfirmDialog>
                          ) : (
                            <Button onClick={() => saveLlmKey(item.provider, item.key)} disabled={!item.key} className="shrink-0">
                              Save
                            </Button>
                          )}
                        </div>
                        {item.isSaved && (
                          <p className="text-xs text-green-600 flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Connected and encrypted
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ TEAM ════════════════════════════════════════════════════ */}
          {activeSection === "team" && (
            <div className="bg-card rounded-2xl border border-border shadow-sm">
              <div className="p-6 border-b border-border/50">
                <SectionHeader title="Team Collaboration" desc="Invite team members to review and approve content." />
              </div>
              <div className="p-6">
                <TeamManagement />
              </div>
            </div>
          )}

          {/* ═══ NOTIFICATIONS ═══════════════════════════════════════════ */}
          {activeSection === "notifications" && (
            <div className="bg-card rounded-2xl border border-border shadow-sm">
              <div className="p-6 border-b border-border/50">
                <SectionHeader title="Email Notifications" desc="Choose which events trigger an email to your inbox." />
              </div>
              <div className="divide-y divide-border/50">
                {(Object.entries({
                  weekly_digest:   { label: "Weekly Performance Digest",   desc: "A weekly summary of posts, engagement trends, and AI insights sent every Monday.", icon: Sparkles },
                  post_approval:   { label: "Ready for Approval Alerts",   desc: "Notified when AI drafts are ready for your review and action.", icon: CheckCircle2 },
                  trend_alert:     { label: "New Trend Opportunities",     desc: "Real-time alerts when high-confidence trends are detected in your niche.", icon: Zap },
                  security_alert:  { label: "Security Alerts",             desc: "Login notifications and important account security events.", icon: Shield },
                }) as [keyof NotificationPrefs, { label: string; desc: string; icon: React.ElementType }][]).map(([key, { label, desc, icon: Icon }]) => (
                  <div key={key} className="flex items-start justify-between gap-6 p-5">
                    <div className="flex items-start gap-4">
                      <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <Label htmlFor={key} className="text-sm font-medium cursor-pointer">{label}</Label>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                      </div>
                    </div>
                    <Switch
                      id={key}
                      checked={profile.notification_preferences[key]}
                      onCheckedChange={(checked) =>
                        setProfile({ ...profile, notification_preferences: { ...profile.notification_preferences, [key]: checked } })
                      }
                      className="shrink-0 mt-1"
                    />
                  </div>
                ))}
              </div>
              <div className="px-6 py-4 bg-secondary/20 border-t border-border/50 rounded-b-2xl flex justify-end">
                <Button onClick={saveProfile} disabled={saving} variant="outline">
                  {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : "Save Preferences"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
