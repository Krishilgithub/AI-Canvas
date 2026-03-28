"use client";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { fetcher, getAuthToken } from "@/lib/api-client";
import {
  Card, CardHeader, CardTitle, CardContent, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Linkedin, MessageSquare, Send, Mail, Check, Twitter,
  Instagram, Youtube, Plus, Pencil, Trash2, Loader2, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface LinkedAccount {
  id: string;
  platform: string;
  platform_username: string;
  platform_user_id: string;
  status: string;
  account_label: string;
  token_expires_at?: string;
  metadata?: { avatar?: string; email?: string };
  created_at: string;
}

// ─── Platform configs ─────────────────────────────────────────────────────────
const PLATFORM_CONFIG = [
  { name: "LinkedIn",  key: "linkedin",  icon: Linkedin,      color: "text-[#0077b5]", bg: "bg-[#0077b5]/10", desc: "Primary publishing channel. Read/Write access required." },
  { name: "Twitter",   key: "twitter",   icon: Twitter,       color: "text-[#1DA1F2]", bg: "bg-[#1DA1F2]/10", desc: "Auto-tweet trends and threads." },
  { name: "Instagram", key: "instagram", icon: Instagram,     color: "text-[#E1306C]", bg: "bg-[#E1306C]/10", desc: "Post visual summaries and reels." },
  { name: "Reddit",    key: "reddit",    icon: MessageSquare, color: "text-[#FF4500]", bg: "bg-[#FF4500]/10", desc: "Engage in niche communities." },
  { name: "YouTube",   key: "youtube",   icon: Youtube,       color: "text-[#FF0000]", bg: "bg-[#FF0000]/10", desc: "Publish video summaries." },
  { name: "Slack",     key: "slack",     icon: MessageSquare, color: "text-[#4A154B]", bg: "bg-[#4A154B]/10", desc: "Receive real-time notifications." },
  { name: "Telegram",  key: "telegram",  icon: Send,          color: "text-[#0088cc]", bg: "bg-[#0088cc]/10", desc: "Get mobile alerts for trends." },
  { name: "Email",     key: "email",     icon: Mail,          color: "text-orange-500", bg: "bg-orange-500/10", desc: "Receive weekly summaries." },
];

// ─── Account Row ─────────────────────────────────────────────────────────────
function AccountRow({
  account,
  onDisconnect,
  onRenameLabel,
}: {
  account: LinkedAccount;
  onDisconnect: (id: string) => void;
  onRenameLabel: (id: string, label: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [labelVal, setLabelVal] = useState(account.account_label || "Primary");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const isExpired = account.token_expires_at
    ? new Date(account.token_expires_at) < new Date()
    : false;

  const saveLabel = async () => {
    setSaving(true);
    try {
      await onRenameLabel(account.id, labelVal);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/10 border border-border hover:bg-secondary/20 transition-colors group">
      {/* Avatar */}
      <div className="h-8 w-8 rounded-full bg-secondary/50 flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
        {account.metadata?.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={account.metadata.avatar} alt={account.platform_username} className="w-full h-full object-cover" />
        ) : (
          (account.platform_username || "?")[0].toUpperCase()
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate max-w-[140px]">
            {account.platform_username || account.platform_user_id}
          </span>
          {editing ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={labelVal}
                onChange={e => setLabelVal(e.target.value)}
                className="h-5 px-2 text-xs border border-primary/50 rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/40 w-28"
                onKeyDown={e => { if (e.key === "Enter") saveLabel(); if (e.key === "Escape") setEditing(false); }}
                autoFocus
              />
              <button onClick={saveLabel} disabled={saving} className="text-xs text-primary hover:underline">
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
              </button>
              <button onClick={() => setEditing(false)} className="text-xs text-muted-foreground hover:underline">Cancel</button>
            </div>
          ) : (
            <Badge
              variant="outline"
              className="h-4 px-1.5 text-[10px] cursor-pointer hover:bg-secondary/30 flex items-center gap-1"
              onClick={() => setEditing(true)}
              title="Click to rename"
            >
              {account.account_label || "Primary"}
              <Pencil className="h-2 w-2 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {isExpired ? (
            <span className="text-[10px] text-destructive flex items-center gap-1">
              ⚠️ Token expired — reconnect required
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] text-green-600">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
              Connected
            </span>
          )}
          {account.metadata?.email && (
            <span className="text-[10px] text-muted-foreground">{account.metadata.email}</span>
          )}
        </div>
      </div>

      {/* Disconnect */}
      <Button
        size="sm"
        variant="ghost"
        className="h-6 text-xs text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        onClick={() => {
          setRemoving(true);
          onDisconnect(account.id);
        }}
        disabled={removing}
      >
        {removing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
      </Button>
    </div>
  );
}

// ─── Platform Card ────────────────────────────────────────────────────────────
function PlatformCard({
  platform,
  accounts,
  onConnect,
  onDisconnect,
  onRenameLabel,
}: {
  platform: (typeof PLATFORM_CONFIG)[0];
  accounts: LinkedAccount[];
  onConnect: (platformKey: string) => void;
  onDisconnect: (id: string) => void;
  onRenameLabel: (id: string, label: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const connectedAccounts = accounts.filter(a => a.platform === platform.key);
  const isConnected = connectedAccounts.length > 0;
  const supportsMulti = ["linkedin", "twitter", "instagram"].includes(platform.key);

  return (
    <Card className={cn(
      "transition-all duration-200",
      isConnected ? "border-green-500/20 bg-green-500/[0.02]" : ""
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn("p-2.5 rounded-xl", platform.bg)}>
              <platform.icon className={cn("h-5 w-5", platform.color)} />
            </div>
            <div>
              <CardTitle className="text-base">{platform.name}</CardTitle>
              <CardDescription className="text-xs mt-0.5">{platform.desc}</CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isConnected && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-600 border border-green-500/20">
                <Check className="h-3 w-3" />
                {connectedAccounts.length} Connected
              </span>
            )}
            {platform.key !== "email" && platform.key !== "telegram" && (
              <Button
                size="sm"
                variant={isConnected && supportsMulti ? "outline" : isConnected ? "ghost" : "default"}
                className="h-8 text-xs gap-1.5"
                onClick={() => onConnect(platform.key)}
              >
                <Plus className="h-3.5 w-3.5" />
                {isConnected && supportsMulti ? "Add account" : isConnected ? "Reconnect" : "Connect"}
              </Button>
            )}
            {platform.key === "email" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-600 border border-green-500/20">
                <Check className="h-3 w-3" />Always Active
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Connected accounts list */}
      {isConnected && connectedAccounts.length > 0 && (
        <CardContent className="pt-0 pb-4">
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-full flex items-center justify-between text-xs text-muted-foreground mb-2 hover:text-foreground transition-colors"
          >
            <span>{connectedAccounts.length} account{connectedAccounts.length > 1 ? "s" : ""} connected</span>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {expanded && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              {connectedAccounts.map(acc => (
                <AccountRow
                  key={acc.id}
                  account={acc}
                  onDisconnect={onDisconnect}
                  onRenameLabel={onRenameLabel}
                />
              ))}
              {supportsMulti && (
                <p className="text-[10px] text-muted-foreground text-center pt-1">
                  ✓ Multi-account supported — connect personal and company pages separately
                </p>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function IntegrationsPage() {
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();

  const loadAccounts = useCallback(() => {
    setLoading(true);
    fetcher("/api/v1/accounts")
      .then((data: LinkedAccount[]) => setAccounts(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const success = searchParams.get("success");
    if (success) {
      toast.success(`${success.replace("_connected", "").replace(/_/g, " ")} connected successfully!`);
      router.replace("/integrations");
    }
    if (searchParams.get("error")) {
      toast.error("Connection failed", { description: searchParams.get("error")! });
      router.replace("/integrations");
    }
    loadAccounts();
  }, [searchParams, loadAccounts, router]);

  const handleConnect = async (platformKey: string) => {
    const endpointMap: Record<string, string> = {
      linkedin: "/auth/linkedin/connect",
      twitter: "/auth/twitter/connect",
      instagram: "/auth/instagram/connect",
      reddit: "/auth/reddit/connect",
      slack: "/auth/slack/connect",
      youtube: "/auth/youtube/connect",
    };
    const endpoint = endpointMap[platformKey];
    if (!endpoint) { toast.info("Integration coming soon"); return; }

    try {
      const token = await getAuthToken();
      const isProd = process.env.NODE_ENV === "production";
      const base = isProd ? "https://ai-canvass.vercel.app/api/v1" : (process.env.NEXT_PUBLIC_API_URL?.replace("/automation", "") || "http://localhost:4000/api/v1");
      const res = await fetch(`${base}${endpoint}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.url) router.push(data.url);
    } catch {
      toast.error("Failed to initiate connection");
    }
  };

  const handleDisconnect = async (accountId: string) => {
    try {
      await fetcher(`/api/v1/accounts/${accountId}`, { method: "DELETE" });
      toast.success("Account disconnected");
      loadAccounts();
    } catch {
      toast.error("Failed to disconnect account");
    }
  };

  const handleRenameLabel = async (accountId: string, label: string) => {
    try {
      await fetcher(`/api/v1/accounts/${accountId}/label`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      setAccounts(prev => prev.map(a => a.id === accountId ? { ...a, account_label: label } : a));
      toast.success("Account renamed");
    } catch {
      toast.error("Failed to rename account");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold font-heading">Integrations</h1>
        <p className="text-muted-foreground mt-1">
          Connect your accounts to enable publishing. Multiple accounts per platform are supported.
        </p>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-28 bg-secondary/10 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {PLATFORM_CONFIG.map(platform => (
            <PlatformCard
              key={platform.key}
              platform={platform}
              accounts={accounts}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onRenameLabel={handleRenameLabel}
            />
          ))}
        </div>
      )}

      <div className="rounded-xl border border-dashed border-border bg-secondary/5 p-4">
        <p className="text-xs text-muted-foreground text-center">
          🔒 All tokens are encrypted at rest. Run the SQL migration in Supabase to enable multi-account support.
          See <code className="text-xs bg-secondary/30 px-1 py-0.5 rounded">implementation_plan.md</code> for the exact SQL.
        </p>
      </div>
    </div>
  );
}
