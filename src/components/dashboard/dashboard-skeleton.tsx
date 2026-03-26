"use client";

import { cn } from "@/lib/utils";

function SkeletonBox({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-secondary/60",
        className
      )}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="animate-in fade-in duration-300 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonBox className="h-8 w-36" />
          <SkeletonBox className="h-4 w-56" />
        </div>
        <SkeletonBox className="h-9 w-32" />
      </div>

      {/* Metric cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border border-border rounded-xl p-5 space-y-3">
            <div className="flex justify-between items-center">
              <SkeletonBox className="h-3.5 w-24" />
              <SkeletonBox className="h-4 w-4 rounded-full" />
            </div>
            <SkeletonBox className="h-7 w-16" />
            <SkeletonBox className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Chart + sidebar */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="col-span-2 border border-border rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <div className="space-y-1.5">
              <SkeletonBox className="h-4 w-40" />
              <SkeletonBox className="h-3 w-56" />
            </div>
            <SkeletonBox className="h-7 w-32 rounded-lg" />
          </div>
          {/* Bar chart skeleton */}
          <div className="h-56 flex items-end gap-1.5 pt-4">
            {Array.from({ length: 28 }).map((_, i) => (
              <SkeletonBox
                key={i}
                style={{ height: `${Math.random() * 70 + 15}%` }}
                className="flex-1 rounded-t-sm"
              />
            ))}
          </div>
        </div>
        <div className="border border-border rounded-xl p-5 space-y-4">
          <SkeletonBox className="h-4 w-28" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center">
              <SkeletonBox className="h-3.5 w-24" />
              <SkeletonBox className="h-5 w-20 rounded-full" />
            </div>
          ))}
          <div className="pt-4 border-t space-y-2">
            <SkeletonBox className="h-3.5 w-32" />
            <SkeletonBox className="h-2 w-full rounded-full" />
            <div className="flex justify-between">
              <SkeletonBox className="h-3 w-12" />
              <SkeletonBox className="h-3 w-16" />
            </div>
          </div>
        </div>
      </div>

      {/* Activity */}
      <div className="border border-border rounded-xl p-5 space-y-4">
        <div className="flex justify-between">
          <SkeletonBox className="h-4 w-32" />
          <SkeletonBox className="h-7 w-20" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <SkeletonBox className="h-2 w-2 rounded-full shrink-0" />
              <div className="space-y-1.5">
                <SkeletonBox className="h-3.5 w-64" />
                <SkeletonBox className="h-3 w-24" />
              </div>
            </div>
            <SkeletonBox className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ActivitySkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-4">
            <div className="h-2 w-2 rounded-full bg-secondary/60 shrink-0" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-52 rounded bg-secondary/60" />
              <div className="h-3 w-20 rounded bg-secondary/60" />
            </div>
          </div>
          <div className="h-6 w-20 rounded-full bg-secondary/60" />
        </div>
      ))}
    </div>
  );
}
