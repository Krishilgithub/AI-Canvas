"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { fetcher } from "@/lib/api-client";
import { Bell, Zap, FileCheck, AlertTriangle, CheckCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Notification {
  id: string;
  type: "approval" | "failed" | "trend" | "published";
  title: string;
  description: string;
  href?: string;
  timestamp: string;
  read: boolean;
}

// ─── Notification Bell ────────────────────────────────────────────────────────
// Gap 5 fix: In-app notification system showing pending approvals, failed posts,
// and high-confidence trend alerts, all derived from existing API data.
export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen]                 = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]           = useState(false);
  const ref                             = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const items: Notification[] = [];

      // Fetch pending approvals
      const postsRes = await fetcher("/posts?status=needs_approval&limit=10").catch(() => null);
      const pendingPosts = postsRes?.data ?? (Array.isArray(postsRes) ? postsRes : []);
      for (const post of pendingPosts.slice(0, 5)) {
        const platform = post.ai_metadata?.platform ?? "unknown";
        items.push({
          id:          `approval-${post.id}`,
          type:        "approval",
          title:       "Post awaiting your approval",
          description: `${platform.charAt(0).toUpperCase() + platform.slice(1)}: "${(post.content ?? "").substring(0, 60)}…"`,
          href:        `/${platform}`,
          timestamp:   post.created_at,
          read:        false,
        });
      }

      // Fetch failed posts
      const failedRes = await fetcher("/posts?status=failed&limit=5").catch(() => null);
      const failedPosts = failedRes?.data ?? (Array.isArray(failedRes) ? failedRes : []);
      for (const post of failedPosts.slice(0, 3)) {
        const platform = post.ai_metadata?.platform ?? "unknown";
        items.push({
          id:          `failed-${post.id}`,
          type:        "failed",
          title:       "Post failed to publish",
          description: `${platform}: check your OAuth connection`,
          href:        "/integrations",
          timestamp:   post.updated_at ?? post.created_at,
          read:        false,
        });
      }

      // Fetch high-impact trends (unacted)
      const trendsRes = await fetcher("/trends?limit=5&platform=all").catch(() => null);
      const trends = trendsRes?.data ?? (Array.isArray(trendsRes) ? trendsRes : []);
      const highImpact = trends.filter((t: { velocity_score: number }) => t.velocity_score > 75);
      if (highImpact.length > 0) {
        items.push({
          id:          `trend-alert-${Date.now()}`,
          type:        "trend",
          title:       `${highImpact.length} high-impact trend${highImpact.length > 1 ? "s" : ""} detected`,
          description: `Top: "${highImpact[0].topic}" — score ${highImpact[0].velocity_score}/100`,
          href:        "/dashboard",
          timestamp:   new Date().toISOString(),
          read:        false,
        });
      }

      // Sort newest first
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setNotifications(items);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount and every 90 seconds
  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 90_000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAllRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  const dismiss = (id: string) =>
    setNotifications((prev) => prev.filter((n) => n.id !== id));

  const handleClick = (n: Notification) => {
    dismiss(n.id);
    setOpen(false);
    if (n.href) router.push(n.href);
  };

  const ICONS = {
    approval:  <FileCheck    className="h-4 w-4 text-amber-500" />,
    failed:    <AlertTriangle className="h-4 w-4 text-red-500" />,
    trend:     <Zap          className="h-4 w-4 text-blue-500" />,
    published: <CheckCircle  className="h-4 w-4 text-green-500" />,
  };

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => { setOpen((o) => !o); if (!open) loadNotifications(); }}
        className={cn(
          "relative h-9 w-9 rounded-lg flex items-center justify-center transition-colors",
          "hover:bg-secondary text-muted-foreground hover:text-foreground",
          open && "bg-secondary text-foreground"
        )}
        aria-label="Notifications"
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background" />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-11 w-80 rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="text-sm font-semibold">Notifications</span>
              {unreadCount > 0 && (
                <span className="h-5 min-w-5 px-1 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Mark all read
              </button>
            )}
          </div>

          {/* Items */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border/50">
            {loading ? (
              <div className="flex flex-col gap-2 p-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 rounded bg-secondary/40 animate-pulse" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>You&apos;re all caught up!</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 hover:bg-secondary/40 transition-colors group cursor-pointer",
                    !n.read && "bg-primary/5"
                  )}
                  onClick={() => handleClick(n)}
                >
                  <div className="mt-0.5 shrink-0">{ICONS[n.type]}</div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium leading-snug truncate", !n.read && "text-foreground")}>
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                      {n.description}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      {new Date(n.timestamp).toLocaleDateString("en-US", {
                        month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground hover:text-foreground mt-0.5"
                    onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
                    aria-label="Dismiss"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-border bg-secondary/10">
              <button
                onClick={() => { markAllRead(); setOpen(false); }}
                className="text-xs text-muted-foreground hover:text-foreground w-full text-center transition-colors"
              >
                Clear all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
