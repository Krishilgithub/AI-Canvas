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
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Instagram,
  Plus,
  X,
  Palette,
  Heart,
  MessageCircle,
} from "lucide-react";

export function ConfigurationPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connection, setConnection] = useState<any>(null);

  // Instagram Config State
  const [niche, setNiche] = useState("");
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [currentCompetitor, setCurrentCompetitor] = useState("");

  const [aesthetic, setAesthetic] = useState("minimalist");
  const [primaryColor, setPrimaryColor] = useState("#000000");

  const [autoLike, setAutoLike] = useState(false);
  const [autoDm, setAutoDm] = useState(false);
  const [postsPerWeek, setPostsPerWeek] = useState(3);

  useEffect(() => {
    Promise.all([
      fetcher("/connections"),
      fetcher("/config?platform=instagram").catch(() => null),
    ]).then(([conns, config]) => {
      const instaConn = conns.find((c: any) => c.platform === "instagram");
      setConnection(instaConn);

      if (config) {
        setNiche(config.niche || "");
        setCompetitors(config.competitors || []);
        if (config.visual_identity) {
          setAesthetic(config.visual_identity.preset || "minimalist");
          setPrimaryColor(config.visual_identity.primary_color || "#000000");
        }
        setAutoLike(config.auto_like || false);
        setAutoDm(config.auto_dm || false);
        setPostsPerWeek(config.posts_per_week || 3);
      }
      setLoading(false);
    });
  }, []);

  const handleAddCompetitor = () => {
    if (currentCompetitor.trim()) {
      let handle = currentCompetitor.trim();
      if (handle.startsWith("@")) handle = handle.substring(1);
      if (!competitors.includes(handle)) {
        setCompetitors([...competitors, handle]);
      }
      setCurrentCompetitor("");
    }
  };

  const removeCompetitor = (h: string) => {
    setCompetitors(competitors.filter((x) => x !== h));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        niche,
        competitors,
        visual_identity: {
          preset: aesthetic,
          primary_color: primaryColor,
        },
        auto_like: autoLike,
        auto_dm: autoDm,
        posts_per_week: postsPerWeek,
      };

      await poster("/automation/config?platform=instagram", payload);
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
          <div className="h-12 w-12 bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center rounded-full text-white">
            <Instagram className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Instagram Integration</h2>
              {connection ? (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                  Active
                </Badge>
              ) : (
                <Badge variant="destructive">Disconnected</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {connection
                ? `Connected as @${connection.username}`
                : "Not connected."}
            </p>
          </div>
        </div>
        <Button
          onClick={() => router.push("/integrations")}
          variant={connection ? "outline" : "default"}
        >
          {connection ? "Manage Connection" : "Connect Account"}
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 2. Visual Identity */}
        <Card>
          <CardHeader>
            <CardTitle>Visual Identity</CardTitle>
            <CardDescription>
              Define the aesthetic of your posts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Aesthetic Preset</Label>
              <div className="grid grid-cols-2 gap-3">
                {["minimalist", "vibrant", "dark_mode", "pastel"].map(
                  (style) => (
                    <div
                      key={style}
                      onClick={() => setAesthetic(style)}
                      className={`cursor-pointer border rounded-lg p-3 text-center transition-all ${aesthetic === style ? "ring-2 ring-primary bg-primary/5 border-primary" : "hover:bg-secondary"}`}
                    >
                      <Palette
                        className={`h-5 w-5 mx-auto mb-2 ${aesthetic === style ? "text-primary" : "text-muted-foreground"}`}
                      />
                      <span className="text-sm font-medium capitalize">
                        {style.replace("_", " ")}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>
            <div className="space-y-3">
              <Label>Brand Color (Hex)</Label>
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-full border shadow-sm"
                  style={{ backgroundColor: primaryColor }}
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#000000"
                  className="font-mono"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Content Strategy */}
        <Card>
          <CardHeader>
            <CardTitle>Content Strategy</CardTitle>
            <CardDescription>What should the AI post about?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Niche / Industry</Label>
              <Input
                placeholder="e.g. Fitness Coaching, SaaS Marketing"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <Label>Competitors to Monitor</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {competitors.map((comp) => (
                  <Badge
                    key={comp}
                    variant="secondary"
                    className="pl-2 pr-1 py-1 gap-1"
                  >
                    @{comp}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => removeCompetitor(comp)}
                    />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">
                    @
                  </span>
                  <Input
                    className="pl-7"
                    placeholder="competitor_handle"
                    value={currentCompetitor}
                    onChange={(e) => setCurrentCompetitor(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleAddCompetitor()
                    }
                  />
                </div>
                <Button
                  variant="secondary"
                  onClick={handleAddCompetitor}
                  disabled={!currentCompetitor.trim()}
                >
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. Engagement & Growth */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Engagement Settings</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-8">
            <div className="bg-secondary/20 p-4 rounded-lg space-y-4 border">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-pink-500" /> Auto-Like Niche
                    Posts
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Like recent posts in your niche hashtags.
                  </p>
                </div>
                <Switch checked={autoLike} onCheckedChange={setAutoLike} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-blue-500" /> Auto-DM
                    Story Mentions
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Reply to users who mention you.
                  </p>
                </div>
                <Switch checked={autoDm} onCheckedChange={setAutoDm} />
              </div>
            </div>

            <div className="space-y-4">
              <Label>
                Weekly Post Goal:{" "}
                <span className="text-primary font-bold">{postsPerWeek}</span>{" "}
                posts
              </Label>
              <Input
                type="range"
                min={1}
                max={14}
                step={1}
                value={postsPerWeek}
                onChange={(e) => setPostsPerWeek(Number(e.target.value))}
                className="accent-primary cursor-pointer"
              />
              <div className="flex justify-between text-xs text-muted-foreground px-1">
                <span>1 / week</span>
                <span>Daily</span>
                <span>2x Daily</span>
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
