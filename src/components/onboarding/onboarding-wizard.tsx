"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { fetcher, poster, getAuthToken } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  User,
  Target,
  Key,
  Zap,
  Rocket,
  Check,
  ChevronRight,
  ChevronLeft,
  Eye,
  EyeOff,
  ExternalLink,
  Linkedin,
  Twitter,
  Instagram,
  MessageSquare,
  AlertCircle,
  Sparkles,
  PartyPopper,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface WizardData {
  role: string;
  bio: string;
  niche: string;
  keywords: string;
  goals: string[];
  geminiKey: string;
  geminiKeySkipped: boolean;
  geminiKeyVerified: boolean;
  platformSkipped: boolean;
}

const TOTAL_STEPS = 5;

const STEPS = [
  { icon: User, label: "Profile" },
  { icon: Target, label: "Goals" },
  { icon: Key, label: "AI Key" },
  { icon: Zap, label: "Platform" },
  { icon: Rocket, label: "Launch" },
];

const GOALS = [
  { label: "Increase Brand Awareness", emoji: "📢" },
  { label: "Generate Leads", emoji: "💼" },
  { label: "Thought Leadership", emoji: "🧠" },
  { label: "Community Building", emoji: "🤝" },
  { label: "Recruitment", emoji: "👥" },
  { label: "Drive Sales", emoji: "📈" },
];

