"use client";

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    href: string;
  };
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8 px-4" : "py-14 px-6",
        className
      )}
    >
      <div
        className={cn(
          "rounded-2xl bg-secondary/40 border border-border flex items-center justify-center mb-4",
          compact ? "h-12 w-12" : "h-16 w-16"
        )}
      >
        <Icon
          className={cn(
            "text-muted-foreground",
            compact ? "h-5 w-5" : "h-7 w-7"
          )}
        />
      </div>

      <h3
        className={cn(
          "font-semibold text-foreground",
          compact ? "text-sm" : "text-base"
        )}
      >
        {title}
      </h3>
      <p
        className={cn(
          "text-muted-foreground mt-1 max-w-xs",
          compact ? "text-xs" : "text-sm"
        )}
      >
        {description}
      </p>

      {(action || secondaryAction) && (
        <div className="flex items-center gap-3 mt-5">
          {action && (
            <Button
              size={compact ? "sm" : "default"}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="ghost"
              size={compact ? "sm" : "default"}
              asChild
            >
              <a href={secondaryAction.href}>{secondaryAction.label}</a>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
