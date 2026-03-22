"use client";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { fetcher } from "@/lib/api-client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Linkedin,
  MessageSquare,
  Send,
  Mail,
  Check,
  Twitter,
  Instagram,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";
import { getAuthToken } from "@/lib/api-client";

export default function IntegrationsPage() {
  const [connections, setConnections] = useState<any[]>([]);
  const searchParams = useSearchParams();
  const router = useRouter();

  const loadConnections = useCallback(() => {
    fetcher("/connections")
      .then((data) => setConnections(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    const success = searchParams.get("success");
    if (success) {
      toast.success(
        `${success.replace("_connected", "")} connected successfully!`,
      );
      router.replace("/integrations");
    }
    if (searchParams.get("error")) {
      toast.error("Connection failed", {
        description: searchParams.get("error")!,
      });
      router.replace("/integrations");
    }

    loadConnections();
  }, [searchParams, loadConnections, router]);

  const handleConnect = async (platform: string) => {
    let endpoint = "";
    if (platform === "LinkedIn") endpoint = "/auth/linkedin/connect";
    else if (platform === "Twitter") endpoint = "/auth/twitter/connect";
    else if (platform === "Instagram") endpoint = "/auth/instagram/connect";
    else if (platform === "Reddit") endpoint = "/auth/reddit/connect";
    else if (platform === "Slack") endpoint = "/auth/slack/connect";
    else if (platform === "YouTube") endpoint = "/auth/youtube/connect";
    else {
      toast.info("Integration coming soon");
      return;
    }

    try {
      const token = await getAuthToken();
      const isProd = process.env.NODE_ENV === "production";
      const apiUrl = isProd ? "https://ai-canvass.vercel.app/api/v1/automation" : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1/automation");
      const base = apiUrl.replace("/automation", "");

      const res = await fetch(`${base}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.url) {
        router.push(data.url);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to initiate connection");
    }
  };

  const handleDisconnect = async (platform: string) => {
    let endpoint = "";
    if (platform === "LinkedIn") endpoint = "/auth/linkedin";
    else endpoint = `/auth/${platform.toLowerCase()}`;

    try {
      const token = await getAuthToken();
      const isProd = process.env.NODE_ENV === "production";
      const apiUrl = isProd ? "https://ai-canvass.vercel.app/api/v1/automation" : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1/automation");
      const base = apiUrl.replace("/automation", "");

      await fetch(`${base}${endpoint}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(`Disconnected ${platform}`);
      loadConnections();
    } catch (e) {
      toast.error("Failed to disconnect");
    }
  };

  const isConnected = (platform: string) => {
    return (
      connections.some(
        (c) =>
          c.platform === platform.toLowerCase() &&
          (c.status === "connected" || c.status === "active"),
      ) ||
      platform === "Email" // Email always shows as connected
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold font-heading">Integrations</h1>
        <p className="text-muted-foreground">
          Connect your platforms to enable publishing and notifications.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          {
            name: "LinkedIn",
            icon: Linkedin,
            desc: "Primary publishing channel. Read/Write access required.",
            color: "text-[#0077b5]",
          },
          {
            name: "Twitter",
            icon: Twitter,
            desc: "Auto-tweet trends and threads.",
            color: "text-[#1DA1F2]",
          },
          {
            name: "Instagram",
            icon: Instagram,
            desc: "Post visual summaries and reels.",
            color: "text-[#E1306C]",
          },
          {
            name: "Reddit",
            icon: MessageSquare,
            desc: "Engage in niche communities.",
            color: "text-[#FF4500]",
          },
          {
            name: "YouTube",
            icon: Youtube,
            desc: "Publish video summaries.",
            color: "text-[#FF0000]",
          },
          {
            name: "Slack",
            icon: MessageSquare,
            desc: "Receive real-time notifications.",
            color: "text-[#4A154B]",
          },
          {
            name: "Telegram",
            icon: Send,
            desc: "Get mobile alerts for trends.",
            color: "text-[#0088cc]",
          },
          {
            name: "Email",
            icon: Mail,
            desc: "Receive weekly summaries.",
            color: "text-orange-500",
          },
        ].map((app, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row justify-between items-start space-y-0">
              <div className="p-3 bg-secondary/30 rounded-xl">
                <app.icon className={`h-6 w-6 ${app.color}`} />
              </div>
              {isConnected(app.name) ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-600 border border-green-500/20">
                    <Check className="h-3 w-3" /> Connected
                  </span>
                  {app.name === "LinkedIn" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs"
                      onClick={() => router.push("/integrations/linkedin")}
                    >
                      Configure
                    </Button>
                  )}
                  {app.name === "Twitter" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs"
                      onClick={() => router.push("/integrations/twitter")}
                    >
                      Configure
                    </Button>
                  )}
                  {app.name === "YouTube" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs"
                      onClick={() => router.push("/integrations/youtube")}
                    >
                      Configure
                    </Button>
                  )}
                  {app.name !== "Email" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-xs text-destructive hover:bg-destructive/10"
                      onClick={() => handleDisconnect(app.name)}
                    >
                      Disconnect
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => handleConnect(app.name)}
                >
                  Connect
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-4">
              <CardTitle className="mb-2 text-lg">{app.name}</CardTitle>
              <CardDescription className="text-sm">{app.desc}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
