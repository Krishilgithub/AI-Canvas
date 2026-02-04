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
import { X, Plus, AlertCircle, CheckCircle2 } from "lucide-react";

export function YouTubeConfigurationPanel() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [connection, setConnection] = useState<any>(null);

  // Config State
  const [niches, setNiches] = useState<string[]>([]);
  const [contentPillars, setContentPillars] = useState<string[]>([]);

  // Video Strategy
  const [formatPreference, setFormatPreference] = useState<
    "mixed" | "shorts" | "long-form"
  >("mixed");
  const [scriptStyle, setScriptStyle] = useState<
    "educational" | "storytelling" | "fast-paced" | "deep-dive"
  >("educational");

  // SEO
  const [autoTags, setAutoTags] = useState(true);
  const [smartDescriptions, setSmartDescriptions] = useState(true);

  // Schedule
  const [frequency, setFrequency] = useState("daily");

  useEffect(() => {
    loadConfig();
    checkConnection();
  }, []);

  async function checkConnection() {
    try {
      const { data } = await fetcher("/api/auth/youtube/status"); // Mock endpoint check
      setConnection(data);
    } catch {
      console.log("Not connected to YouTube");
    }
  }

  async function loadConfig() {
    try {
      const data = await fetcher("/config?platform=youtube").catch(() => null);
      if (data) {
        setNiches(data.niches || []);
        setContentPillars(data.keywords || []); // Reuse keywords field for pillars

        // Parse custom fields if stored in a generic JSON column,
        // OR map them to existing fields if possible.
        // For now, we might need to store these in the generic config or add fields.
        // Since we didn't add schema fields, we'll map:
        // formatPreference -> mapped to `tone_profile` or similar if needed,
        // but ideally we should've added fields.
        // For MVP, lets assume we save them in the generic `tone_profile` JSON if it exists,
        // or just plain logic.
        // WAIT: The plan said "No schema changes".
        // Use `tone_profile` JSON column for these specific settings.

        if (data.tone_profile) {
          try {
            // If it's a string, parse it
            const profile =
              typeof data.tone_profile === "string"
                ? JSON.parse(data.tone_profile)
                : data.tone_profile;

            if (profile.formatPreference)
              setFormatPreference(profile.formatPreference);
            if (profile.scriptStyle) setScriptStyle(profile.scriptStyle);
          } catch (e) {
            // Fallback
          }
        }

        if (data.auto_retweet !== undefined) setAutoTags(data.auto_retweet); // Reuse auto_retweet for auto_tags
        if (data.smart_scheduling !== undefined)
          setSmartDescriptions(data.smart_scheduling); // Reuse for smart_desc
        if (data.schedule_cron) setFrequency(data.schedule_cron);
      }
    } catch {
      console.error("Failed to load config");
    }
  }

  async function handleSave() {
    try {
      setSaving(true);

      // Pack extra fields into tone_profile
      const toneProfileData = {
        formatPreference,
        scriptStyle,
      };

      await poster("/automation/config", {
        platform: "youtube",
        niches,
        keywords: contentPillars,
        tone_profile: JSON.stringify(toneProfileData), // Store as JSON string
        schedule_cron: frequency,
        smart_scheduling: smartDescriptions, // Mapping
        auto_retweet: autoTags, // Mapping
        require_approval: true, // Default
      });
      toast.success("YouTube configuration saved");
    } catch {
      toast.error("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  }

  // Helper for array inputs
  const addItem = (
    item: string,
    list: string[],
    setList: (l: string[]) => void,
  ) => {
    if (item && !list.includes(item)) {
      setList([...list, item]);
    }
  };

  const removeItem = (
    item: string,
    list: string[],
    setList: (l: string[]) => void,
  ) => {
    setList(list.filter((i) => i !== item));
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">
            YouTube Studio
          </h1>
          <p className="text-muted-foreground mt-1">
            Automate your Shorts and Long-form video strategy.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            Status:{" "}
            <span
              className={
                connection
                  ? "text-green-500 flex items-center gap-1"
                  : "text-amber-500 flex items-center gap-1"
              }
            >
              {connection ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Connected
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4" /> Not Connected
                </>
              )}
            </span>
          </CardTitle>
          <CardDescription>
            {connection
              ? `Connected as ${connection.channelTitle}`
              : "Connect your YouTube channel to enable auto-uploads."}
          </CardDescription>
        </CardHeader>
        {!connection && (
          <CardContent>
            <Button variant="secondary" className="w-full sm:w-auto">
              Connect YouTube Channel
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Content Strategy */}
      <Card>
        <CardHeader>
          <CardTitle>Content Strategy</CardTitle>
          <CardDescription>Define what your channel is about.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Niches */}
          <div className="space-y-2">
            <Label>Niches / Topics</Label>
            <div className="flex flex-wrap gap-2 mb-2 p-3 bg-muted/20 rounded-md min-h-[40px]">
              {niches.map((niche) => (
                <Badge
                  key={niche}
                  variant="secondary"
                  className="px-3 py-1 flex items-center gap-1"
                >
                  {niche}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={() => removeItem(niche, niches, setNiches)}
                  />
                </Badge>
              ))}
              {niches.length === 0 && (
                <span className="text-sm text-muted-foreground italic">
                  No niches added yet.
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add a niche (e.g. 'Tech Reviews', 'Cooking')"
                id="niche-input"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addItem(e.currentTarget.value, niches, setNiches);
                    e.currentTarget.value = "";
                  }
                }}
              />
              <Button
                variant="outline"
                onClick={() => {
                  const input = document.getElementById(
                    "niche-input",
                  ) as HTMLInputElement;
                  addItem(input.value, niches, setNiches);
                  input.value = "";
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content Pillars */}
          <div className="space-y-2">
            <Label>Content Pillars</Label>
            <div className="flex flex-wrap gap-2 mb-2 p-3 bg-muted/20 rounded-md min-h-[40px]">
              {contentPillars.map((pillar) => (
                <Badge
                  key={pillar}
                  variant="outline"
                  className="px-3 py-1 flex items-center gap-1 border-primary/20 bg-primary/5 text-primary"
                >
                  {pillar}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={() =>
                      removeItem(pillar, contentPillars, setContentPillars)
                    }
                  />
                </Badge>
              ))}
              {contentPillars.length === 0 && (
                <span className="text-sm text-muted-foreground italic">
                  No content pillars defined.
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add a pillar (e.g. 'Tutorials', 'Vlogs')"
                id="pillar-input"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addItem(
                      e.currentTarget.value,
                      contentPillars,
                      setContentPillars,
                    );
                    e.currentTarget.value = "";
                  }
                }}
              />
              <Button
                variant="outline"
                onClick={() => {
                  const input = document.getElementById(
                    "pillar-input",
                  ) as HTMLInputElement;
                  addItem(input.value, contentPillars, setContentPillars);
                  input.value = "";
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Video Strategy */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Format Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Primary Focus</Label>
              <div className="grid grid-cols-3 gap-2">
                {["mixed", "shorts", "long-form"].map((f) => (
                  <div
                    key={f}
                    onClick={() => setFormatPreference(f as any)}
                    className={`cursor-pointer border rounded-md p-3 text-center text-sm font-medium transition-all ${formatPreference === f ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
                  >
                    {f === "mixed"
                      ? "Mixed"
                      : f === "shorts"
                        ? "Shorts"
                        : "Long Form"}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Script Style</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tone</Label>
              <div className="grid grid-cols-2 gap-2">
                {["educational", "storytelling", "fast-paced", "deep-dive"].map(
                  (s) => (
                    <div
                      key={s}
                      onClick={() => setScriptStyle(s as any)}
                      className={`cursor-pointer border rounded-md p-2 text-center text-xs font-medium transition-all ${scriptStyle === s ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
                    >
                      {s
                        .split("-")
                        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(" ")}
                    </div>
                  ),
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Optimization */}
      <Card>
        <CardHeader>
          <CardTitle>SEO & Optimization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Auto-Generate Tags</Label>
              <p className="text-sm text-muted-foreground">
                Automatically generate relevant YouTube tags based on content.
              </p>
            </div>
            <Switch checked={autoTags} onCheckedChange={setAutoTags} />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Smart Descriptions</Label>
              <p className="text-sm text-muted-foreground">
                Enhance descriptions with chapters, social links, and SEO
                keywords.
              </p>
            </div>
            <Switch
              checked={smartDescriptions}
              onCheckedChange={setSmartDescriptions}
            />
          </div>
        </CardContent>
      </Card>

      {/* Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Label>Frequency</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {["daily", "weekly", "bi-weekly", "monthly"].map((freq) => (
                <div
                  key={freq}
                  onClick={() => setFrequency(freq)}
                  className={`cursor-pointer border rounded-md p-3 text-center text-sm font-medium ${frequency === freq ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
                >
                  {freq.charAt(0).toUpperCase() + freq.slice(1)}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
