"use client";

import { YouTubeConfigurationPanel } from "@/components/youtube/youtube-configuration-panel";

export default function YouTubeConfigPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          YouTube Automation
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure your YouTube content strategy, video preferences, and upload
          schedule.
        </p>
      </div>

      <YouTubeConfigurationPanel />
    </div>
  );
}
