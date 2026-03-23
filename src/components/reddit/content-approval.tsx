"use client";

import { useState, useEffect } from "react";
import { fetcher, poster, puter } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Check,
  X,
  RefreshCw,
  Edit3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Zap,
  Clock,
  MessageSquare,
  Share2,
  ArrowBigUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function ContentApproval() {
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [title, setTitle] = useState(""); // Reddit needs a title
  const [content, setContent] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch Drafts
  const fetchDrafts = () => {
    fetcher(
      `/posts?status=needs_approval&page=${page}&limit=10&platform=reddit`,
    ) // Filter by platform if backend supports it, otherwise filtering might be needed client side or assumed
      .then((res) => {
        const list = res.data || res;
        setDrafts(Array.isArray(list) ? list : []);
        if (res.meta) setTotalPages(Math.ceil(res.meta.total / res.meta.limit));

        if (list.length > 0 && !selectedPostId) {
          setSelectedPostId(list[0].id);
          setTitle(list[0].title || "Interesting Title"); // Assuming drafts have titles
          setContent(list[0].content);
        }
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        // Toast suppressed for now to avoid spamming if endpoint doesn't exist yet
      });
  };

  useEffect(() => {
    fetchDrafts();
  }, [page]);

  useEffect(() => {
    if (selectedPostId) {
      const post = drafts.find((d) => d.id === selectedPostId);
      if (post) {
        setContent(post.content);
        setTitle(post.title || "Untitled Post");
      }
    }
  }, [selectedPostId, drafts]);

  // Save Edit
  const handleSave = async () => {
    if (!activePost) return;

    toast.promise(
      puter(`/posts/${activePost.id}`, { content: content, title: title }),
      {
        loading: "Saving changes...",
        success: () => {
          fetchDrafts(); // Refresh to get latest state
          return "Draft saved successfully";
        },
        error: "Failed to save draft",
      },
    );
  };

  const activePost = drafts.find((d) => d.id === selectedPostId);

  return (
    <div className="grid lg:grid-cols-12 gap-6 h-[800px] lg:h-[calc(100vh-220px)] animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Left: Queue List */}
      <div className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto pr-2 pb-4">
        {drafts.length === 0 && (
          <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-xl">
            No Reddit drafts found. <br /> Check the Trends tab to generate
            some.
          </div>
        )}
        {drafts.map((draft) => (
          <div
            key={draft.id}
            onClick={() => setSelectedPostId(draft.id)}
            className={cn(
              "p-4 rounded-xl border cursor-pointer transition-all duration-200 group relative",
              selectedPostId === draft.id
                ? "bg-card border-primary ring-1 ring-primary/20 shadow-md"
                : "bg-card/50 border-border hover:border-primary/50 hover:bg-secondary/20",
            )}
          >
            <div className="flex justify-between items-start mb-2">
              <h4
                className={cn(
                  "font-semibold text-sm line-clamp-1",
                  selectedPostId === draft.id
                    ? "text-primary"
                    : "text-foreground",
                )}
              >
                {draft.title || draft.content.substring(0, 30)}
              </h4>
              <StatusBadge status={draft.status} />
            </div>
            <div className="text-xs font-mono text-muted-foreground mb-1">
              r/{draft.subreddit || "all"}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
              {draft.content}
            </p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />{" "}
                {new Date(draft.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}

        {/* Pagination */}
        <div className="flex gap-2 justify-center py-2 mt-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs self-center">
            Page {page} of {totalPages || 1}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Right: Editor / Preview */}
      {activePost ? (
        <Card className="lg:col-span-8 flex flex-col border-border shadow-sm overflow-hidden h-full">
          <div className="border-b px-6 py-4 flex items-center justify-between bg-card">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-[#FF4500] animate-pulse" />
              <div>
                <h3 className="font-bold text-sm">Reviewing Reddit Draft</h3>
                <p className="text-xs text-muted-foreground">
                  Target: r/{activePost.subreddit || "generic"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {editMode ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditMode(false);
                      setContent(activePost.content);
                      setTitle(activePost.title || "");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      handleSave();
                      setEditMode(false);
                    }}
                  >
                    Save Changes
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditMode(true)}
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Content
                </Button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-[#DAE0E6] dark:bg-black/20 p-6 md:p-10">
            <div className="max-w-2xl mx-auto space-y-4">
              {/* Scheduling Controls */}
              {editMode && (
                <div className="bg-card border p-4 rounded-xl shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" /> Scheduling
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        Publish Date
                      </label>
                      <input
                        type="datetime-local"
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={
                          activePost.scheduled_time
                            ? new Date(activePost.scheduled_time)
                                .toISOString()
                                .slice(0, 16)
                            : ""
                        }
                        onChange={(e) => {
                          const newTime = e.target.value
                            ? new Date(e.target.value).toISOString()
                            : null;
                          const updatedDrafts = drafts.map((d) =>
                            d.id === activePost.id
                              ? { ...d, scheduled_time: newTime }
                              : d,
                          );
                          setDrafts(updatedDrafts);
                        }}
                      />
                    </div>
                    <div className="flex items-end">
                      <p className="text-xs text-muted-foreground mb-2">
                        {activePost.scheduled_time
                          ? `Scheduled for ${new Date(activePost.scheduled_time).toLocaleString()}`
                          : "Not scheduled yet"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Reddit Post Preview */}
              <div className="bg-card border shadow-sm rounded-md overflow-hidden min-h-[200px] flex">
                {/* Vote Column (Mock) */}
                <div className="w-10 bg-secondary/10 flex flex-col items-center py-3 gap-1 border-r border-border/10">
                  <ArrowBigUp className="h-6 w-6 text-muted-foreground hover:text-[#FF4500] cursor-pointer" />
                  <span className="text-xs font-bold my-1">1</span>
                  <ArrowBigUp className="h-6 w-6 rotate-180 text-muted-foreground hover:text-blue-500 cursor-pointer" />
                </div>

                {/* Content Column */}
                <div className="flex-1 p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <span className="font-bold text-foreground">
                      r/{activePost.subreddit || "subreddit"}
                    </span>
                    <span>•</span>
                    <span>Posted by u/AI_Agent</span>
                    <span>•</span>
                    <span>Just now</span>
                  </div>

                  {editMode ? (
                    <div className="space-y-2">
                      <input
                        className="w-full text-lg font-bold bg-transparent border-none focus:outline-none placeholder:text-muted-foreground/50"
                        placeholder="Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                      <textarea
                        className="w-full h-[200px] bg-transparent resize-none focus:outline-none text-sm leading-relaxed"
                        placeholder="Text (optional)"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                      />
                    </div>
                  ) : (
                    <div>
                      <h2 className="text-lg font-bold mb-2 pr-4">{title}</h2>
                      <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                        {content}
                      </div>
                    </div>
                  )}

                  {/* Mock Footer Actions */}
                  <div className="flex gap-4 mt-3 text-muted-foreground">
                    <div className="flex items-center gap-1 hover:bg-secondary/20 p-1.5 rounded cursor-pointer transition-colors">
                      <MessageSquare className="h-4 w-4" />
                      <span className="text-xs font-bold">Comments</span>
                    </div>
                    <div className="flex items-center gap-1 hover:bg-secondary/20 p-1.5 rounded cursor-pointer transition-colors">
                      <Share2 className="h-4 w-4" />
                      <span className="text-xs font-bold">Share</span>
                    </div>
                    <div className="flex items-center gap-1 hover:bg-secondary/20 p-1.5 rounded cursor-pointer transition-colors">
                      <span className="text-xs font-bold">...</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t p-4 bg-card flex justify-between gap-4">
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
            </Button>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="mr-2 h-4 w-4" /> Reject
              </Button>

              {activePost.status === "published" ? (
                <Button disabled className="bg-secondary text-muted-foreground">
                  <Check className="mr-2 h-4 w-4" /> Published
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      toast.promise(
                        poster("/trigger-post", {
                          post_id: activePost.id,
                          platform: "reddit",
                        }),
                        {
                          loading: "Publishing to Reddit...",
                          success: "Published successfully!",
                          error: "Failed to publish",
                        },
                      );
                    }}
                  >
                    <Zap className="mr-2 h-4 w-4" /> Publish Now
                  </Button>
                  <Button
                    onClick={() => {
                      if (!activePost.scheduled_time) {
                        toast.error(
                          "Please set a schedule time first (click Edit)",
                        );
                        setEditMode(true);
                        return;
                      }
                      toast.promise(
                        puter(`/posts/${activePost.id}`, {
                          status: "scheduled",
                          scheduled_time: activePost.scheduled_time,
                        }),
                        {
                          loading: "Scheduling...",
                          success: () => {
                            fetchDrafts();
                            return "Post scheduled!";
                          },
                          error: "Failed to schedule",
                        },
                      );
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20"
                  >
                    <Calendar className="mr-2 h-4 w-4" /> Schedule
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>
      ) : (
        <div className="lg:col-span-8 flex items-center justify-center h-full border rounded-xl border-dashed text-muted-foreground">
          Select a draft to review
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") {
    return (
      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/20">
        Approved
      </span>
    );
  }
  if (status === "published") {
    return (
      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
        Published
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 border border-red-500/20">
        Rejected
      </span>
    );
  }
  return (
    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
      Review
    </span>
  );
}
