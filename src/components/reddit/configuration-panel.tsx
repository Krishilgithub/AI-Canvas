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
  Target, Clock, Info, Zap, Brain, MessageSquare
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Connection {
  platform: string;
  username?: string;
  user_id?: string;
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

// ─── Reddit SVG icon ──────────────────────────────────────────────────────────
function RedditIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="currentColor">
      <path d="M20 10c0-5.523-4.477-10-10-10S0 4.477 0 10c0 5.522 4.477 10 10 10s10-4.478 10-10zm-11.25-1.25a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0zm5 0a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0zm-2.497 4.166c-.92.921-2.586.921-3.506 0a.625.625 0 0 0-.884.884c1.364 1.363 3.91 1.363 5.274 0a.625.625 0 0 0-.884-.884zM17.5 10a1.25 1.25 0 0 0-2.09-.932C14.236 8.42 12.69 8 11 8l.75-3.5 2.452.506a1.25 1.25 0 1 0 .13-.618L11.616 3.9a.625.625 0 0 0-.741.457L10 8c-1.687 0-3.236.42-4.41 1.068A1.25 1.25 0 1 0 3.5 10a1.246 1.246 0 0 0 .54 1.026C4.012 12.8 6.805 14 10 14s5.988-1.2 5.96-2.974A1.246 1.246 0 0 0 17.5 10z" />
    </svg>
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
  const [subreddits, setSubreddits] = useState<string[]>([]);
  const [keywords, setKeywords] = useState("");
  const [currentSubreddit, setCurrentSubreddit] = useState("");

  // ── Tone ──
  const [professionalism, setProfessionalism] = useState([50]);
  const [voicePreset, setVoicePreset] = useState("storyteller");

  // ── Schedule & Automation ──
  const [frequency, setFrequency] = useState("daily");
  const [autoReply, setAutoReply] = useState(false);
  const [requireApproval, setRequireApproval] = useState(true);
  const [minKarmaThreshold] = useState(10);

  // ── Load existing config ──
  useEffect(() => {
    Promise.all([
      fetcher("/connections"),
      fetcher("/config?platform=reddit").catch(() => null),
    ]).then(([conns, config]) => {
      const lnk = Array.isArray(conns)
        ? conns.find((c: Connection) => c.platform === "reddit")
        : null;
      setConnection(lnk || null);

      if (config) {
        setSubreddits(config.subreddits || []);
        setKeywords(
          Array.isArray(config.keywords)
            ? config.keywords.join(", ")
            : config.keywords || ""
        );
        if (config.tone_profile) {
          setProfessionalism([config.tone_profile.professionalism ?? 50]);
          setVoicePreset(config.tone_profile.voice || "storyteller");
        }
        
        const cron = config.schedule_cron;
        if (cron === "0 9,17 * * 1-5") setFrequency("twice_daily");
        else if (cron === "0 9 * * 1-5") setFrequency("daily");
        else setFrequency("custom");

        setAutoReply(config.auto_reply ?? false);
        setRequireApproval(config.require_approval ?? true);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleAddSubreddit = () => {
    let sub = currentSubreddit.trim();
    if (!sub) return;
    if (sub.startsWith("r/")) sub = sub.substring(2);
    if (!subreddits.includes(sub)) setSubreddits([...subreddits, sub]);
    setCurrentSubreddit("");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const cronMap: Record<string, string> = { 
        daily: "0 9 * * 1-5", 
        twice_daily: "0 9,17 * * 1-5", 
        custom: "0 9 * * 1-5" 
      };
      
      await poster("/automation/config?platform=reddit", {
        subreddits,
        keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
        tone_profile: { professionalism: professionalism[0], voice: voicePreset },
        schedule_cron: cronMap[frequency],
        auto_reply: autoReply,
        min_karma_threshold: minKarmaThreshold,
        require_approval: requireApproval,
      });
      toast.success("Reddit configuration saved!");
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

  const vibeLabel = professionalism[0] < 30 ? "😂 Casual / Meme" : professionalism[0] > 70 ? "🎓 Formal" : "🤝 Helpful & Balanced";
  const vibeColor = professionalism[0] < 30 ? "bg-orange-500/10 text-orange-600" : professionalism[0] > 70 ? "bg-blue-500/10 text-blue-600" : "bg-green-500/10 text-green-600";

  const VOICE_PRESETS = [
    { id: "storyteller", emoji: "📖", label: "Storyteller", desc: "Narrative-driven, personal. Redditors respond well to genuine stories." },
    { id: "thought_leader", emoji: "🧠", label: "Thought Leader", desc: "Bold insights and takes. Good for r/entrepreneur and r/technology." },
    { id: "analyst", emoji: "📊", label: "Analyst", desc: "Data-first, structured posts with references. Highest karma in technical subs." },
    { id: "contrarian", emoji: "🔥", label: "Contrarian", desc: "Challenges consensus. High risk/reward — use with 'Require Approval' ON." },
  ];

  const FREQ_OPTIONS = [
    { id: "daily", label: "Once daily", sublabel: "9:00 AM weekdays", icon: "📅" },
    { id: "twice_daily", label: "Twice daily", sublabel: "9:00 AM & 5:00 PM", icon: "⚡" },
    { id: "custom", label: "Custom / Manual", sublabel: "You control when to post", icon: "🎛" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto pb-20">
      {/* ── Connection header ──────────────────────────────────────────── */}
      <div className="bg-card border rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-11 w-11 bg-[#FF4500]/10 flex items-center justify-center rounded-full text-[#FF4500] shrink-0">
            <RedditIcon className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">Reddit Integration</h2>
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
                ? `Connected profile: u/${connection.username || connection.user_id?.substring(0, 10)}`
                : "Not connected. Go to Integrations to connect Reddit."}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/integrations")}
          className={!connection ? "border-[#FF4500] text-[#FF4500] hover:bg-[#FF4500]/5" : ""}
        >
          {connection ? "Manage Connection" : "Connect Account"}
        </Button>
      </div>

      {/* ── Tab switcher ───────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-secondary/30 p-1 rounded-xl border border-border w-fit">
        {[
          { id: "content", label: "Community Rules", icon: Target, desc: "Format, topics, tone" },
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
          {/* Target Communities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-4 w-4 text-[#FF4500]" />
                Target Communities
              </CardTitle>
              <CardDescription>
                The subreddits AI Canvas monitors for trends and posts into.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <SectionLabel
                  label="Monitored Subreddits"
                  tooltip="AI Canvas scans these subreddits for Hot and Rising posts matching your keywords."
                />
                <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                  {subreddits.map((sub) => (
                    <Badge key={sub} variant="secondary" className="px-2.5 py-1 text-xs gap-1.5 bg-[#FF4500]/10 text-[#FF4500] border border-[#FF4500]/20">
                      r/{sub}
                      <X
                        className="h-3 w-3 cursor-pointer opacity-60 hover:opacity-100"
                        onClick={() => setSubreddits(subreddits.filter((x) => x !== sub))}
                      />
                    </Badge>
                  ))}
                  {subreddits.length === 0 && (
                    <span className="text-xs text-muted-foreground italic">
                      No subreddits yet — add at least one to enable scanning.
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-medium">r/</span>
                    <Input
                      className="pl-7 h-9 text-sm"
                      placeholder="saas"
                      value={currentSubreddit}
                      onChange={(e) => setCurrentSubreddit(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddSubreddit()}
                    />
                  </div>
                  <Button
                    variant="secondary"
                    onClick={handleAddSubreddit}
                    disabled={!currentSubreddit.trim()}
                    size="sm"
                    className="shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">You can type with or without the r/ prefix.</p>
              </div>

              <div className="space-y-2">
                <SectionLabel
                  label="Monitoring Keywords"
                  tooltip="AI will look for these keywords in post titles and comments. Comma-separated."
                />
                <Input
                  placeholder="SaaS, AI Agents, Startup, Launch"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Tone & Etiquette */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-[#FF4500]" />
                Tone & Etiquette
              </CardTitle>
              <CardDescription>
                Reddit has a unique culture — ensure your AI matches it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-7">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <SectionLabel
                    label="Formality Level"
                    tooltip="Reddit audiences vary widely. Casual/Meme works for gaming. Helpful/Balanced for entrepreneur/saas."
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
                  <span>😂 Casual/Meme</span>
                  <span>🎓 Formal</span>
                </div>
              </div>

              <div className="space-y-3">
                <SectionLabel
                  label="Post Style"
                  tooltip="Defines standard structure of generated drafts."
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
                          ? "border-[#FF4500] bg-[#FF4500]/5 ring-1 ring-[#FF4500]"
                          : "border-border hover:border-[#FF4500]/40 hover:bg-secondary/40"
                      )}
                    >
                      <span className="text-xl shrink-0 mt-0.5">{v.emoji}</span>
                      <div>
                        <div className="text-sm font-semibold flex items-center gap-2">
                          {v.label}
                          {voicePreset === v.id && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-[#FF4500]" />
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
                <Clock className="h-4 w-4 text-[#FF4500]" />
                Posting Frequency
              </CardTitle>
              <CardDescription>
                Reddit penalizes over-posting. 1-2 quality posts/day is optimal.
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
                      ? "border-[#FF4500] bg-[#FF4500]/5 ring-1 ring-[#FF4500]"
                      : "border-border hover:border-[#FF4500]/40 hover:bg-secondary/30"
                  )}
                >
                  <span className="text-xl shrink-0">{opt.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{opt.label}</div>
                    <div className="text-xs text-muted-foreground">{opt.sublabel}</div>
                  </div>
                  <div className={cn(
                    "h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center",
                    frequency === opt.id ? "border-[#FF4500] bg-[#FF4500]" : "border-border"
                  )}>
                    {frequency === opt.id && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>
                </button>
              ))}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mt-2">
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Reddit communities have strict spam rules. Frequent posting triggers shadow-bans.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Automation & Approval */}
          <div className="space-y-4">
            {/* Auto-Reply */}
            <Card className={cn(autoReply && "border-[#FF4500]/30 bg-[#FF4500]/5")}>
              <CardContent className="pt-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <SectionLabel
                      label="Auto-Reply to Comments"
                      badge="AI"
                      tooltip="When ON, AI monitors comment threads on your posts and generates replies."
                    />
                    <p className="text-xs text-muted-foreground">
                      {autoReply
                        ? "AI will monitor and reply to comments."
                        : "Manual replies only."}
                    </p>
                  </div>
                  <Switch checked={autoReply} onCheckedChange={setAutoReply} />
                </div>
                {autoReply && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-[#FF4500]/10 border border-[#FF4500]/20 mt-4">
                    <MessageSquare className="h-4 w-4 text-[#FF4500] shrink-0 mt-0.5" />
                    <p className="text-xs text-[#FF4500]/80">
                      Recommendation: Keep &quot;Require Approval&quot; ON. Reddit users are sensitive to bots.
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
                      label="Require Human Approval"
                      tooltip="Every generated post or reply goes to Review Queue before posting."
                    />
                    <p className="text-xs text-muted-foreground">
                      {requireApproval ? "🛡 All drafts reviewed first." : "⚠️ Drafts post instantly."}
                    </p>
                  </div>
                  <Switch checked={requireApproval} onCheckedChange={setRequireApproval} />
                </div>
                {!requireApproval && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-600 dark:text-red-400">
                      Without approval, a poorly-formatted post can result in an instant ban. Avoid this.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Min Karma - Coming soon */}
            <Card className="opacity-60 border-dashed">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <SectionLabel label="Min. Karma Threshold" badge="Soon" />
                    <p className="text-xs text-muted-foreground">Only post to threads where OP meets a minimum karma threshold.</p>
                  </div>
                  <Input type="number" className="w-20 h-8" disabled value={10} />
                </div>
              </CardContent>
            </Card>
            
            {/* Summary card */}
            <Card className="bg-secondary/20 border-dashed">
              <CardContent className="pt-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 opacity-50 text-[#FF4500]" /> Config Recap
                </p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subreddits</span>
                    <span className="font-medium truncate max-w-[150px]">{subreddits.length ? subreddits.map(s => `r/${s}`).join(", ") : "None"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frequency</span>
                    <span className="font-medium capitalize">{FREQ_OPTIONS.find(f => f.id === frequency)?.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Auto-reply</span>
                    <span className={cn("font-medium", autoReply ? "text-[#FF4500]" : "text-muted-foreground")}>
                      {autoReply ? "On" : "Off"}
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
          Changes apply to all future Reddit automation.
        </p>
        <div className="flex gap-3 ml-auto">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Discard
          </Button>
          <Button onClick={handleSave} disabled={saving} className="min-w-[120px] bg-[#FF4500] hover:bg-[#e03d00] text-white border-0">
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
