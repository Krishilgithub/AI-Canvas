"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Loader2, TrendingUp, Newspaper, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type ScanStage =
  | "idle"
  | "fetching_news"
  | "analyzing_trends"
  | "generating_drafts"
  | "done"
  | "error";

const STAGES: { id: ScanStage; label: string; sublabel: string; icon: React.ElementType }[] = [
  {
    id: "fetching_news",
    label: "Fetching News",
    sublabel: "Pulling articles from your niche...",
    icon: Newspaper,
  },
  {
    id: "analyzing_trends",
    label: "Analyzing Trends",
    sublabel: "Gemini AI is scoring impact & relevance...",
    icon: TrendingUp,
  },
  {
    id: "generating_drafts",
    label: "Generating Drafts",
    sublabel: "Creating posts for high-impact trends...",
    icon: Sparkles,
  },
];

const STAGE_ORDER: ScanStage[] = [
  "fetching_news",
  "analyzing_trends",
  "generating_drafts",
  "done",
];

function getStageIndex(stage: ScanStage) {
  return STAGE_ORDER.indexOf(stage);
}

interface ScanProgressStepperProps {
  stage: ScanStage;
  className?: string;
}

export function ScanProgressStepper({ stage, className }: ScanProgressStepperProps) {
  const currentIndex = getStageIndex(stage);
  const isError = stage === "error";

  return (
    <div
      className={cn(
        "border border-primary/20 bg-primary/5 rounded-xl px-6 py-5",
        isError && "border-red-500/30 bg-red-500/5",
        className
      )}
    >
      <p className="text-sm font-semibold mb-5 text-foreground flex items-center gap-2">
        {isError ? (
          <span className="text-red-500">Scan failed — please try again</span>
        ) : stage === "done" ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-green-600 dark:text-green-400">Scan completed!</span>
          </>
        ) : (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Running AI Trend Scan...
          </>
        )}
      </p>

      <div className="flex items-start gap-0">
        {STAGES.map((s, i) => {
          const stageIdx = getStageIndex(s.id);
          const isCompleted = currentIndex > stageIdx || stage === "done";
          const isCurrent = currentIndex === stageIdx && stage !== "done" && !isError;
          const isPending = !isCompleted && !isCurrent;
          const isLast = i === STAGES.length - 1;
          const Icon = s.icon;

          return (
            <div key={s.id} className="flex items-start flex-1">
              <div className="flex flex-col items-center">
                {/* Icon circle */}
                <div
                  className={cn(
                    "h-9 w-9 rounded-full flex items-center justify-center border-2 transition-all duration-500",
                    isCompleted
                      ? "bg-primary border-primary text-primary-foreground"
                      : isCurrent
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-secondary/40 border-border text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : isCurrent ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>

                {/* Label below */}
                <div className="mt-2 text-center max-w-[90px]">
                  <p
                    className={cn(
                      "text-xs font-semibold leading-tight",
                      isCompleted
                        ? "text-primary"
                        : isCurrent
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {s.label}
                  </p>
                  {isCurrent && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                      {s.sublabel}
                    </p>
                  )}
                </div>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className="flex-1 flex items-center mt-4 mx-1">
                  <div
                    className={cn(
                      "h-0.5 w-full transition-all duration-700",
                      isCompleted ? "bg-primary" : "bg-border"
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Convenience hook that auto-advances stages on a timer (for demo/optimistic UX)
export function useScanStager(active: boolean) {
  const [stage, setStage] = useState<ScanStage>("idle");

  useEffect(() => {
    if (!active) {
      setStage("idle");
      return;
    }

    setStage("fetching_news");
    const t1 = setTimeout(() => setStage("analyzing_trends"), 3000);
    const t2 = setTimeout(() => setStage("generating_drafts"), 8000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [active]);

  return { stage, setStage };
}
