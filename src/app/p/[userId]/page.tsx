"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetcher } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, CheckCircle2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Link from "next/link";

export default function PublicPortfolioPage() {
  const params = useParams();
  const userId = params.userId as string;
  const [data, setData] = useState<{ profile: Record<string, unknown>; posts: Record<string, unknown>[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const loadPortfolio = async () => {
      try {
        const res = await fetcher(`/api/v1/user/portfolio/${userId}`);
        setData(res);
      } catch (err) {
        console.error("Portfolio fetch failed", err);
      } finally {
        setLoading(false);
      }
    };
    loadPortfolio();
  }, [userId]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Portfolio link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center animate-pulse text-muted-foreground">Loading Portfolio...</div>;
  }

  if (!data?.profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <h1 className="text-3xl font-bold font-heading">Portfolio Not Found</h1>
        <p className="text-muted-foreground">This content creator does not exist or has removed their profile.</p>
        <Button asChild><Link href="/">Build your own AI Canvas</Link></Button>
      </div>
    );
  }

  const { profile, posts } = data;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-indigo-500/30">
      <div className="max-w-4xl mx-auto px-4 py-16 sm:py-24 space-y-12">
        {/* Header Profile Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-12 border-b border-border/50">
          <div className="space-y-4 max-w-2xl">
            <Badge variant="outline" className="border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-500/5 px-3 py-1 text-xs">
              AI-Powered Creator Portfolio
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold font-heading tracking-tight text-foreground">
              {profile.full_name || "Anonymous Creator"}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {profile.bio || `A top voice in ${profile.niche || 'Technology'} acting as a ${profile.role || 'Thought Leader'}.`}
            </p>
            <div className="flex items-center gap-3 pt-2">
              <Button onClick={copyLink} variant="outline" className="gap-2 shrink-0 rounded-full">
                {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Share Portfolio"}
              </Button>
            </div>
          </div>
          
          {/* AI CTA Card */}
          <Card className="shrink-0 md:w-64 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20 shadow-none">
            <CardContent className="p-6 space-y-4">
               <div className="h-10 w-10 rounded-xl bg-indigo-500 flex items-center justify-center shadow-inner">
                 <User className="h-5 w-5 text-white" />
               </div>
               <div>
                 <h3 className="font-bold text-base mb-1">Supercharge Your Growth</h3>
                 <p className="text-sm text-muted-foreground leading-snug">
                   Build an autonomous audience like {profile.full_name?.split(' ')[0] || 'them'} using AI Canvas.
                 </p>
               </div>
               <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all" asChild>
                 <Link href="/">Try For Free</Link>
               </Button>
            </CardContent>
          </Card>
        </div>

        {/* Top Performing Posts Stream */}
        <div className="space-y-8">
          <div className="flex items-center justify-between">
             <h2 className="text-2xl font-bold font-heading">Top Performing Content</h2>
             <span className="text-sm text-muted-foreground">{posts.length} verified posts</span>
          </div>

          <div className="grid gap-6">
            {posts.length === 0 ? (
              <div className="bg-secondary/20 border border-border/50 rounded-2xl p-12 text-center text-muted-foreground">
                No published content available yet.
              </div>
            ) : (
              posts.map((post) => (
                <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 border-border/60 bg-white dark:bg-slate-900 group">
                  <CardHeader className="bg-secondary/20 pb-4 border-b border-border/30 flex flex-row items-start justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold tracking-wide text-muted-foreground uppercase flex items-center gap-2">
                         {post.ai_metadata?.platform || "LinkedIn"}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground/80 mt-1">
                        Published {new Date(post.published_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    {post.ai_metadata?.topic && (
                       <Badge variant="secondary" className="font-normal truncate max-w-[200px]">
                         {post.ai_metadata.topic}
                       </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="p-6">
                    <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed text-sm md:text-base">
                      {post.content}
                    </p>
                    <div className="mt-6 flex items-center justify-between">
                       <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          ✨ Powered by AI Canvas
                       </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
