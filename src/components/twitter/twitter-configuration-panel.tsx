"use client";

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
import { X, Plus, Twitter, Repeat, CheckCircle2 } from "lucide-react";

export function TwitterConfigurationPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connection, setConnection] = useState<any>(null);

  // Config State
  const [niches, setNiches] = useState<string[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [currentNiche, setCurrentNiche] = useState("");
  const [currentHashtag, setCurrentHashtag] = useState("");

  const [professionalism, setProfessionalism] = useState([50]); // Default slightly more casual for Twitter
  const [voicePreset, setVoicePreset] = useState("tech_twitter");

  const [threadMode, setThreadMode] = useState(false);
  const [frequency, setFrequency] = useState("3x_daily"); // Default higher volume
  const [smartScheduling, setSmartScheduling] = useState(true);
  const [requireApproval, setRequireApproval] = useState(true);
  const [autoRetweet, setAutoRetweet] = useState(false);

  useEffect(() => {
    Promise.all([
      fetcher("/connections"),
      fetcher("/config?platform=twitter").catch(() => null),
    ]).then(([conns, config]) => {
      const tw = conns.find((c: any) => c.platform === "twitter");
      setConnection(tw);

      if (config) {
        setNiches(config.niches || []);
        // Handle keywords as hashtags for Twitter
        setHashtags(config.keywords || []);

        if (config.tone_profile) {
          setProfessionalism([config.tone_profile.professionalism || 50]);
          setVoicePreset(config.tone_profile.voice || "tech_twitter");
          setThreadMode(config.tone_profile.thread_mode || false);
        }

        // Map Cron to Freq
        if (config.schedule_cron === "0 9,12,15,18 * * *")
          setFrequency("4x_daily");
        else if (config.schedule_cron === "0 */4 * * *")
          setFrequency("6x_daily");
        else if (config.schedule_cron === "0 9 * * *") setFrequency("daily");
        else setFrequency("3x_daily"); // default fallback

        setSmartScheduling(config.smart_scheduling ?? true);
        setRequireApproval(config.require_approval ?? true);
        setAutoRetweet(config.auto_retweet ?? false);
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

  const handleAddHashtag = () => {
    let tag = currentHashtag.trim();
    if (tag) {
      if (!tag.startsWith("#")) tag = "#" + tag;
      if (!hashtags.includes(tag)) {
        setHashtags([...hashtags, tag]);
        setCurrentHashtag("");
      }
    }
  };

  const removeHashtag = (t: string) => {
    setHashtags(hashtags.filter((x) => x !== t));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let cron = "0 9,13,17 * * *"; // 3x daily default
      if (frequency === "daily") cron = "0 9 * * *";
      if (frequency === "4x_daily") cron = "0 9,12,15,18 * * *";
      if (frequency === "6x_daily") cron = "0 */4 * * *";

      const payload = {
        platform: "twitter",
        niches,
        keywords: hashtags, // Save hashtags in keywords field
        tone_profile: {
          professionalism: professionalism[0],
          voice: voicePreset,
          thread_mode: threadMode,
        },
        schedule_cron: cron,
        smart_scheduling: smartScheduling,
        require_approval: requireApproval,
        auto_retweet: autoRetweet,
      };

      await poster("/automation/config", payload);
      toast.success("Twitter configuration saved");
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
          <div className="h-12 w-12 bg-[#1DA1F2]/10 flex items-center justify-center rounded-full text-[#1DA1F2]">
            <Twitter className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Twitter Integration</h2>
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
                ? `Connected as @${connection.platform_username || "user"}`
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
              Define your Twitter niche and hashtags.
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
                  placeholder="e.g. AI News, Crypto, Indie Hacking"
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
              <Label>Automated Hashtags</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {hashtags.map((t) => (
                  <Badge
                    key={t}
                    variant="outline"
                    className="text-blue-500 border-blue-200 gap-1"
                  >
                    {t}
                    <X
                      className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-destructive"
                      onClick={() => removeHashtag(t)}
                    />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. #buildinpublic"
                  value={currentHashtag}
                  onChange={(e) => setCurrentHashtag(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddHashtag()}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleAddHashtag}
                  disabled={!currentHashtag.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                These tags will be intelligently rotated in your tweets.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 3. Tone & Style */}
        <Card>
          <CardHeader>
            <CardTitle>Tone & Style</CardTitle>
            <CardDescription>Customize your Twitter persona.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Vibe Check</Label>
                <span className="text-xs text-muted-foreground">
                  {professionalism[0] < 30
                    ? "Shitposting"
                    : professionalism[0] > 70
                      ? "Thought Leader"
                      : "Casual Tech"}
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
                <span>Unfiltered</span>
                <span>Professional</span>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Voice Preset</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  "tech_twitter",
                  "meme_heavy",
                  "thread_writer",
                  "news_breaker",
                ].map((v) => (
                  <div
                    key={v}
                    className={`border rounded-lg p-3 text-center cursor-pointer transition-all ${voicePreset === v ? "ring-2 ring-[#1DA1F2] bg-[#1DA1F2]/5 border-[#1DA1F2]" : "hover:bg-accent"}`}
                    onClick={() => setVoicePreset(v)}
                  >
                    <div className="font-medium text-sm capitalize">
                      {v.replace("_", " ")}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border p-3 rounded-lg bg-secondary/10">
              <div className="space-y-0.5">
                <Label className="text-base flex items-center gap-2">
                  <Repeat className="h-4 w-4" /> Thread Mode
                </Label>
                <p className="text-xs text-muted-foreground">
                  Auto-convert long content into threads.
                </p>
              </div>
              <Switch checked={threadMode} onCheckedChange={setThreadMode} />
            </div>
          </CardContent>
        </Card>

        {/* 4. Schedule & Automation */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Twice Schedule</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <Label className="text-base">Tweet Frequency</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "daily", label: "Once daily" },
                  { id: "3x_daily", label: "3x Daily" },
                  { id: "4x_daily", label: "4x Daily" },
                  { id: "6x_daily", label: "Every 4 Hours" },
                ].map((opt) => (
                  <div
                    key={opt.id}
                    className={`border rounded-md p-3 flex flex-col items-center justify-center cursor-pointer transition-all ${frequency === opt.id ? "border-[#1DA1F2] bg-[#1DA1F2]/5" : "hover:border-primary/50"}`}
                    onClick={() => setFrequency(opt.id)}
                  >
                    <span className="font-medium text-sm">{opt.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-secondary/20 p-4 rounded-lg space-y-2 border">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base flex items-center gap-2">
                      Wait for Approval
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Drafts need manual approval before tweeting.
                    </p>
                  </div>
                  <Switch
                    checked={requireApproval}
                    onCheckedChange={setRequireApproval}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    Smart Timing{" "}
                    <Badge variant="secondary" className="text-[10px]">
                      AI
                    </Badge>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Optimize within your frequency slots.
                  </p>
                </div>
                <Switch
                  checked={smartScheduling}
                  onCheckedChange={setSmartScheduling}
                />
              </div>

              <div className="flex items-center justify-between opacity-50">
                <div className="space-y-0.5">
                  <Label>Auto-Reply to Comments</Label>
                  <p className="text-xs text-muted-foreground">Coming soon</p>
                </div>
                <Switch disabled />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-4 sticky bottom-6">
        <Button variant="outline" onClick={() => window.location.reload()}>
          Discard
        </Button>
        <Button
          size="lg"
          onClick={handleSave}
          disabled={saving}
          className="bg-[#1DA1F2] hover:bg-[#1a91da]"
        >
          {saving ? "Saving..." : "Save Twitter Settings"}
        </Button>
      </div>
    </div>
  );
}
