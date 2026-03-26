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
  Target, Clock, Info, Sparkles, Zap, Brain, PlaySquare
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

// ─── YouTube SVG icon ─────────────────────────────────────────────────────────
function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export function YouTubeConfigurationPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"content" | "schedule">("content");
  const [connection, setConnection] = useState<Connection | null>(null);

  // ── Content Strategy ──
  const [topics, setTopics] = useState<string[]>([]);
  const [keywords, setKeywords] = useState("");
  const [currentTopic, setCurrentTopic] = useState("");

  // ── Tone ──
  const [professionalism, setProfessionalism] = useState([50]);
  const [voicePreset, setVoicePreset] = useState("tutorial");

  // ── Schedule & Automation ──
  const [frequency, setFrequency] = useState("weekly");
  const [smartScheduling, setSmartScheduling] = useState(false);
  const [requireApproval, setRequireApproval] = useState(true);
  const [autoPostEnabled, setAutoPostEnabled] = useState(false);
  const [preferredTime, setPreferredTime] = useState("17:00");
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  );
  const [format, setFormat] = useState("shorts");

  // ── Load existing config ──
  useEffect(() => {
    Promise.all([
      fetcher("/connections"),
      fetcher("/config?platform=youtube").catch(() => null),
    ]).then(([conns, config]) => {
      const lnk = Array.isArray(conns)
        ? conns.find((c: Connection) => c.platform === "youtube")
        : null;
      setConnection(lnk || null);

      if (config) {
        setTopics(config.niches || []);
        setKeywords(
          Array.isArray(config.keywords)
            ? config.keywords.join(", ")
            : config.keywords || ""
        );
        if (config.tone_profile) {
          setProfessionalism([config.tone_profile.professionalism ?? 50]);
          setVoicePreset(config.tone_profile.voice || "tutorial");
        }
        if (config.schedule_cron === "0 17 * * 5") setFrequency("weekly");
        else if (config.schedule_cron === "0 17 * * 2,5") setFrequency("twice_weekly");
        else if (config.frequency) setFrequency(config.frequency);

        setSmartScheduling(config.smart_scheduling ?? false);
        setRequireApproval(config.require_approval ?? true);
        if (config.preferred_time) setPreferredTime(config.preferred_time);
        if (config.timezone) setTimezone(config.timezone);
        setAutoPostEnabled(config.auto_post_enabled ?? false);
        if (config.video_format) setFormat(config.video_format);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleAddTopic = () => {
    const trimmed = currentTopic.trim();
    if (trimmed && !topics.includes(trimmed)) {
      setTopics([...topics, trimmed]);
      setCurrentTopic("");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const cron = frequency === "twice_weekly" ? "0 17 * * 2,5" : "0 17 * * 5";
      await poster("/config", {
        platform: "youtube",
        niches: topics,
        keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
        tone_profile: { professionalism: professionalism[0], voice: voicePreset },
        schedule_cron: cron,
        smart_scheduling: smartScheduling,
        require_approval: requireApproval,
        frequency: frequency === "twice_weekly" ? "weekly" : frequency,
        preferred_time: preferredTime,
        timezone,
        auto_post_enabled: autoPostEnabled,
        video_format: format,
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

  const FORMAT_OPTIONS = [
    { id: "shorts", label: "YouTube Shorts", icon: "📱", desc: "< 60 seconds vertical." },
    { id: "longform", label: "Long-form", icon: "📺", desc: "Detailed 5-15 minute videos." },
  ];

  const VOICE_PRESETS = [
    {
      id: "tutorial",
      label: "Tutorial / How-to",
      emoji: "🛠",
      desc: "Step-by-step guidance, screen recording scripts, clear structure.",
    },
    {
      id: "essay",
      label: "Video Essay",
      emoji: "📖",
      desc: "Cinematic narrative, deep research, analytical tone.",
    },
    {
      id: "vlog",
      label: "Vlog / Casual",
      emoji: "🎥",
      desc: "Face-to-camera, energetic pacing, jump cuts.",
    },
  ];

  const FREQUENCY_OPTIONS = [
    {
      id: "daily",
      label: "Daily (Shorts)",
      sublabel: "Good for rapid growth",
      icon: "⚡",
    },
    {
      id: "twice_weekly",
      label: "Twice a week",
      sublabel: "Standard for creators",
      icon: "📺",
    },
    {
      id: "weekly",
      label: "Once weekly",
      sublabel: "Best for high-production",
      icon: "📅",
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
          <div className="h-11 w-11 bg-red-600/10 flex items-center justify-center rounded-full text-red-600 shrink-0">
            <YouTubeIcon className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">YouTube Integration</h2>
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
                ? `Connected channel: ${connection.user_id?.substring(0, 10) ?? "—"}…`
                : "Not connected. Go to Integrations to link your channel."}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/integrations")}
          className={!connection ? "border-red-600 text-red-600 hover:bg-red-600/5" : ""}
        >
          {connection ? "Manage Channel" : "Connect Channel"}
        </Button>
      </div>

      {/* ── Tab switcher ───────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-secondary/30 p-1 rounded-xl border border-border w-fit">
        {[
          { id: "content", label: "Video Types", icon: Target, desc: "Format, topics, tone" },
          { id: "schedule", label: "Publishing", icon: Clock, desc: "Schedule and auto-post" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id as "content" | "schedule")}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              activeTab === t.id
                ? "bg-background text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
         TAB 1: CONTENT
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "content" && (
        <div className="grid lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-2 duration-300">
          {/* Content Strategy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-4 w-4 text-red-600" />
                Channel Focus
              </CardTitle>
              <CardDescription>
                Help AI generate scripts and titles tailored to your niche.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Format Select */}
              <div className="space-y-3">
                <SectionLabel
                  label="Target Format"
                  tooltip="The AI will optimize generated scripts either for high-retention Shorts or in-depth Long-form content."
                />
                <div className="grid grid-cols-2 gap-3">
                  {FORMAT_OPTIONS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFormat(f.id)}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all duration-200",
                        format === f.id
                          ? "border-red-600 bg-red-600/5 ring-1 ring-red-600"
                          : "border-border hover:border-red-600/40 hover:bg-secondary/40"
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-xl leading-none">{f.icon}</span>
                        {format === f.id && <CheckCircle2 className="h-4 w-4 text-red-600" />}
                      </div>
                      <div className="mt-2 font-medium text-sm">{f.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{f.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Niches */}
              <div className="space-y-3">
                <SectionLabel
                  label="Core Subjects"
                  tooltip="Main topics you cover. AI pulls trending queries related to these subjects to pitch video ideas."
                />
                <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                  {topics.map((n) => (
                    <Badge key={n} variant="secondary" className="px-2.5 py-1 text-xs gap-1.5">
                      {n}
                      <X
                        className="h-3 w-3 cursor-pointer opacity-60 hover:opacity-100"
                        onClick={() => setTopics(topics.filter((x) => x !== n))}
                      />
                    </Badge>
                  ))}
                  {topics.length === 0 && (
                    <span className="text-xs text-muted-foreground italic">
                      No topics added yet.
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder='e.g. "Mechanical Keyboards" or "React JS"'
                    value={currentTopic}
                    onChange={(e) => setCurrentTopic(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddTopic()}
                    className="h-9 text-sm"
                  />
                  <Button
                    variant="secondary"
                    onClick={handleAddTopic}
                    disabled={!currentTopic.trim()}
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
                  label="Search Keywords (SEO)"
                  tooltip="Comma-separated. Influences the tags, titles, and descriptions generated by the AI to maximize click-through rate."
                />
                <Input
                  placeholder="e.g. coding tutorial, fast compile, rust vs c++"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Tone & Voice */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-red-600" />
                Script Template
              </CardTitle>
              <CardDescription>
                Direct the AI on how to structure the pacing and vocabulary of your scripts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-7">
              {/* Pacing slider */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <SectionLabel
                    label="Pacing Speed"
                    tooltip="High retention (fast) creates dense scripts with frequent visual cue changes. Slow creates relaxed, conversational scripts."
                  />
                  <span className={cn(
                    "text-xs font-semibold px-2 py-0.5 rounded-full",
                    professionalism[0] > 70
                      ? "bg-red-500/10 text-red-600"
                      : professionalism[0] < 30
                      ? "bg-blue-500/10 text-blue-600"
                      : "bg-green-500/10 text-green-600"
                  )}>
                    {professionalism[0] > 70 ? "High Retention" : professionalism[0] < 30 ? "Relaxed/Slow" : "Standard pacing"}
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
                  <span>🐢 Casual/Slow</span>
                  <span>🔥 High Retention</span>
                </div>
              </div>

              {/* Voice presets */}
              <div className="space-y-3">
                <SectionLabel
                  label="Direction Style"
                  tooltip="Defines the standard format of your script generation. Tutorials will have step-by-step markers. Essays will have narrative arcs."
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
                          ? "border-red-600 bg-red-600/5 ring-1 ring-red-600"
                          : "border-border hover:border-red-600/40 hover:bg-secondary/40"
                      )}
                    >
                      <span className="text-xl shrink-0 mt-0.5">{v.emoji}</span>
                      <div>
                        <div className="text-sm font-semibold flex items-center gap-2">
                          {v.label}
                          {voicePreset === v.id && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-red-600" />
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
         TAB 2: PUBLISHING
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "schedule" && (
        <div className="grid lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-2 duration-300">
          {/* Posting Frequency */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-red-600" />
                Upload Consistency
              </CardTitle>
              <CardDescription>
                How often AI Canvas should generate new video drafts.
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
                      ? "border-red-600 bg-red-600/5 ring-1 ring-red-600"
                      : "border-border hover:border-red-600/40 hover:bg-secondary/30"
                  )}
                >
                  <span className="text-xl shrink-0">{opt.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{opt.label}</div>
                    <div className="text-xs text-muted-foreground">{opt.sublabel}</div>
                  </div>
                  <div className={cn(
                    "h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center",
                    frequency === opt.id ? "border-red-600 bg-red-600" : "border-border"
                  )}>
                    {frequency === opt.id && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Automation & Approval */}
          <div className="space-y-4">
            {/* Auto-Pilot */}
            <Card className={cn(autoPostEnabled && "border-amber-500/30 bg-amber-500/5")}>
              <CardContent className="pt-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <SectionLabel
                      label="Automated Uploading"
                      badge="API Only"
                      tooltip="When ON, approved videos are uploaded automatically via YouTube Data API to the schedule programmed below."
                    />
                    <p className="text-xs text-muted-foreground">
                      {autoPostEnabled
                        ? "✅ Videos will be pushed directly to your channel."
                        : "Only generating scripts. You must create & upload manually."}
                    </p>
                  </div>
                  <Switch checked={autoPostEnabled} onCheckedChange={setAutoPostEnabled} />
                </div>

                {autoPostEnabled && (
                  <div className="space-y-3 pt-1 border-t border-amber-500/20">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Preferred Publish Hour</Label>
                      <Input
                        type="time"
                        value={preferredTime}
                        onChange={(e) => setPreferredTime(e.target.value)}
                        className="h-9 text-sm"
                        disabled={smartScheduling}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                        Timezone
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
                      tooltip="Force all AI script drafts or finished videos to halt in the Review Queue. Required for YouTube since video assets need assembly."
                    />
                    <p className="text-xs text-muted-foreground">
                      <span className="text-green-600">🛡 Safest</span> — you have final cut.
                    </p>
                  </div>
                  <Switch checked={requireApproval} onCheckedChange={setRequireApproval} disabled={true} />
                </div>
              </CardContent>
            </Card>

            {/* Summary card */}
            <Card className="bg-secondary/20 border-dashed">
              <CardContent className="pt-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <PlaySquare className="h-3.5 w-3.5 opacity-50 text-red-600" /> Channel Config Recap
                </p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Video Target</span>
                    <span className="font-medium capitalize">{format}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frequency</span>
                    <span className="font-medium capitalize">{frequency.replace("_", " ")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Auto-upload</span>
                    <span className={cn("font-medium", autoPostEnabled ? "text-amber-600" : "text-muted-foreground")}>
                      {autoPostEnabled ? "On" : "Off"}
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
          Changes apply to all future AI-generated scripts and videos.
        </p>
        <div className="flex gap-3 ml-auto">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Discard
          </Button>
          <Button onClick={handleSave} disabled={saving} className="min-w-[120px] bg-red-600 hover:bg-red-700 text-white border-0">
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
