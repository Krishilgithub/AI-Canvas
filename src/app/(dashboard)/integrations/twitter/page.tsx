"use client";

import { TwitterConfigurationPanel } from "@/components/twitter/twitter-configuration-panel";

export default function TwitterConfigPage() {
  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-heading mb-2">
          Configure Twitter Agent
        </h1>
        <p className="text-muted-foreground">
          Customize how your AI agent behaves on Twitter/X.
        </p>
      </div>
      <TwitterConfigurationPanel />
    </div>
  );
}
