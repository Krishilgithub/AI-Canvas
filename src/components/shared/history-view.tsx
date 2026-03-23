"use client";

import { useState, useEffect } from "react";
import { fetcher } from "@/lib/api-client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Clock, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface HistoryViewProps {
  platform: string;
}

export function HistoryView({ platform }: HistoryViewProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      try {
        const res = await fetcher(
          `/posts?status=published,failed&platform=${platform.toLowerCase()}&page=${page}&limit=10`
        );
        const list = res.data || res;
        setLogs(Array.isArray(list) ? list : []);
        if (res.meta) setTotalPages(Math.ceil(res.meta.total / res.meta.limit));
      } catch (err) {
        console.error("Fetch history error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [platform, page]);

  return (
    <>
      <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <CardHeader>
          <CardTitle className="capitalize">{platform} Automation History</CardTitle>
          <CardDescription>Log of all processed and published posts on {platform}. Click on any post to view details.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground animate-pulse">
                Loading history...
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-xl">
                No historical posts found for {platform}.
              </div>
            ) : (
              logs.map((log, i) => (
                <div
                  key={log.id || i}
                  onClick={() => setSelectedPost(log)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border/50 hover:bg-secondary/20 hover:border-primary/50 cursor-pointer transition-all duration-200 group group-hover:shadow-sm"
                >
                  <div className="flex flex-col gap-1 max-w-[70%]">
                    <span className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
                      {log.content?.substring(0, 60)}...
                    </span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {new Date(log.created_at || Date.now()).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-2 sm:mt-0">
                    <span
                      className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider border",
                        log.status === "published"
                          ? "bg-green-500/10 text-green-600 border-green-500/20"
                          : "bg-red-500/10 text-red-600 border-red-500/20"
                      )}
                    >
                      {log.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {!loading && logs.length > 0 && (
            <div className="flex items-center justify-between pt-6 mt-4 border-t border-border/50">
              <div className="text-xs text-muted-foreground font-medium">
                Page {page} of {totalPages || 1}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Post Details Modal */}
      <Dialog open={!!selectedPost} onOpenChange={(open) => !open && setSelectedPost(null)}>
        <DialogContent className="sm:max-w-[550px] bg-background">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
               Post Details
               {selectedPost && (
                 <span
                   className={cn(
                     "px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider border",
                     selectedPost.status === "published"
                       ? "bg-green-500/10 text-green-600 border-green-500/20"
                       : "bg-red-500/10 text-red-600 border-red-500/20"
                   )}
                 >
                   {selectedPost.status}
                 </span>
               )}
            </DialogTitle>
            <DialogDescription>
              {selectedPost && new Date(selectedPost.created_at).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          
          {selectedPost && (
            <div className="space-y-4 pt-4">
              {selectedPost.error_message && (
                <div className="bg-red-500/10 text-red-600 p-3 rounded-lg text-sm border border-red-500/20 flex gap-2 items-start">
                  <Info className="h-5 w-5 shrink-0" />
                  <p>{selectedPost.error_message}</p>
                </div>
              )}
              
              <div className="bg-secondary/30 rounded-xl p-4 border border-border/50">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Generated Content</h4>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                  {selectedPost.content}
                </p>
              </div>

              {selectedPost.ai_metadata?.topic && (
                 <div className="bg-secondary/10 rounded-xl p-4 border border-border/30">
                   <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">AI Context</h4>
                   <p className="text-xs text-muted-foreground">
                     <span className="font-medium text-foreground">Trend Topic:</span> {selectedPost.ai_metadata.topic}
                   </p>
                 </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
