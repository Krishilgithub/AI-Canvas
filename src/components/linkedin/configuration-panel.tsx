"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetcher, poster } from "@/lib/api-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  X, Plus, AlertCircle, CheckCircle2, Loader2,
  Target, Clock, Info, Sparkles, ShieldCheck, Zap, Brain,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Connection {
  platform: string;
  user_id?: string;
  status?: string;
}

// ─── Tooltip helper ──────────────────────────────────────────────────────────
function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-56 px-3 py-2 text-xs rounded-lg bg-popover text-popover-foreground shadow-lg border border-border leading-relaxed pointer-events-none">
          {text}
        </span>
      )}
    </span>
  );
}

// ─── Section header with optional badge ─────────────────────────────────────
function SectionLabel({
  label, tooltip, badge,
}: { label: string; tooltip?: string; badge?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Label className="text-sm font-medium">{label}</Label>
      {tooltip && <Tooltip text={tooltip} />}
      {badge && (
        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{badge}</Badge>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export function ConfigurationPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"content" | "schedule">("content");
  const [connection, setConnection] = useState<Connection | null>(null);

  // ── Content Strategy ──
  const [niches, setNiches] = useState<string[]>([]);
  const [keywords, setKeywords] = useState("");
  const [currentNiche, setCurrentNiche] = useState("");

  // ── Tone ──
  const [professionalism, setProfessionalism] = useState([75]);
  const [voicePreset, setVoicePreset] = useState("thought_leader");

  // ── Schedule & Automation ──
  const [frequency, setFrequency] = useState("daily");
  const [smartScheduling, setSmartScheduling] = useState(false);
  const [requireApproval, setRequireApproval] = useState(true);
  const [autoPostEnabled, setAutoPostEnabled] = useState(false);
  const [preferredTime, setPreferredTime] = useState("14:30");
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  );

  // ── Load existing config ──
  useEffect(() => {
    Promise.all([
      fetcher("/connections"),
      fetcher("/config?platform=linkedin").catch(() => null),
    ]).then(([conns, config]) => {
      const lnk = Array.isArray(conns)
        ? conns.find((c: Connection) => c.platform === "linkedin")
        : null;
      setConnection(lnk || null);

      if (config) {
        setNiches(config.niches || []);
        setKeywords(
          Array.isArray(config.keywords)
            ? config.keywords.join(", ")
            : config.keywords || ""
        );
        if (config.tone_profile) {
          setProfessionalism([config.tone_profile.professionalism || 75]);
          setVoicePreset(config.tone_profile.voice || "thought_leader");
        }
        if (config.schedule_cron === "0 9 * * 1-5") setFrequency("daily");
        else if (config.schedule_cron === "0 9,17 * * 1-5") setFrequency("twice_daily");
        else if (config.frequency) setFrequency(config.frequency);

        setSmartScheduling(config.smart_scheduling ?? false);
        setRequireApproval(config.require_approval ?? true);
        if (config.preferred_time) setPreferredTime(config.preferred_time);
        if (config.timezone) setTimezone(config.timezone);
        setAutoPostEnabled(config.auto_post_enabled ?? false);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleAddNiche = () => {
    const trimmed = currentNiche.trim();
    if (trimmed && !niches.includes(trimmed)) {
      setNiches([...niches, trimmed]);
      setCurrentNiche("");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const cron = frequency === "twice_daily" ? "0 9,17 * * 1-5" : "0 9 * * 1-5";
      await poster("/config", {
        platform: "linkedin",
        niches,
        keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
        tone_profile: { professionalism: professionalism[0], voice: voicePreset },
        schedule_cron: cron,
        smart_scheduling: smartScheduling,
        require_approval: requireApproval,
        frequency: frequency === "twice_daily" ? "daily" : frequency,
        preferred_time: preferredTime,
        timezone,
        auto_post_enabled: autoPostEnabled,
      });
      toast.success("Configuration saved!");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const VOICE_PRESETS = [
    {
      id: "thought_leader",
      label: "Thought Leader",
      emoji: "🧠",
      desc: "Bold insights, definitive takes. Posts that spark debate.",
    },
    {
      id: "storyteller",
      label: "Storyteller",
      emoji: "📖",
      desc: "Narrative-driven, personal, emotionally resonant content.",
    },
    {
      id: "analyst",
      label: "Analyst",
      emoji: "📊",
      desc: "Data-first, structured, evidence-based writing style.",
    },
  ];

  const FREQUENCY_OPTIONS = [
    {
      id: "daily",
      label: "Once daily",
      sublabel: "9:00 AM weekdays",
      icon: "📅",
    },
    {
      id: "twice_daily",
      label: "Twice daily",
      sublabel: "9:00 AM & 5:00 PM weekdays",
      icon: "⚡",
    },
    {
      id: "alternate_days",
      label: "Every other day",
      sublabel: "Sustainable for solo creators",
      icon: "🔄",
    },
    {
      id: "weekly",
      label: "Weekly",
      sublabel: "Best for long-form content",
      icon: "📆",
    },
  ];

  const POPULAR_TIMEZONES = [
    "America/New_York",
    "America/Los_Angeles",
    "Europe/London",
    "Europe/Berlin",
    "Asia/Kolkata",
    "Asia/Singapore",
    "Australia/Sydney",
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto pb-20">
      {/* ── Connection header ──────────────────────────────────────────── */}
      <div className="bg-card border rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-11 w-11 bg-[#0077b5]/10 flex items-center justify-center rounded-full text-[#0077b5] shrink-0">
            <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24">
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">LinkedIn Integration</h2>
              {connection ? (
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 gap-1 text-xs">
                  <CheckCircle2 className="h-3 w-3" /> Active
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-xs">Disconnected</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {connection
                ? `Connected · account ID: ${connection.user_id?.substring(0, 10) ?? "—"}…`
                : "Not connected. Go to Integrations to connect your account."}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/integrations")}
          className={!connection ? "border-primary text-primary hover:bg-primary/5" : ""}
        >
          {connection ? "Manage Connection" : "Connect Account"}
        </Button>
      </div>

      {/* ── Tab switcher ───────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-secondary/30 p-1 rounded-xl border border-border w-fit">
        {[
          { id: "content", label: "What to Post", icon: Target, desc: "Topics, keywords, and tone" },
          { id: "schedule", label: "When & How", icon: Clock, desc: "Schedule, frequency, and auto-post" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as "content" | "schedule")}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
         TAB 1: WHAT TO POST
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "content" && (
        <div className="grid lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-2 duration-300">
          {/* Content Strategy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Content Strategy
              </CardTitle>
              <CardDescription>
                Tell the AI what industries and audiences to focus on.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Niches */}
              <div className="space-y-3">
                <SectionLabel
                  label="Core Topics"
                  tooltip="The AI uses these niche tags to filter trending news and decide whether a topic is relevant to generate content for."
                />
                <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                  {niches.map((n) => (
                    <Badge key={n} variant="secondary" className="px-2.5 py-1 text-xs gap-1.5">
                      {n}
                      <X
                        className="h-3 w-3 cursor-pointer opacity-60 hover:opacity-100"
                        onClick={() => setNiches(niches.filter((x) => x !== n))}
                      />
                    </Badge>
                  ))}
                  {niches.length === 0 && (
                    <span className="text-xs text-muted-foreground italic">
                      No topics yet — add at least one to enable trend detection.
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder='e.g. "SaaS Growth" or "AI in Healthcare"'
                    value={currentNiche}
                    onChange={(e) => setCurrentNiche(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddNiche()}
                    className="h-9 text-sm"
                  />
                  <Button
                    variant="secondary"
                    onClick={handleAddNiche}
                    disabled={!currentNiche.trim()}
                    size="sm"
                    className="shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add
                  </Button>
                </div>
              </div>

              {/* Keywords */}
              <div className="space-y-2">
                <SectionLabel
                  label="Target Audience Keywords"
                  tooltip="Comma-separated keywords your audience uses. These help the AI write at the right expertise level and use vocabulary your readers recognize."
                />
                <Input
                  placeholder="e.g. Founders, VCs, Product Managers, B2B SaaS"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="h-9 text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Separate with commas. The AI uses these to calibrate vocabulary and reader alignment.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Tone & Voice */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                Tone & Voice
              </CardTitle>
              <CardDescription>
                Control how the AI writes — from conversational to corporate.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-7">
              {/* Professionalism slider */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <SectionLabel
                    label="Formality Level"
                    tooltip="Controls how casual or corporate the AI's writing sounds. 'Balanced' is best for most LinkedIn audiences."
                  />
                  <span className={cn(
                    "text-xs font-semibold px-2 py-0.5 rounded-full",
                    professionalism[0] < 30
                      ? "bg-orange-500/10 text-orange-600"
                      : professionalism[0] > 70
                      ? "bg-blue-500/10 text-blue-600"
                      : "bg-green-500/10 text-green-600"
                  )}>
                    {professionalism[0] < 30 ? "Casual" : professionalism[0] > 70 ? "Corporate" : "Balanced"}
                  </span>
                </div>
                <Slider
                  value={professionalism}
                  onValueChange={setProfessionalism}
                  max={100}
                  step={1}
                  className="py-1"
                />
                <div className="flex justify-between text-xs text-muted-foreground px-0.5">
                  <span>😄 Casual & Fun</span>
                  <span>🤝 Professional</span>
                  <span>🏦 Formal</span>
                </div>
              </div>

              {/* Voice presets */}
              <div className="space-y-3">
                <SectionLabel
                  label="Writing Style"
                  tooltip="Defines the structural pattern of your posts. Thought Leader uses bold opinions. Storyteller uses narratives. Analyst uses data and structure."
                />
                <div className="grid gap-2">
                  {VOICE_PRESETS.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVoicePreset(v.id)}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-xl border text-left transition-all duration-200",
                        voicePreset === v.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-primary/40 hover:bg-secondary/40"
                      )}
                    >
                      <span className="text-xl shrink-0 mt-0.5">{v.emoji}</span>
                      <div>
                        <div className="text-sm font-semibold flex items-center gap-2">
                          {v.label}
                          {voicePreset === v.id && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{v.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
         TAB 2: WHEN & HOW
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "schedule" && (
        <div className="grid lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-2 duration-300">
          {/* Posting Frequency */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Posting Frequency
              </CardTitle>
              <CardDescription>
                How often should AI Canvas publish on your behalf?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {FREQUENCY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFrequency(opt.id)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-200",
                    frequency === opt.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/40 hover:bg-secondary/30"
                  )}
                >
                  <span className="text-xl shrink-0">{opt.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{opt.label}</div>
                    <div className="text-xs text-muted-foreground">{opt.sublabel}</div>
                  </div>
                  <div className={cn(
                    "h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center",
                    frequency === opt.id ? "border-primary bg-primary" : "border-border"
                  )}>
                    {frequency === opt.id && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Automation & Approval */}
          <div className="space-y-4">
            {/* Smart Scheduling */}
            <Card className={cn(smartScheduling && "border-primary/30 bg-primary/5")}>
              <CardContent className="pt-5 space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <SectionLabel
                      label="Smart Scheduling"
                      badge="AI"
                      tooltip="When enabled, the AI analyzes historical engagement data to predict the best hour to publish each day — automatically overriding your preferred time if a better slot is detected."
                    />
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Posts at the hour your audience is most active based on engagement patterns.
                      {smartScheduling && (
                        <span className="text-primary font-medium"> Overrides your preferred time below.</span>
                      )}
                    </p>
                  </div>
                  <Switch checked={smartScheduling} onCheckedChange={setSmartScheduling} />
                </div>
                {smartScheduling && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs text-primary/80">
                      AI will automatically choose the best posting window each day.
                      Your preferred time is used as a fallback when data is insufficient.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Auto-Pilot */}
            <Card className={cn(autoPostEnabled && "border-amber-500/30 bg-amber-500/5")}>
              <CardContent className="pt-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <SectionLabel
                      label="Auto-Pilot Posting"
                      badge="Advanced"
                      tooltip="When ON, approved drafts are automatically posted at your scheduled time — no manual click needed. When OFF, posts go to the Review Queue for you to publish manually."
                    />
                    <p className="text-xs text-muted-foreground">
                      {autoPostEnabled
                        ? "✅ Drafts marked as approved will be published automatically."
                        : "Posts will be queued for your manual review before publishing."}
                    </p>
                  </div>
                  <Switch checked={autoPostEnabled} onCheckedChange={setAutoPostEnabled} />
                </div>

                {autoPostEnabled && (
                  <div className="space-y-3 pt-1 border-t border-amber-500/20">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Preferred Time</Label>
                      <Input
                        type="time"
                        value={preferredTime}
                        onChange={(e) => setPreferredTime(e.target.value)}
                        className="h-9 text-sm"
                        disabled={smartScheduling}
                      />
                      {smartScheduling && (
                        <p className="text-[11px] text-muted-foreground">
                          Overridden by Smart Scheduling — used as fallback only.
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                        Timezone
                        <Tooltip text="Your local timezone. All post times are calculated relative to this." />
                      </Label>
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full h-9 text-sm rounded-md border border-input bg-background px-3 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        {POPULAR_TIMEZONES.includes(timezone) ? null : (
                          <option value={timezone}>{timezone} (current)</option>
                        )}
                        {POPULAR_TIMEZONES.map((tz) => (
                          <option key={tz} value={tz}>{tz}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Approval Gate */}
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <SectionLabel
                      label="Require Human Approval"
                      tooltip="When ON, every AI-generated draft goes to your Review Queue before it can be published. Recommended: keep this ON until you trust the AI's output for your brand."
                    />
                    <p className="text-xs text-muted-foreground">
                      {requireApproval
                        ? "🛡 AI won't publish without your explicit approval."
                        : "⚠️ Posts will skip the review queue."}
                    </p>
                  </div>
                  <Switch checked={requireApproval} onCheckedChange={setRequireApproval} />
                </div>
                {!requireApproval && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 mt-4">
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Without approval, posts are published automatically. Make sure your niches and voice are configured correctly first.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary card */}
            <Card className="bg-secondary/20 border-dashed">
              <CardContent className="pt-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5" /> Your Automation Summary
                </p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frequency</span>
                    <span className="font-medium capitalize">{frequency.replace("_", " ")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Auto-publish</span>
                    <span className={cn("font-medium", autoPostEnabled ? "text-amber-600" : "text-muted-foreground")}>
                      {autoPostEnabled ? "On" : "Off"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Approval required</span>
                    <span className={cn("font-medium", requireApproval ? "text-green-600" : "text-red-500")}>
                      {requireApproval ? "Yes" : "No"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Smart scheduling</span>
                    <span className={cn("font-medium", smartScheduling ? "text-primary" : "text-muted-foreground")}>
                      {smartScheduling ? "On" : "Off"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── Sticky Save bar ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 sticky bottom-6 bg-background/80 backdrop-blur-sm border border-border rounded-xl px-5 py-3 shadow-lg">
        <p className="text-xs text-muted-foreground hidden sm:block">
          Changes apply to all future AI-generated content for LinkedIn.
        </p>
        <div className="flex gap-3 ml-auto">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Discard
          </Button>
          <Button onClick={handleSave} disabled={saving} className="min-w-[120px]">
            {saving ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</>
            ) : (
              "Save Configuration"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
