"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fetcher } from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface RemixModalProps {
  post: Record<string, any> | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PLATFORMS = [
  { id: "linkedin", label: "LinkedIn" },
  { id: "twitter", label: "Twitter / X" },
  { id: "reddit", label: "Reddit" },
  { id: "instagram", label: "Instagram" },
];

export function RemixModal({ post, isOpen, onClose, onSuccess }: RemixModalProps) {
  const [targetPlatform, setTargetPlatform] = useState<string>("");
  const [isRemixing, setIsRemixing] = useState(false);

  const handleRemix = async () => {
    if (!targetPlatform) {
      toast.error("Please select a target platform.");
      return;
    }
    if (targetPlatform === post?.ai_metadata?.platform) {
      toast.error("Please select a different platform than the original.");
      return;
    }

    setIsRemixing(true);
    try {
      await fetcher("/api/v1/automation/remix", {
        method: "POST",
        body: JSON.stringify({
          post_id: post?.id,
          target_platform: targetPlatform,
        }),
      });

      toast.success(`Post successfully remixed for ${targetPlatform}! It is now in your Review Queue.`);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to remix post.");
    } finally {
      setIsRemixing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-indigo-500" />
            Remix Post
          </DialogTitle>
          <DialogDescription>
            Use AI to adapt this successful post into a new format optimized for a different secondary platform.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="bg-secondary/20 p-3 rounded-lg border border-border/50 text-sm max-h-[100px] overflow-hidden relative">
            <p className="opacity-70 text-xs font-semibold mb-1 uppercase tracking-wider">Original ({post?.ai_metadata?.platform || "Unknown"})</p>
            <p className="line-clamp-2 text-foreground/80">{post?.content}</p>
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none" />
          </div>

          <div className="space-y-2 mt-2">
            <h4 className="text-sm font-medium">Target Platform</h4>
            <Select value={targetPlatform} onValueChange={setTargetPlatform}>
              <SelectTrigger>
                <SelectValue placeholder="Select platform to translate to..." />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p.id} value={p.id} disabled={p.id === post?.ai_metadata?.platform}>
                    {p.label} {p.id === post?.ai_metadata?.platform && "(Original)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isRemixing}>
            Cancel
          </Button>
          <Button 
            onClick={handleRemix} 
            disabled={!targetPlatform || isRemixing}
            className={cn("gap-2", isRemixing ? "" : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white")}
          >
            {isRemixing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Remixing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Generate Remix
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
