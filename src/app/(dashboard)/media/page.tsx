"use client";
import { MediaLibrary } from "@/components/shared/media-library";
import { Image } from "lucide-react";

export default function MediaPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold font-heading flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Image className="h-6 w-6 text-primary" />
            </div>
            Media Library
          </h1>
          <p className="text-muted-foreground mt-1">
            Upload and reuse images and videos across all your posts and campaigns.
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 min-h-[600px] flex flex-col">
        <MediaLibrary mode="manage" />
      </div>
    </div>
  );
}
