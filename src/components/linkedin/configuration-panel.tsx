"use client";
// Force rebuild to resolve new components
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetcher, poster } from "@/lib/api-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { X, Plus, AlertCircle, CheckCircle2 } from "lucide-react";

export function ConfigurationPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connection, setConnection] = useState<any>(null);

  // Config State
  const [niches, setNiches] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string>("");
  const [currentNiche, setCurrentNiche] = useState("");

  const [professionalism, setProfessionalism] = useState([75]);
  const [voicePreset, setVoicePreset] = useState("thought_leader");

  const [frequency, setFrequency] = useState("daily"); // mapped to cron
  const [smartScheduling, setSmartScheduling] = useState(true);
  const [requireApproval, setRequireApproval] = useState(true);
  const [autoRetweet, setAutoRetweet] = useState(false);
  
  // Auto-poster fields
  const [autoPostEnabled, setAutoPostEnabled] = useState(false);
  const [preferredTime, setPreferredTime] = useState("14:30");
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");

  useEffect(() => {
    Promise.all([
      fetcher("/connections"),
      fetcher("/config?platform=linkedin").catch(() => null),
    ]).then(([conns, config]) => {
      const lnk = conns.find((c: any) => c.platform === "linkedin");
      setConnection(lnk);

      if (config) {
        setNiches(config.niches || []);
        setKeywords(
          Array.isArray(config.keywords)
            ? config.keywords.join(", ")
            : config.keywords || "",
        );
        if (config.tone_profile) {
          setProfessionalism([config.tone_profile.professionalism || 75]);
          setVoicePreset(config.tone_profile.voice || "thought_leader");
        }
        // Map Cron to Freq (Simple mapping)
        if (config.schedule_cron === "0 9 * * 1-5") setFrequency("daily");
        else if (config.schedule_cron === "0 9,17 * * 1-5")
          setFrequency("twice_daily");
        else setFrequency("custom");

        setSmartScheduling(config.smart_scheduling ?? false);
        setRequireApproval(config.require_approval ?? true);
        setAutoRetweet(config.auto_retweet ?? false);

        if (config.preferred_time) setPreferredTime(config.preferred_time);
        if (config.timezone) setTimezone(config.timezone);
        if (config.frequency) setFrequency(config.frequency);
        setAutoPostEnabled(config.auto_post_enabled ?? false);
      }
      setLoading(false);
    });
  }, []);

  const handleAddNiche = () => {
    if (currentNiche.trim() && !niches.includes(currentNiche.trim())) {
      setNiches([...niches, currentNiche.trim()]);
      setCurrentNiche("");
    }
  };

  const removeNiche = (n: string) => {
    setNiches(niches.filter((x) => x !== n));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let cron = "0 9 * * 1-5";
      if (frequency === "twice_daily") cron = "0 9,17 * * 1-5";
      // Custom would need a cron input, defaulting to daily for now if custom selected without input

      const payload = {
        platform: "linkedin", // Add platform field
        niches,
        keywords: keywords
          .split(",")
          .map((k) => k.trim())
          .filter((k) => k),
        tone_profile: {
          professionalism: professionalism[0],
          voice: voicePreset,
        },
        schedule_cron: cron,
        smart_scheduling: smartScheduling,
        require_approval: requireApproval,
        frequency: frequency === "twice_daily" ? "daily" : frequency,
        preferred_time: preferredTime,
        timezone: timezone,
        auto_post_enabled: autoPostEnabled,
        // auto_retweet removed - it's Twitter-specific, not relevant for LinkedIn
      };

      await poster("/config", payload);
      toast.success("Configuration saved successfully");
    } catch (e) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return <div className="p-10 text-center">Loading configuration...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto pb-20">
      {/* 1. Connection Header */}
      <div className="bg-card border rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-[#0077b5]/10 flex items-center justify-center rounded-full text-[#0077b5]">
            <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24">
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">LinkedIn Integration</h2>
              {connection ? (
                <Badge
                  variant="outline"
                  className="bg-green-500/10 text-green-600 border-green-500/20 gap-1"
                >
                  <CheckCircle2 className="h-3 w-3" /> Active
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  Disconnected
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {connection
                ? `Connected as user_id: ${connection.user_id?.substring(0, 8)}...`
                : "Not connected. Go to Integrations to connect."}
            </p>
          </div>
        </div>
        <div>
          {connection ? (
            <Button
              variant="outline"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => router.push("/integrations")}
            >
              Manage Connection
            </Button>
          ) : (
            <Button onClick={() => router.push("/integrations")}>
              Connect Account
            </Button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 2. Content Strategy */}
        <Card>
          <CardHeader>
            <CardTitle>Content Strategy</CardTitle>
            <CardDescription>
              Define what the AI should talk about.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Core Topics (Niches)</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {niches.map((n) => (
                  <Badge
                    key={n}
                    variant="secondary"
                    className="px-3 py-1 text-sm gap-2"
                  >
                    {n}
                    <X
                      className="h-3 w-3 cursor-pointer opacity-70 hover:opacity-100"
                      onClick={() => removeNiche(n)}
                    />
                  </Badge>
                ))}
                {niches.length === 0 && (
                  <span className="text-sm text-muted-foreground italic">
                    No topics added yet.
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Type a topic (e.g. SaaS Growth)"
                  value={currentNiche}
                  onChange={(e) => setCurrentNiche(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddNiche()}
                />
                <Button
                  variant="secondary"
                  onClick={handleAddNiche}
                  disabled={!currentNiche.trim()}
                >
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Target Audience Keywords</Label>
              <Input
                placeholder="Founders, VCs, Product Managers"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Used to align vocabulary with your reader's expertise level.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 3. Tone & Style */}
        <Card>
          <CardHeader>
            <CardTitle>Tone & Style</CardTitle>
            <CardDescription>
              Control the personality of generated content.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Professionalism</Label>
                <span className="text-xs text-muted-foreground">
                  {professionalism[0] < 30
                    ? "Casual"
                    : professionalism[0] > 70
                      ? "Corporate"
                      : "Balanced"}
                </span>
              </div>
              <Slider
                value={professionalism}
                onValueChange={setProfessionalism}
                max={100}
                step={1}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground px-1">
                <span>Casual & Fun</span>
                <span>Formal</span>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Voice Preset</Label>
              <div className="grid grid-cols-3 gap-2">
                {["thought_leader", "storyteller", "analyst"].map((v) => (
                  <div
                    key={v}
                    className={`border rounded-lg p-3 text-center cursor-pointer transition-all ${voicePreset === v ? "ring-2 ring-primary bg-primary/5 border-primary" : "hover:bg-accent"}`}
                    onClick={() => setVoicePreset(v)}
                  >
                    <div className="font-medium text-sm capitalize">
                      {v.replace("_", " ")}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 rounded-md p-3 flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4" />
              "Avoid emojis" rule is currently active (Global).
            </div>
          </CardContent>
        </Card>

        {/* 4. Schedule & Automation */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Schedule & Automation Rules</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <Label className="text-base">Posting Frequency</Label>
              <div className="space-y-2">
                {[
                  { id: "daily", label: "Once daily" },
                  { id: "alternate_days", label: "Alternate days" },
                  { id: "weekly", label: "Weekly" },
                  { id: "custom", label: "Custom Schedule (Cron)" },
                ].map((opt) => (
                  <div key={opt.id} className="flex items-center space-x-2">
                    <div
                      className={`h-4 w-4 rounded-full border border-primary flex items-center justify-center cursor-pointer ${frequency === opt.id ? "bg-primary" : ""}`}
                      onClick={() => setFrequency(opt.id)}
                    >
                      {frequency === opt.id && (
                        <div className="h-2 w-2 rounded-full bg-background" />
                      )}
                    </div>
                    <span
                      className="text-sm cursor-pointer"
                      onClick={() => setFrequency(opt.id)}
                    >
                      {opt.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-secondary/20 p-4 rounded-lg space-y-2 border">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base flex items-center gap-2">
                      Auto-Pilot Posting{" "}
                      <Badge variant="secondary" className="text-[10px] h-4">
                        AI
                      </Badge>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically schedule and publish your generated posts based on audience peak times.
                    </p>
                  </div>
                  <Switch
                    checked={autoPostEnabled}
                    onCheckedChange={setAutoPostEnabled}
                  />
                </div>
              </div>

              {autoPostEnabled && (
                <div className="bg-card p-4 rounded-lg space-y-4 border mt-2">
                  <div className="space-y-2">
                    <Label>Preferred Posting Time</Label>
                    <Input 
                      type="time" 
                      value={preferredTime} 
                      onChange={(e) => setPreferredTime(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Input 
                      type="text" 
                      value={timezone} 
                      onChange={(e) => setTimezone(e.target.value)} 
                      placeholder="e.g. America/New_York"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <Label>Require Approval</Label>
                  <Switch
                    checked={requireApproval}
                    onCheckedChange={setRequireApproval}
                  />
                </div>
                <div className="flex items-center justify-between opactiy-50">
                  <Label className="text-muted-foreground">
                    Auto-Retweet (Coming Soon)
                  </Label>
                  <Switch
                    disabled
                    checked={autoRetweet}
                    onCheckedChange={setAutoRetweet}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-4 sticky bottom-6">
        <Button variant="outline" onClick={() => window.location.reload()}>
          Discard Changes
        </Button>
        <Button size="lg" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Configuration"}
        </Button>
      </div>
    </div>
  );
}
