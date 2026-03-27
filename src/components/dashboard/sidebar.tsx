"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Linkedin,
  Settings,
  LogOut,
  Sparkles,
  Layers,
  Calendar,
  BarChart3,
  Youtube,
  Instagram,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { signout } from "@/lib/supabase/actions";
import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { fetcher } from "@/lib/api-client";

// ─── Twitter X icon ───────────────────────────────────────────────────────────
function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.845L1.254 2.25H8.08l4.258 5.627 5.906-5.627zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

// ─── Reddit alien ─────────────────────────────────────────────────────────────
function RedditIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="currentColor">
      <path d="M20 10c0-5.523-4.477-10-10-10S0 4.477 0 10c0 5.522 4.477 10 10 10s10-4.478 10-10zm-11.25-1.25a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0zm5 0a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0zm-2.497 4.166c-.92.921-2.586.921-3.506 0a.625.625 0 0 0-.884.884c1.364 1.363 3.91 1.363 5.274 0a.625.625 0 0 0-.884-.884zM17.5 10a1.25 1.25 0 0 0-2.09-.932C14.236 8.42 12.69 8 11 8l.75-3.5 2.452.506a1.25 1.25 0 1 0 .13-.618L11.616 3.9a.625.625 0 0 0-.741.457L10 8c-1.687 0-3.236.42-4.41 1.068A1.25 1.25 0 1 0 3.5 10a1.246 1.246 0 0 0 .54 1.026C4.012 12.8 6.805 14 10 14s5.988-1.2 5.96-2.974A1.246 1.246 0 0 0 17.5 10z" />
    </svg>
  );
}

// ─── Nav items ────────────────────────────────────────────────────────────────
export const navItems = [
  { href: "/dashboard",  label: "Overview",             icon: LayoutDashboard, platform: null },
  { href: "/linkedin",   label: "LinkedIn",             icon: Linkedin,        platform: "linkedin" },
  { href: "/twitter",    label: "X / Twitter",          icon: XIcon,           platform: "twitter" },
  { href: "/youtube",    label: "YouTube",              icon: Youtube,         platform: "youtube" },
  { href: "/reddit",     label: "Reddit",               icon: RedditIcon,      platform: "reddit" },
  { href: "/instagram",  label: "Instagram",            icon: Instagram,       platform: "instagram" },
  { href: "/calendar",   label: "Calendar",             icon: Calendar,        platform: null },
  { href: "/analytics",  label: "Analytics",            icon: BarChart3,       platform: null },
  { href: "/integrations", label: "Integrations",       icon: Layers,          platform: null },
  { href: "/settings",   label: "Settings",             icon: Settings,        platform: null },
];

// ─── Connection status badge ───────────────────────────────────────────────────
function ConnectionDot({ connected }: { connected: boolean }) {
  return (
    <span
      title={connected ? "Connected" : "Not connected"}
      className={cn(
        "ml-auto h-1.5 w-1.5 rounded-full shrink-0 ring-1",
        connected ? "bg-green-500 ring-green-500/30" : "bg-muted-foreground/30 ring-muted-foreground/10"
      )}
    />
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Connection { platform: string; }
interface UserProfile { full_name: string; email: string; subscription?: { plan?: string }; }

// ─── Shared hook: connections + profile ───────────────────────────────────────
function useSidebarData() {
  const [connections, setConnections] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    Promise.all([
      fetcher("/connections").catch(() => []),
      fetcher("/user/profile").catch(() => null),
    ]).then(([conns, profile]) => {
      if (Array.isArray(conns)) setConnections(new Set(conns.map((c: Connection) => c.platform)));
      if (profile) setUser(profile);
    });
  }, []);

  return { connections, user };
}

// ─── Nav item row (shared between desktop / mobile) ──────────────────────────
function NavRow({
  item,
  isActive,
  connections,
  onClick,
}: {
  item: typeof navItems[number];
  isActive: boolean;
  connections: Set<string>;
  onClick?: () => void;
}) {
  return (
    <Link key={item.href} href={item.href} onClick={onClick}>
      <span
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors mb-1",
          isActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        )}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">{item.label}</span>
        {item.platform && (
          <ConnectionDot connected={connections.has(item.platform)} />
        )}
      </span>
    </Link>
  );
}

// ─── User footer (shared) ─────────────────────────────────────────────────────
function UserFooter({
  user,
  isSigningOut,
  onSignOut,
}: {
  user: UserProfile | null;
  isSigningOut: boolean;
  onSignOut: () => void;
}) {
  const plan = user?.subscription?.plan || "free";
  const name = user?.full_name || "User";
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="p-4 border-t border-border/50 bg-secondary/10">
      <div className="flex items-center gap-3 mb-3 px-2">
        <div className="h-8 w-8 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-xs shrink-0">
          {initials}
        </div>
        <div className="overflow-hidden flex-1">
          <p className="text-sm font-medium truncate">{name}</p>
          <p className="text-xs text-muted-foreground capitalize">{plan} plan</p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        onClick={onSignOut}
        disabled={isSigningOut}
      >
        <LogOut className="mr-2 h-4 w-4" />
        {isSigningOut ? "Signing out…" : "Sign Out"}
      </Button>
    </div>
  );
}

// ─── Desktop Sidebar ──────────────────────────────────────────────────────────
export function Sidebar() {
  const pathname = usePathname();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { connections, user } = useSidebarData();

  const handleSignOut = async () => { setIsSigningOut(true); await signout(); };

  return (
    <aside className="w-64 border-r border-border bg-card hidden md:flex flex-col h-screen sticky top-0" suppressHydrationWarning>
      {/* Logo */}
      <div className="p-6 flex items-center gap-2 border-b border-border/50">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-xl font-bold font-heading tracking-tight">AI Canvas</span>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="mb-4 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
          <span>Platform</span>
          <span className="text-[10px] font-normal normal-case">● = connected</span>
        </div>
        {navItems.slice(0, 6).map((item) => (
          <NavRow key={item.href} item={item} isActive={pathname === item.href} connections={connections} />
        ))}

        <div className="mt-8 mb-4 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Management</div>
        {navItems.slice(6).map((item) => (
          <NavRow key={item.href} item={item} isActive={pathname === item.href} connections={connections} />
        ))}
      </nav>

      <UserFooter user={user} isSigningOut={isSigningOut} onSignOut={handleSignOut} />
    </aside>
  );
}

// ─── Mobile Sidebar ───────────────────────────────────────────────────────────
export function MobileSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { connections, user } = useSidebarData();

  const handleSignOut = async () => { setIsSigningOut(true); await signout(); };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden"><Menu className="h-6 w-6" /></Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-72">
        <SheetHeader className="p-6 border-b border-border/50 text-left">
          <SheetTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold font-heading tracking-tight">AI Canvas</span>
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col h-full bg-card pb-20">
          <nav className="flex-1 p-4 overflow-y-auto">
            <div className="mb-4 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
              <span>Platform</span>
              <span className="text-[10px] font-normal normal-case">● = connected</span>
            </div>
            {navItems.slice(0, 6).map((item) => (
              <NavRow key={item.href} item={item} isActive={pathname === item.href} connections={connections} onClick={() => setOpen(false)} />
            ))}
            <div className="mt-8 mb-4 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Management</div>
            {navItems.slice(6).map((item) => (
              <NavRow key={item.href} item={item} isActive={pathname === item.href} connections={connections} onClick={() => setOpen(false)} />
            ))}
          </nav>

          <UserFooter user={user} isSigningOut={isSigningOut} onSignOut={handleSignOut} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
