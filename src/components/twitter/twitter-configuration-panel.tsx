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
  Target, Clock, Info, Zap, Brain, Sparkles, Hash
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Connection {
  platform: string;
  platform_username?: string;
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

// ─── Twitter SVG icon ────────────────────────────────────────────────────────
function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.845L1.254 2.25H8.08l4.258 5.627 5.906-5.627zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export function TwitterConfigurationPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"content" | "schedule">("content");
  const [connection, setConnection] = useState<Connection | null>(null);

  // ── Content Strategy ──
  const [niches, setNiches] = useState<string[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [currentNiche, setCurrentNiche] = useState("");
  const [currentHashtag, setCurrentHashtag] = useState("");

  // ── Tone ──
  const [professionalism, setProfessionalism] = useState([50]);
  const [voicePreset, setVoicePreset] = useState("tech_twitter");
  const [threadMode, setThreadMode] = useState(false);

  // ── Schedule & Automation ──
  const [frequency, setFrequency] = useState("3x_daily");
  const [smartScheduling, setSmartScheduling] = useState(true);
  const [requireApproval, setRequireApproval] = useState(true);

  // ── Load existing config ──
  useEffect(() => {
    Promise.all([
      fetcher("/connections"),
      fetcher("/config?platform=twitter").catch(() => null),
    ]).then(([conns, config]) => {
      const lnk = Array.isArray(conns)
        ? conns.find((c: Connection) => c.platform === "twitter")
        : null;
      setConnection(lnk || null);

      if (config) {
        setNiches(config.niches || []);
        setHashtags(config.keywords || []);
        if (config.tone_profile) {
          setProfessionalism([config.tone_profile.professionalism ?? 50]);
          setVoicePreset(config.tone_profile.voice || "tech_twitter");
          setThreadMode(config.tone_profile.thread_mode || false);
        }
        
        const cron = config.schedule_cron;
        if (cron === "0 9 * * *") setFrequency("daily");
        else if (cron === "0 9,12,15,18 * * *") setFrequency("4x_daily");
        else if (cron === "0 */4 * * *") setFrequency("6x_daily");
        else setFrequency("3x_daily");

        setSmartScheduling(config.smart_scheduling ?? true);
        setRequireApproval(config.require_approval ?? true);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleAddNiche = () => {
    const t = currentNiche.trim();
    if (t && !niches.includes(t)) { setNiches([...niches, t]); setCurrentNiche(""); }
  };

  const handleAddHashtag = () => {
    let tag = currentHashtag.trim();
    if (!tag) return;
    if (!tag.startsWith("#")) tag = "#" + tag;
    if (!hashtags.includes(tag)) { setHashtags([...hashtags, tag]); setCurrentHashtag(""); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const cronMap: Record<string, string> = { 
        daily: "0 9 * * *", 
        "3x_daily": "0 9,13,17 * * *", 
        "4x_daily": "0 9,12,15,18 * * *", 
        "6x_daily": "0 */4 * * *" 
      };
      
      await poster("/automation/config", {
        platform: "twitter",
        niches,
        keywords: hashtags,
        tone_profile: { professionalism: professionalism[0], voice: voicePreset, thread_mode: threadMode },
        schedule_cron: cronMap[frequency] || "0 9,13,17 * * *",
        smart_scheduling: smartScheduling,
        require_approval: requireApproval,
      });
      toast.success("Twitter configuration saved!");
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

  const vibeLabel = professionalism[0] < 30 ? "🔥 Unfiltered" : professionalism[0] > 70 ? "🧠 Thought Leader" : "💻 Casual Tech";
  const vibeColor = professionalism[0] < 30 ? "bg-red-500/10 text-red-500" : professionalism[0] > 70 ? "bg-blue-500/10 text-blue-600" : "bg-sky-500/10 text-sky-600";

  const VOICE_PRESETS = [
    { id: "tech_twitter", emoji: "💻", label: "Tech Twitter", desc: "Fast-paced, opinionated takes. Short punchy threads." },
    { id: "meme_heavy", emoji: "😂", label: "Meme-Heavy", desc: "Humor-first, viral-oriented. References internet culture." },
    { id: "thread_writer", emoji: "🧵", label: "Thread Writer", desc: "Long-form threads breaking complex ideas into steps." },
    { id: "news_breaker", emoji: "📰", label: "News Breaker", desc: "Fast industry news reactions. Concise, high-signal." },
  ];

  const FREQ_OPTIONS = [
    { id: "daily",    label: "Once daily",    sublabel: "9:00 AM",                   icon: "📅", tweets: "~30/mo"  },
    { id: "3x_daily", label: "3× daily",      sublabel: "9AM · 1PM · 5PM",           icon: "⚡", tweets: "~90/mo"  },
    { id: "4x_daily", label: "4× daily",      sublabel: "9AM · 12 · 3PM · 6PM",      icon: "🔥", tweets: "~120/mo" },
    { id: "6x_daily", label: "Every 4 hours", sublabel: "Max velocity",               icon: "🚀", tweets: "~180/mo" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto pb-20">
      {/* ── Connection header ──────────────────────────────────────────── */}
      <div className="bg-card border rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-11 w-11 bg-sky-500/10 flex items-center justify-center rounded-full text-sky-500 shrink-0">
            <TwitterIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">X / Twitter Integration</h2>
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
                ? `Connected profile: @${connection.platform_username || "user"}`
                : "Not connected. Go to Integrations to connect X."}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/integrations")}
          className={!connection ? "border-sky-500 text-sky-500 hover:bg-sky-500/5" : ""}
        >
          {connection ? "Manage Connection" : "Connect Account"}
        </Button>
      </div>

      {/* ── Tab switcher ───────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-secondary/30 p-1 rounded-xl border border-border w-fit">
        {[
          { id: "content", label: "Content Strategy", icon: Target, desc: "Format, topics, tone" },
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
          {/* Target Niches */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-4 w-4 text-sky-500" />
                Audience Niches
              </CardTitle>
              <CardDescription>
                Combine niche & adjacent topics for maximum reach.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <SectionLabel
                  label="Core Topics"
                  tooltip="The AI focuses trend detection on these to formulate relevant tweets."
                />
                <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                  {niches.map((n) => (
                    <Badge key={n} variant="secondary" className="px-2.5 py-1 text-xs gap-1.5 bg-sky-500/10 text-sky-600 border-sky-500/20">
                      {n}
                      <X
                        className="h-3 w-3 cursor-pointer opacity-60 hover:opacity-100"
                        onClick={() => setNiches(niches.filter((x) => x !== n))}
                      />
                    </Badge>
                  ))}
                  {niches.length === 0 && (
                    <span className="text-xs text-muted-foreground italic">
                      No topics added yet.
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    className="h-9 text-sm"
                    placeholder='"AI Tools" or "Indie Hacking"'
                    value={currentNiche}
                    onChange={(e) => setCurrentNiche(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddNiche()}
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

              <div className="space-y-3">
                <SectionLabel
                  label="Auto-Appended Hashtags"
                  tooltip="Intelligently rotated — the AI picks 1-3 contextually relevant tags per tweet."
                />
                <div className="flex flex-wrap gap-1.5 min-h-[24px]">
                  {hashtags.map((t) => (
                    <Badge key={t} variant="outline" className="text-sky-500 border-sky-200 gap-1 text-xs">
                      {t}
                      <X
                        className="h-3 w-3 cursor-pointer opacity-60 hover:text-destructive hover:opacity-100"
                        onClick={() => setHashtags(hashtags.filter((x) => x !== t))}
                      />
                    </Badge>
                  ))}
                  {hashtags.length === 0 && (
                    <span className="text-xs text-muted-foreground italic">
                      No hashtags yet.
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Hash className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      className="pl-7 h-9 text-sm"
                      placeholder="buildinpublic"
                      value={currentHashtag}
                      onChange={(e) => setCurrentHashtag(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddHashtag()}
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={handleAddHashtag} disabled={!currentHashtag.trim()} className="shrink-0">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tone & Style */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-sky-500" />
                Tone & Voice
              </CardTitle>
              <CardDescription>
                Define your Twitter persona and writing style.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-7">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <SectionLabel
                    label="Vibe Check"
                    tooltip="Controls how casual or polished the AI writes."
                  />
                  <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", vibeColor)}>
                    {vibeLabel}
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
                  <span>🔥 Unfiltered</span>
                  <span>🏛 Formal</span>
                </div>
              </div>

              <div className="space-y-3">
                <SectionLabel
                  label="Voice Preset"
                  tooltip="Sets the structural output to best reflect these successful X personas."
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
                          ? "border-sky-500 bg-sky-500/5 ring-1 ring-sky-500"
                          : "border-border hover:border-sky-500/40 hover:bg-secondary/40"
                      )}
                    >
                      <span className="text-xl shrink-0 mt-0.5">{v.emoji}</span>
                      <div>
                        <div className="text-sm font-semibold flex items-center gap-2">
                          {v.label}
                          {voicePreset === v.id && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-sky-500" />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{v.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className={cn("flex items-start justify-between gap-4 p-4 rounded-xl border transition-all", threadMode ? "border-sky-500/30 bg-sky-500/5" : "border-border")}>
                <div className="space-y-1">
                  <SectionLabel label="Thread Mode" badge="Smart" tooltip="When ON, AI auto-converts long content into numbered tweet threads." />
                  <p className="text-xs text-muted-foreground">{threadMode ? "Long content auto-splits into numbered threads." : "Single tweets only (max 280 chars)."}</p>
                </div>
                <Switch checked={threadMode} onCheckedChange={setThreadMode} />
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
                <Clock className="h-4 w-4 text-sky-500" />
                Tweet Volumes
              </CardTitle>
              <CardDescription>
                X rewards volume — higher frequency means more impressions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {FREQ_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFrequency(opt.id)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-200",
                    frequency === opt.id
                      ? "border-sky-500 bg-sky-500/5 ring-1 ring-sky-500"
                      : "border-border hover:border-sky-500/40 hover:bg-secondary/30"
                  )}
                >
                  <span className="text-xl shrink-0">{opt.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{opt.label}</div>
                    <div className="text-xs text-muted-foreground">{opt.sublabel}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-mono text-muted-foreground">{opt.tweets}</div>
                    <div className={cn(
                      "h-4 w-4 rounded-full border-2 flex items-center justify-center mt-1 ml-auto",
                      frequency === opt.id ? "border-sky-500 bg-sky-500" : "border-border"
                    )}>
                      {frequency === opt.id && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Automation & Approval */}
          <div className="space-y-4">
            
            {/* Smart Timing */}
            <Card className={cn(smartScheduling && "border-sky-500/30 bg-sky-500/5")}>
              <CardContent className="pt-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <SectionLabel
                      label="Smart Timing"
                      badge="AI"
                      tooltip="Analyzes follower activity patterns to post within each slot when engagement is highest."
                    />
                    <p className="text-xs text-muted-foreground">{smartScheduling ? "Timed dynamically to peak activity windows." : "Fixed static scheduling."}</p>
                  </div>
                  <Switch checked={smartScheduling} onCheckedChange={setSmartScheduling} />
                </div>
                {smartScheduling && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-sky-500/10 border border-sky-500/20 mt-4">
                    <Sparkles className="h-4 w-4 text-sky-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-sky-600 dark:text-sky-400">
                      AI dynamically picks the best minute within each slot based on past engagement data.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Requires Approval */}
            <Card>
              <CardContent className="pt-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <SectionLabel
                      label="Require Approval"
                      tooltip="Highly Recommended: Keep ON until you trust the AI output."
                    />
                    <p className="text-xs text-muted-foreground">
                      {requireApproval ? "🛡 Every draft goes to Review Queue." : "⚠️ Drafts are posted automatically."}
                    </p>
                  </div>
                  <Switch checked={requireApproval} onCheckedChange={setRequireApproval} />
                </div>
                {!requireApproval && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Without approval, tweets post instantly. Limit usage to highly-targeted campaigns.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Summary card */}
            <Card className="bg-secondary/20 border-dashed">
              <CardContent className="pt-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 opacity-50 text-sky-500" /> Automation Config
                </p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frequency</span>
                    <span className="font-medium capitalize">{FREQ_OPTIONS.find(f => f.id === frequency)?.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Thread Mode</span>
                    <span className={cn("font-medium", threadMode ? "text-sky-500" : "text-muted-foreground")}>
                      {threadMode ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Approval</span>
                    <span className={cn("font-medium", requireApproval ? "text-green-600" : "text-amber-500")}>
                      {requireApproval ? "Required" : "Off"}
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
          Changes apply to all future AI-generated tweets.
        </p>
        <div className="flex gap-3 ml-auto">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Discard
          </Button>
          <Button onClick={handleSave} disabled={saving} className="min-w-[120px] bg-sky-500 hover:bg-sky-600 text-white border-0">
            {saving ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</>
            ) : (
              "Save Settings"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