const PLATFORMS = [
  { name: "LinkedIn", icon: Linkedin, color: "text-[#0077b5]", bg: "bg-[#0077b5]/10 border-[#0077b5]/30", endpoint: "/auth/linkedin/connect" },
  { name: "Twitter", icon: Twitter, color: "text-[#1DA1F2]", bg: "bg-[#1DA1F2]/10 border-[#1DA1F2]/30", endpoint: "/auth/twitter/connect" },
  { name: "Instagram", icon: Instagram, color: "text-[#E1306C]", bg: "bg-[#E1306C]/10 border-[#E1306C]/30", endpoint: "/auth/instagram/connect" },
  { name: "Reddit", icon: MessageSquare, color: "text-[#FF4500]", bg: "bg-[#FF4500]/10 border-[#FF4500]/30", endpoint: "/auth/reddit/connect" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Step 1: Persona
// ─────────────────────────────────────────────────────────────────────────────
function StepPersona({ data, onChange }: { data: WizardData; onChange: (updates: Partial<WizardData>) => void }) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="space-y-2">
        <Label htmlFor="role" className="text-sm font-medium">
          What best describes your role?
        </Label>
        <Select onValueChange={(v) => onChange({ role: v })} value={data.role}>
          <SelectTrigger id="role" className="h-11">
            <SelectValue placeholder="Select your role..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="founder">Founder / CEO</SelectItem>
            <SelectItem value="marketer">Marketing Manager</SelectItem>
            <SelectItem value="freelancer">Freelancer / Consultant</SelectItem>
            <SelectItem value="sales">Sales Professional</SelectItem>
            <SelectItem value="creator">Content Creator</SelectItem>
            <SelectItem value="developer">Developer / Engineer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio" className="text-sm font-medium">
          Your professional bio{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="bio"
          rows={4}
          value={data.bio}
          onChange={(e) => onChange({ bio: e.target.value })}
          placeholder="e.g. SaaS founder building AI automation tools for B2B companies. Passionate about product-led growth..."
          className="resize-none"
        />
        <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            <span className="text-foreground font-medium">Your bio is your AI&apos;s voice.</span>{" "}
            The better it knows you, the more authentically it writes like you.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2: Goals, Niche, Keywords
// ─────────────────────────────────────────────────────────────────────────────
function StepGoals({ data, onChange }: { data: WizardData; onChange: (updates: Partial<WizardData>) => void }) {
  const toggleGoal = (goal: string) => {
    const current = data.goals;
    const updated = current.includes(goal)
      ? current.filter((g) => g !== goal)
      : current.length < 3
      ? [...current, goal]
      : current;
    onChange({ goals: updated });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Content goals</Label>
          <span className="text-xs text-muted-foreground">{data.goals.length}/3 selected</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {GOALS.map((g) => {
            const selected = data.goals.includes(g.label);
            return (
              <button
                key={g.label}
                type="button"
                onClick={() => toggleGoal(g.label)}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-xl border text-left text-sm font-medium transition-all duration-200 hover:border-primary/60",
                  selected
                    ? "border-primary bg-primary/8 ring-1 ring-primary text-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="text-base">{g.emoji}</span>
                <span className="leading-tight">{g.label}</span>
                {selected && <Check className="h-3 w-3 ml-auto text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="niche" className="text-sm font-medium">
            Your industry / niche <span className="text-destructive">*</span>
          </Label>
          <Input
            id="niche"
            value={data.niche}
            onChange={(e) => onChange({ niche: e.target.value })}
            placeholder="e.g. SaaS, FinTech, Health..."
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="keywords" className="text-sm font-medium">
            Focus keywords{" "}
            <span className="text-muted-foreground font-normal">(comma-separated)</span>
          </Label>
          <Input
            id="keywords"
            value={data.keywords}
            onChange={(e) => onChange({ keywords: e.target.value })}
            placeholder="e.g. AI, automation, product growth..."
            className="h-11"
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 3: Gemini API Key
// ─────────────────────────────────────────────────────────────────────────────
function StepApiKey({ data, onChange }: { data: WizardData; onChange: (updates: Partial<WizardData>) => void }) {
  const [showKey, setShowKey] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleVerify = async () => {
    if (!data.geminiKey) return;
    setVerifying(true);
    try {
      await poster("/api/v1/keys/save", { provider: "gemini", apiKey: data.geminiKey });
      onChange({ geminiKeyVerified: true, geminiKeySkipped: false });
      toast.success("Gemini API key verified and saved! ✅");
    } catch {
      onChange({ geminiKeyVerified: false });
      toast.error("Invalid API key. Please check and try again.");
    } finally {
      setVerifying(false);
    }
  };

  const handleSkip = () => {
    onChange({ geminiKeySkipped: true, geminiKeyVerified: false, geminiKey: "" });
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="space-y-3">
        <Label htmlFor="gemini-key" className="text-sm font-medium">
          Your Gemini API Key
        </Label>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="gemini-key"
              type={showKey ? "text" : "password"}
              value={data.geminiKey}
              onChange={(e) => onChange({ geminiKey: e.target.value, geminiKeyVerified: false })}
              placeholder="AIza..."
              className="h-11 pr-10 font-mono text-sm"
              disabled={data.geminiKeyVerified}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {data.geminiKeyVerified ? (
            <Button variant="outline" className="h-11 gap-1.5 text-green-600 border-green-500/40 bg-green-500/5 hover:bg-green-500/10" disabled>
              <Check className="h-4 w-4" /> Verified
            </Button>
          ) : (
            <Button onClick={handleVerify} disabled={!data.geminiKey || verifying} className="h-11">
              {verifying ? (
                <div className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              ) : (
                "Verify"
              )}
            </Button>
          )}
        </div>

        <a
          href="https://makersuite.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          Get your free Gemini API key
        </a>
      </div>

      {/* Why do I need this */}
      <div className="border border-border rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between p-4 text-sm font-medium text-left hover:bg-secondary/30 transition-colors"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            Why do I need this?
          </span>
          <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-90")} />
        </button>
        {expanded && (
          <div className="px-4 pb-4 text-sm text-muted-foreground space-y-2 border-t border-border pt-3">
            <p>AI Canvas uses Google&apos;s Gemini API to analyze trends and generate content drafts. You provide your own key so:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>You control your own AI quota and costs</li>
              <li>Your content stays private — it never passes through our servers</li>
              <li>The free Gemini tier gives 15 RPM, plenty for daily automation</li>
            </ul>
          </div>
        )}
      </div>

      {/* Skip option */}
      {!data.geminiKeyVerified && (
        <button
          type="button"
          onClick={handleSkip}
          className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors w-full text-center"
        >
          Skip for now — I&apos;ll add it in Settings later
        </button>
      )}

      {data.geminiKeySkipped && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-600 dark:text-amber-400">
            AI generation will be disabled until you add a key in{" "}
            <strong>Settings → LLM Provider API Keys</strong>.
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4: Platform Connect
// ─────────────────────────────────────────────────────────────────────────────
function StepPlatform({
  data,
  onChange,
  connections,
  onRefresh,
}: {
  data: WizardData;
  onChange: (updates: Partial<WizardData>) => void;
  connections: string[];
  onRefresh: () => void;
}) {
  const [connecting, setConnecting] = useState<string | null>(null);
  const isProd = process.env.NODE_ENV === "production";
  const apiBase = isProd
    ? "https://ai-canvass.vercel.app/api/v1"
    : (process.env.NEXT_PUBLIC_API_URL?.replace("/automation", "") || "http://localhost:4000/api/v1");

  const handleConnect = async (platform: typeof PLATFORMS[0]) => {
    setConnecting(platform.name);
    try {
      const token = await getAuthToken();
      const res = await fetch(`${apiBase}${platform.endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (d.url) {
        window.location.href = d.url;
      } else {
        toast.error("Could not get connection URL");
      }
    } catch {
      toast.error(`Failed to connect ${platform.name}`);
    } finally {
      setConnecting(null);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
      <p className="text-sm text-muted-foreground">
        Connect at least one platform so AI Canvas can publish content on your behalf.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {PLATFORMS.map((p) => {
          const connected = connections.includes(p.name.toLowerCase());
          return (
            <div
              key={p.name}
              className={cn(
                "p-4 rounded-xl border flex flex-col gap-3 transition-all",
                connected ? "border-green-500/40 bg-green-500/5" : "border-border bg-card"
              )}
            >
              <div className="flex items-center justify-between">
                <div className={cn("p-2 rounded-lg border", p.bg)}>
                  <p.icon className={cn("h-5 w-5", p.color)} />
                </div>
                {connected ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-500/10 px-2 py-0.5 rounded-full">
                    <Check className="h-3 w-3" /> Connected
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">Not connected</span>
                )}
              </div>
              <span className="text-sm font-medium">{p.name}</span>
              {!connected && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  disabled={connecting === p.name}
                  onClick={() => handleConnect(p)}
                >
                  {connecting === p.name ? (
                    <div className="h-3 w-3 rounded-full border-2 border-foreground/40 border-t-foreground animate-spin" />
                  ) : (
                    "Connect"
                  )}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => { onChange({ platformSkipped: true }); onRefresh(); }}
        className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors w-full text-center"
      >
        Skip — I&apos;ll connect platforms via Settings → Integrations
      </button>

      {data.platformSkipped && connections.length === 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Content can be generated, but publishing will be disabled until a platform is connected.
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 5: Launch
// ─────────────────────────────────────────────────────────────────────────────
function StepReady({
  data,
  connections,
  launching,
}: {
  data: WizardData;
  connections: string[];
  launching: boolean;
}) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 text-center">
      <div className="flex flex-col items-center gap-3 py-2">
        <div className="relative">
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30">
            <PartyPopper className="h-10 w-10 text-white" />
          </div>
          <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-green-500 flex items-center justify-center ring-2 ring-background">
            <Check className="h-3.5 w-3.5 text-white" />
          </div>
        </div>
        <div>
          <h3 className="text-lg font-bold">You&apos;re all set!</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Your AI workspace has been personalized and is ready to launch.
          </p>
        </div>
      </div>

      {/* Summary card */}
      <div className="text-left bg-secondary/40 border border-border rounded-xl divide-y divide-border/60">
        {[
          { label: "Role", value: data.role || "—" },
          { label: "Niche", value: data.niche || "—" },
          { label: "Goals", value: data.goals.length > 0 ? `${data.goals.length} selected` : "None" },
          {
            label: "AI Key",
            value: data.geminiKeyVerified ? "✅ Gemini connected" : "⚠️ Not added yet",
          },
          {
            label: "Platforms",
            value: connections.length > 0 ? connections.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(", ") : "⚠️ None connected",
          },
        ].map((row) => (
          <div key={row.label} className="flex justify-between px-4 py-3 text-sm">
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-medium capitalize">{row.value}</span>
          </div>
        ))}
      </div>

      {launching && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 rounded-full border-2 border-primary/40 border-t-primary animate-spin" />
          Saving your workspace...
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Wizard Shell
// ─────────────────────────────────────────────────────────────────────────────
export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [launching, setLaunching] = useState(false);
  const [connections, setConnections] = useState<string[]>([]);

  const [data, setData] = useState<WizardData>({
    role: "",
    bio: "",
    niche: "",
    keywords: "",
    goals: [],
    geminiKey: "",
    geminiKeySkipped: false,
    geminiKeyVerified: false,
    platformSkipped: false,
  });

  const updateData = (updates: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const fetchConnections = useCallback(async () => {
    try {
      const connData = await fetcher("/api/v1/automation/connections");
      const list = Array.isArray(connData) ? connData : [];
      setConnections(
        list
          .filter((c: { status: string }) => c.status === "connected" || c.status === "active")
          .map((c: { platform: string }) => c.platform)
      );
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const canAdvance = () => {
    if (step === 1) return !!data.role;
    if (step === 2) return !!data.niche;
    if (step === 3) return data.geminiKeyVerified || data.geminiKeySkipped;
    if (step === 4) return connections.length > 0 || data.platformSkipped;
    return true;
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const handleLaunch = async () => {
    setLaunching(true);
    try {
      const keywords = data.keywords
        ? data.keywords.split(",").map((k) => k.trim()).filter(Boolean)
        : [];

      await poster("/api/v1/user/profile", {
        role: data.role,
        bio: data.bio,
        niche: data.niche,
        goals: data.goals,
        onboarding_completed: true,
      });

      // Save automation config with niche/keywords
      if (data.niche) {
        await poster("/api/v1/automation/config", {
          platform: "linkedin",
          niches: [data.niche],
          keywords,
          tone_profile: data.role === "founder" ? "Thought Leader" : "Professional",
          require_approval: true,
        }).catch(() => {}); // non-blocking
      }

      toast.success("Welcome to AI Canvas! 🚀");
      router.push("/dashboard");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error("Failed to save profile. Please try again.", {
        description: msg,
      });
    } finally {
      setLaunching(false);
    }
  };

  const progress = (step / TOTAL_STEPS) * 100;

  return (
    <div className="flex items-center justify-center min-h-screen px-4 py-12">
      <div className="w-full max-w-[520px]">
        {/* Brand header */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/30">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold font-heading tracking-tight">AI Canvas</span>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl shadow-xl shadow-black/10 overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 w-full bg-secondary">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="p-7">
            {/* Step dots */}
            <div className="flex items-center justify-center gap-2 mb-8">
              {STEPS.map((s, i) => {
                const idx = i + 1;
                const completed = idx < step;
                const current = idx === step;
                const Icon = s.icon;
                return (
                  <div key={s.label} className="flex items-center">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300 text-xs font-bold",
                        completed
                          ? "border-primary bg-primary text-primary-foreground"
                          : current
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-transparent text-muted-foreground"
                      )}
                      title={s.label}
                    >
                      {completed ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div
                        className={cn(
                          "h-px w-8 transition-all duration-300",
                          completed ? "bg-primary" : "bg-border"
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Step title */}
            <div className="mb-6">
              <h2 className="text-xl font-bold font-heading tracking-tight">
                {step === 1 && "Tell us about yourself"}
                {step === 2 && "What are your goals?"}
                {step === 3 && "Connect your AI brain"}
                {step === 4 && "Connect a platform"}
                {step === 5 && "Ready for launch 🚀"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {step === 1 && "Help us tailor your AI content strategy from day one."}
                {step === 2 && "Choose goals and define your niche — this trains your trend filters."}
                {step === 3 && "Add your Gemini API key to enable AI content generation."}
                {step === 4 && "Connect where you want to publish AI-generated content."}
                {step === 5 && "Review your setup and launch your personalized workspace."}
              </p>
            </div>

            {/* Step content */}
            <div className="min-h-[280px]">
              {step === 1 && <StepPersona data={data} onChange={updateData} />}
              {step === 2 && <StepGoals data={data} onChange={updateData} />}
              {step === 3 && <StepApiKey data={data} onChange={updateData} />}
              {step === 4 && (
                <StepPlatform
                  data={data}
                  onChange={updateData}
                  connections={connections}
                  onRefresh={fetchConnections}
                />
              )}
              {step === 5 && (
                <StepReady data={data} connections={connections} launching={launching} />
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
              <div>
                {step > 1 && step < TOTAL_STEPS && (
                  <Button variant="ghost" onClick={handleBack} className="gap-1.5">
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  Step {step} of {TOTAL_STEPS}
                </span>

                {step < TOTAL_STEPS ? (
                  <Button
                    onClick={handleNext}
                    disabled={!canAdvance()}
                    className="gap-1.5 min-w-[110px]"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleLaunch}
                    disabled={launching}
                    className="gap-1.5 min-w-[140px] bg-gradient-to-r from-primary to-primary/80 shadow-md shadow-primary/30"
                  >
                    {launching ? (
                      <div className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    ) : (
                      <>
                        <Rocket className="h-4 w-4" />
                        Launch Dashboard
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground/60 mt-6">
          You can always update these settings later from your profile.
        </p>
      </div>
    </div>
  );
}
