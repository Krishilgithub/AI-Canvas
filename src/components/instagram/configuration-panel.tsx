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
  X, Plus, CheckCircle2, Loader2,
  Target, Clock, Info, Zap, Sparkles, Instagram,
  Palette, MessageCircle, Heart, ShieldAlert
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

// ─── Main component ──────────────────────────────────────────────────────────
export function ConfigurationPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"content" | "schedule">("content");
  const [connection, setConnection] = useState<Connection | null>(null);

  // ── Content Strategy ──
  const [niche, setNiche] = useState("");
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [currentCompetitor, setCurrentCompetitor] = useState("");

  const [aesthetic, setAesthetic] = useState("minimalist");
  const [primaryColor, setPrimaryColor] = useState("#000000");

  // ── Schedule & Automation ──
  const [postsPerWeek, setPostsPerWeek] = useState(3);
  const [autoLike, setAutoLike] = useState(false);
  const [autoDm, setAutoDm] = useState(false);

  // ── Load existing config ──
  useEffect(() => {
    Promise.all([
      fetcher("/connections"),
      fetcher("/config?platform=instagram").catch(() => null),
    ]).then(([conns, config]) => {
      const lnk = Array.isArray(conns)
        ? conns.find((c: Connection) => c.platform === "instagram")
        : null;
      setConnection(lnk || null);

      if (config) {
        setNiche(config.niche || "");
        setCompetitors(config.competitors || []);
        if (config.visual_identity) {
          setAesthetic(config.visual_identity.preset || "minimalist");
          setPrimaryColor(config.visual_identity.primary_color || "#000000");
        }
        setPostsPerWeek(config.posts_per_week || 3);
        setAutoLike(config.auto_like ?? false);
        setAutoDm(config.auto_dm ?? false);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleAddCompetitor = () => {
    let handle = currentCompetitor.trim();
    if (!handle) return;
    if (handle.startsWith("@")) handle = handle.substring(1);
    if (!competitors.includes(handle)) setCompetitors([...competitors, handle]);
    setCurrentCompetitor("");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await poster("/automation/config?platform=instagram", {
        niche,
        competitors,
        visual_identity: { preset: aesthetic, primary_color: primaryColor },
        posts_per_week: postsPerWeek,
        auto_like: autoLike,
        auto_dm: autoDm,
      });
      toast.success("Instagram configuration saved!");
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto pb-20">
      {/* ── Connection header ──────────────────────────────────────────── */}
      <div className="bg-card border rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-11 w-11 bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center rounded-full text-white shrink-0">
            <Instagram className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">Instagram Integration</h2>
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
                ? `Connected profile: @${connection.username || connection.user_id?.substring(0, 10)}`
                : "Not connected. Go to Integrations to connect Instagram."}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/integrations")}
          className={!connection ? "border-pink-500 text-pink-600 hover:bg-pink-500/5" : ""}
        >
          {connection ? "Manage Connection" : "Connect Account"}
        </Button>
      </div>

      {/* ── Tab switcher ───────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-secondary/30 p-1 rounded-xl border border-border w-fit">
        {[
          { id: "content", label: "Visual Strategy", icon: Target },
          { id: "schedule", label: "Automation", icon: Clock },
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
          {/* Target Audience & Competitors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-4 w-4 text-pink-500" />
                Audience & Competitors
              </CardTitle>
              <CardDescription>
                Define the niche and accounts you want to track.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <SectionLabel
                  label="Target Niche"
                  tooltip="E.g., Figma Design, AI Startups. It focuses the AI analysis."
                />
                <Input
                  className="h-9 text-sm"
                  placeholder="e.g. Fitness Coaching, SaaS Marketing"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <SectionLabel
                  label="Competitor Monitoring"
                  tooltip="Accounts you want the AI to learn styles from."
                />
                <div className="flex flex-wrap gap-1.5 min-h-[24px]">
                  {competitors.map((comp) => (
                    <Badge key={comp} variant="secondary" className="px-2.5 py-1 text-xs gap-1.5 bg-pink-500/10 text-pink-600 border-pink-500/20">
                      @{comp}
                      <X
                        className="h-3 w-3 cursor-pointer opacity-60 hover:opacity-100"
                        onClick={() => setCompetitors(competitors.filter((x) => x !== comp))}
                      />
                    </Badge>
                  ))}
                  {competitors.length === 0 && (
                    <span className="text-xs text-muted-foreground italic">
                      No competitors tracking yet.
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-medium">@</span>
                    <Input
                      className="pl-7 h-9 text-sm"
                      placeholder="competitor_handle"
                      value={currentCompetitor}
                      onChange={(e) => setCurrentCompetitor(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddCompetitor()}
                    />
                  </div>
                  <Button
                    variant="secondary"
                    onClick={handleAddCompetitor}
                    disabled={!currentCompetitor.trim()}
                    size="sm"
                    className="shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Visual Identity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-pink-500" />
                Visual Identity
              </CardTitle>
              <CardDescription>
                Define the aesthetic of your carousel covers and assets.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-7">
              <div className="space-y-4">
                <SectionLabel
                  label="Aesthetic Preset"
                  tooltip="Defines the overall contrast, fonts, and vibe of Image generation."
                />
                <div className="grid grid-cols-2 gap-3">
                  {["minimalist", "vibrant", "dark_mode", "pastel"].map((style) => (
                    <div
                      key={style}
                      onClick={() => setAesthetic(style)}
                      className={cn(
                        "cursor-pointer border rounded-xl p-3 text-center transition-all duration-200",
                        aesthetic === style
                          ? "ring-1 ring-pink-500 bg-pink-500/5 border-pink-500/50"
                          : "hover:bg-secondary border-border"
                      )}
                    >
                      <Palette className={cn("h-5 w-5 mx-auto mb-2", aesthetic === style ? "text-pink-500" : "text-muted-foreground")} />
                      <span className="text-sm font-medium capitalize">{style.replace("_", " ")}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <SectionLabel label="Brand Color (Hex)" />
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-full border shadow-inner ring-1 ring-border"
                    style={{ backgroundColor: primaryColor || "#000000" }}
                  />
                  <Input
                    className="h-9 font-mono text-sm max-w-[120px]"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#ec4899"
                  />
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
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-pink-500" />
                  Frequency Goal
                </CardTitle>
                <CardDescription>
                  How many times per week should the AI prepare drafts?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>Weekly Target</Label>
                    <span className="text-xl font-bold text-pink-500 tabular-nums">
                      {postsPerWeek} <span className="text-xs font-normal text-muted-foreground">posts</span>
                    </span>
                  </div>
                  <Slider
                    value={[postsPerWeek]}
                    onValueChange={(val) => setPostsPerWeek(val[0])}
                    min={1}
                    max={14}
                    step={1}
                    className="py-1"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground px-0.5 mt-1">
                    <span>1 (Relaxed)</span>
                    <span>14 (Aggressive)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-secondary/20 border-dashed">
              <CardContent className="pt-5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 opacity-50 text-pink-500" /> Execution Summary
                </p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Niche</span>
                    <span className="font-medium truncate max-w-[150px]">{niche || "Not set"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Posts</span>
                    <span className="font-medium">{postsPerWeek} per week</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Auto-DM</span>
                    <span className={cn("font-medium", autoDm ? "text-pink-600" : "text-muted-foreground")}>
                      {autoDm ? "Active" : "Off"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Automation & Engagement */}
          <div className="space-y-4">
            <Card className={cn(autoLike && "border-pink-500/30 bg-pink-500/5")}>
              <CardContent className="pt-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <SectionLabel
                      label="Auto-Like & Engage"
                      badge="Growth"
                      tooltip="AI logs in and likes/comments on posts within your niche hashtags to raise your profile visibility."
                    />
                    <p className="text-xs text-muted-foreground">
                      {autoLike
                        ? "AI is actively engaging with competitors."
                        : "Passive mode. No auto-liking."}
                    </p>
                  </div>
                  <Switch checked={autoLike} onCheckedChange={setAutoLike} />
                </div>
                {autoLike && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-pink-500/10 border border-pink-500/20 mt-4">
                    <Heart className="h-4 w-4 text-pink-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-pink-600 dark:text-pink-400">
                      Engaging actively builds your audience, but monitor API quotas carefully.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className={cn(autoDm && "border-pink-500/30 bg-pink-500/5")}>
              <CardContent className="pt-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <SectionLabel
                      label="Auto-DM Mentions"
                      tooltip="Automatically send a welcome/thank you DM to users who tag you in their stories."
                    />
                    <p className="text-xs text-muted-foreground">
                      {autoDm ? "DMing users mentioning you." : "Manual replies only."}
                    </p>
                  </div>
                  <Switch checked={autoDm} onCheckedChange={setAutoDm} />
                </div>
                {autoDm && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-pink-500/10 border border-pink-500/20 mt-4">
                    <MessageCircle className="h-4 w-4 text-pink-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-pink-600 dark:text-pink-400">
                      DMs boost algorithm favorability by creating 1:1 interaction records.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card className="opacity-60 border-dashed">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <SectionLabel label="Story Generation" badge="Soon" />
                    <p className="text-xs text-muted-foreground">Auto-generate ephemeral stories from posts.</p>
                  </div>
                  <Switch disabled />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── Sticky Save bar ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 sticky bottom-6 bg-background/80 backdrop-blur-sm border border-border rounded-xl px-5 py-3 shadow-lg">
        <p className="text-xs text-muted-foreground hidden sm:block">
          Settings apply to all new scheduled Instagram content.
        </p>
        <div className="flex gap-3 ml-auto">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Discard
          </Button>
          <Button onClick={handleSave} disabled={saving} className="min-w-[120px] bg-gradient-to-r from-pink-500 to-rose-500 hover:opacity-90 text-white border-0">
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
