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
import { X, Plus, AlertCircle, CheckCircle2 } from "lucide-react";

export function ConfigurationPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connection, setConnection] = useState<any>(null);

  // Config State
  const [subreddits, setSubreddits] = useState<string[]>([]);
  const [currentSubreddit, setCurrentSubreddit] = useState("");
  const [keywords, setKeywords] = useState<string>("");

  const [professionalism, setProfessionalism] = useState([50]); // Default to balanced for Reddit
  const [voicePreset, setVoicePreset] = useState("storyteller"); // Default often works better for Reddit

  const [frequency, setFrequency] = useState("daily");
  const [autoReply, setAutoReply] = useState(false);
  const [minKarmaThreshold, setMinKarmaThreshold] = useState(10);
  const [requireApproval, setRequireApproval] = useState(true);

  useEffect(() => {
    Promise.all([
      fetcher("/connections"),
      fetcher("/config?platform=reddit").catch(() => null),
    ]).then(([conns, config]) => {
      const redditConn = conns.find((c: any) => c.platform === "reddit");
      setConnection(redditConn);

      if (config) {
        setSubreddits(config.subreddits || []);
        setKeywords(
          Array.isArray(config.keywords)
            ? config.keywords.join(", ")
            : config.keywords || "",
        );
        if (config.tone_profile) {
          setProfessionalism([config.tone_profile.professionalism || 50]);
          setVoicePreset(config.tone_profile.voice || "storyteller");
        }

        if (config.schedule_cron === "0 9 * * 1-5") setFrequency("daily");
        else if (config.schedule_cron === "0 9,17 * * 1-5")
          setFrequency("twice_daily");
        else setFrequency("custom");

        setAutoReply(config.auto_reply ?? false);
        setMinKarmaThreshold(config.min_karma_threshold ?? 10);
        setRequireApproval(config.require_approval ?? true);
      }
      setLoading(false);
    });
  }, []);

  const handleAddSubreddit = () => {
    if (currentSubreddit.trim()) {
      let sub = currentSubreddit.trim();
      if (sub.startsWith("r/")) sub = sub.substring(2);
      if (!subreddits.includes(sub)) {
        setSubreddits([...subreddits, sub]);
      }
      setCurrentSubreddit("");
    }
  };

  const removeSubreddit = (n: string) => {
    setSubreddits(subreddits.filter((x) => x !== n));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let cron = "0 9 * * 1-5";
      if (frequency === "twice_daily") cron = "0 9,17 * * 1-5";

      const payload = {
        subreddits, // Specific to Reddit
        keywords: keywords
          .split(",")
          .map((k) => k.trim())
          .filter((k) => k),
        tone_profile: {
          professionalism: professionalism[0],
          voice: voicePreset,
        },
        schedule_cron: cron,
        auto_reply: autoReply,
        min_karma_threshold: minKarmaThreshold,
        require_approval: requireApproval,
      };

      await poster("/automation/config?platform=reddit", payload);
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
          <div className="h-12 w-12 bg-[#FF4500]/10 flex items-center justify-center rounded-full text-[#FF4500]">
            {/* Reddit Icon SVG */}
            <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24">
              <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.56-.1249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Reddit Integration</h2>
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
                ? `Connected as u/${connection.username || "user"}`
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
        {/* 2. Target Subreddits */}
        <Card>
          <CardHeader>
            <CardTitle>Target Subreddits</CardTitle>
            <CardDescription>
              Communities to monitor and post to.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Subreddits</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {subreddits.map((sub) => (
                  <Badge
                    key={sub}
                    variant="secondary"
                    className="px-3 py-1 text-sm gap-2 bg-orange-500/10 text-orange-700 hover:bg-orange-500/20 border-orange-200"
                  >
                    r/{sub}
                    <X
                      className="h-3 w-3 cursor-pointer opacity-70 hover:opacity-100"
                      onClick={() => removeSubreddit(sub)}
                    />
                  </Badge>
                ))}
                {subreddits.length === 0 && (
                  <span className="text-sm text-muted-foreground italic">
                    No subreddits added.
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">
                    r/
                  </span>
                  <Input
                    className="pl-7"
                    placeholder="technews"
                    value={currentSubreddit}
                    onChange={(e) => setCurrentSubreddit(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddSubreddit()}
                  />
                </div>
                <Button
                  variant="secondary"
                  onClick={handleAddSubreddit}
                  disabled={!currentSubreddit.trim()}
                >
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Monitoring Keywords</Label>
              <Input
                placeholder="SaaS, AI, Startup, Launch"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                We'll look for these keywords in "Hot" and "Rising" posts.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 3. Tone & Engagement */}
        <Card>
          <CardHeader>
            <CardTitle>Tone & Etiquette</CardTitle>
            <CardDescription>
              Adjust how the bot interacts with redditors.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Professionalism</Label>
                <span className="text-xs text-muted-foreground">
                  {professionalism[0] < 30
                    ? "Casual / Meme-friendly"
                    : professionalism[0] > 70
                      ? "Formal"
                      : "Helpful / Balanced"}
                </span>
              </div>
              <Slider
                value={professionalism}
                onValueChange={setProfessionalism}
                max={100}
                step={1}
                className="py-2"
              />
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

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <Label>Auto-Reply to Comments</Label>
                <Switch checked={autoReply} onCheckedChange={setAutoReply} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="flex gap-2 items-center">
                  Min Karma Threshold
                  <span className="text-xs font-normal text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                    Coming Soon
                  </span>
                </Label>
                <Input
                  type="number"
                  className="w-20"
                  disabled
                  value={minKarmaThreshold}
                  onChange={(e) => setMinKarmaThreshold(Number(e.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. Schedule */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Schedule Rules</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <Label className="text-base">Posting Frequency</Label>
              <div className="space-y-2">
                {[
                  { id: "daily", label: "Once daily" },
                  { id: "twice_daily", label: "Twice daily" },
                  { id: "custom", label: "Custom" },
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
                      Require Approval
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Always review drafts before they go live on Reddit.
                    </p>
                  </div>
                  <Switch
                    checked={requireApproval}
                    onCheckedChange={setRequireApproval}
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
