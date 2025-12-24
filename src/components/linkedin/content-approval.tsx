"use client";

import { useState, useEffect } from "react";
import { fetcher, poster, puter } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Check, X, RefreshCw, Edit3, Calendar, MoreHorizontal, ChevronLeft, ChevronRight, Image as ImageIcon, Zap, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function ContentApproval() {
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [content, setContent] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch Drafts
  const fetchDrafts = () => {
    fetcher(`/posts?status=needs_approval&page=${page}&limit=10`)
      .then(res => {
         const list = res.data || res;
         setDrafts(Array.isArray(list) ? list : []);
         if (res.meta) setTotalPages(Math.ceil(res.meta.total / res.meta.limit));
         
         if (list.length > 0 && !selectedPostId) {
            setSelectedPostId(list[0].id);
            setContent(list[0].content);
         }
      })
      .catch(err => {
        console.error("Fetch error:", err);
        toast.error("Could not fetch drafts");
      });
  };

  useEffect(() => {
     fetchDrafts();
  }, [page]);

  useEffect(() => {
     if (selectedPostId) {
        const post = drafts.find(d => d.id === selectedPostId);
        if (post) setContent(post.content);
     }
  }, [selectedPostId, drafts]);

  // Save Edit
  const handleSave = async () => {
      if (!activePost) return;
      
      toast.promise(
          puter(`/posts/${activePost.id}`, { content: content }),
          {
              loading: "Saving changes...",
              success: () => {
                  fetchDrafts(); // Refresh to get latest state
                  return "Draft saved successfully";
              },
              error: "Failed to save draft"
          }
      );
  };

  const activePost = drafts.find(d => d.id === selectedPostId);


  const handleApprove = async () => {
     if (!activePost) return;
     toast.promise(
         poster('/trigger-post', { post_id: activePost.id }), // user_id removed, handled by auth
         {
             loading: 'Publishing to LinkedIn...',
             success: 'Post published successfully!',
             error: 'Failed to publish post'
         }
     );
  };

  return (
    <div className="grid lg:grid-cols-12 gap-6 h-[calc(100vh-220px)] animate-in fade-in slide-in-from-bottom-4 duration-500">
       
       {/* Left: Queue List */}
       <div className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto pr-2">
          {drafts.length === 0 && (
             <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-xl">
                No drafts found. <br /> Check the Trends tab to generate some.
             </div>
          )}
          {drafts.map(draft => (
             <div 
               key={draft.id}
               onClick={() => setSelectedPostId(draft.id)}
               className={cn(
                  "p-4 rounded-xl border cursor-pointer transition-all duration-200 group relative",
                  selectedPostId === draft.id 
                    ? "bg-card border-primary ring-1 ring-primary/20 shadow-md" 
                    : "bg-card/50 border-border hover:border-primary/50 hover:bg-secondary/20"
               )}
             >
                <div className="flex justify-between items-start mb-2">
                   <h4 className={cn("font-semibold text-sm line-clamp-1", selectedPostId === draft.id ? "text-primary" : "text-foreground")}>
                      {draft.content.substring(0, 30)}...
                   </h4>
                   <StatusBadge status={draft.status} />
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                   {draft.content}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                   <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(draft.created_at).toLocaleDateString()}</span>
                </div>
             </div>
          ))}

           
           {/* Pagination */}
           <div className="flex gap-2 justify-center py-2 mt-auto">
                <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs self-center">Page {page} of {totalPages || 1}</span>
                <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
           </div>
       </div>

       {/* Right: Editor / Preview */}
       {activePost ? (
       <Card className="lg:col-span-8 flex flex-col border-border shadow-sm overflow-hidden h-full">
          <div className="border-b px-6 py-4 flex items-center justify-between bg-card">
              <div className="flex items-center gap-3">
                 <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                 <div>
                    <h3 className="font-bold text-sm">Reviewing Draft</h3>
                    <p className="text-xs text-muted-foreground">Generated by Agent • {content.length} chars</p>
                 </div>
              </div>
              <div className="flex gap-2">
                     {editMode ? (
                         <div className="flex gap-2">
                             <Button variant="outline" size="sm" onClick={() => { setEditMode(false); setContent(activePost.content); }}>Cancel</Button>
                             <Button variant="default" size="sm" onClick={() => { handleSave(); setEditMode(false); }}>Save Changes</Button>
                         </div>
                     ) : (
                         <Button variant="ghost" size="sm" onClick={() => setEditMode(true)}>
                             <Edit3 className="h-4 w-4 mr-2" />
                             Edit Content
                         </Button>
                     )}
              </div>
          </div>
          

          
          <div className="flex-1 overflow-y-auto bg-secondary/5 p-6 md:p-10">
              <div className="max-w-2xl mx-auto space-y-4">
                 {/* Scheduling Controls */}
                 {editMode && (
                    <div className="bg-card border p-4 rounded-xl shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2">
                       <h4 className="text-sm font-semibold flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" /> Scheduling
                       </h4>
                       <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                             <label className="text-xs font-medium text-muted-foreground">Publish Date</label>
                             <input 
                                type="datetime-local" 
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={activePost.scheduled_time ? new Date(activePost.scheduled_time).toISOString().slice(0, 16) : ""}
                                onChange={(e) => {
                                    // Update local state or save immediately? better to save on 'Save Changes'
                                    // For now, let's update local draft list to reflect change in UI, actual save happens on Save or Schedule
                                    const newTime = e.target.value ? new Date(e.target.value).toISOString() : null;
                                    const updatedDrafts = drafts.map(d => d.id === activePost.id ? { ...d, scheduled_time: newTime } : d);
                                    setDrafts(updatedDrafts);
                                }}
                             />
                          </div>
                          <div className="flex items-end">
                             <p className="text-xs text-muted-foreground mb-2">
                                {activePost.scheduled_time ? `Scheduled for ${new Date(activePost.scheduled_time).toLocaleString()}` : "Not scheduled yet"}
                             </p>
                          </div>
                       </div>
                    </div>
                 )}

                 {/* Post Preview */}
                 <div className="bg-card border shadow-sm rounded-xl overflow-hidden min-h-[300px]">
                     {/* LinkedIn Mock Header */}
                     <div className="p-4 border-b flex gap-3">
                        <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center font-bold text-primary">KA</div>
                        <div>
                            <div className="font-semibold text-sm">Krishil Agrawal</div>
                            <div className="text-xs text-muted-foreground">Building AI Canvas • Now • <span className="opacity-60">🌐</span></div>
                        </div>
                     </div>
                     
                     {/* Post Content */}
                     <div className="p-4 md:p-6 text-sm md:text-base leading-relaxed whitespace-pre-wrap font-sans text-foreground/90">
                        {editMode ? (
                            <textarea 
                               className="w-full h-[300px] bg-transparent resize-none focus:outline-none" 
                               value={content}
                               onChange={(e) => setContent(e.target.value)}
                            />
                        ) : (
                            content
                        )}
                     </div>

                     {/* Mock Footer Actions */}
                     <div className="border-t bg-secondary/5 px-4 py-3 flex justify-between text-muted-foreground">
                        <div className="flex gap-4 text-xs font-medium">
                           <span>Like</span>
                           <span>Comment</span>
                           <span>Repost</span>
                           <span>Send</span>
                        </div>
                     </div>
                  </div>
              </div>
          </div>

          <div className="border-t p-4 bg-card flex justify-between gap-4">
             <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
             </Button>
             <div className="flex gap-3">
                <Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive">
                   <X className="mr-2 h-4 w-4" /> Reject
                </Button>
                
                {activePost.status === 'published' ? (
                   <Button disabled className="bg-secondary text-muted-foreground">
                      <Check className="mr-2 h-4 w-4" /> Published
                   </Button>
                ) : (
                   <div className="flex gap-2">
                       <Button 
                          variant="outline"
                          onClick={() => {
                              toast.promise(
                                  poster('/trigger-post', { post_id: activePost.id }),
                                  {
                                      loading: 'Publishing now...',
                                      success: 'Published successfully!',
                                      error: 'Failed to publish'
                                  }
                              );
                          }}
                       >
                          <Zap className="mr-2 h-4 w-4" /> Publish Now
                       </Button>
                       <Button 
                          onClick={() => {
                              if (!activePost.scheduled_time) {
                                  toast.error("Please set a schedule time first (click Edit)");
                                  setEditMode(true);
                                  return;
                              }
                              toast.promise(
                                  puter(`/posts/${activePost.id}`, { status: 'scheduled', scheduled_time: activePost.scheduled_time }),
                                  {
                                      loading: 'Scheduling...',
                                      success: () => {
                                          fetchDrafts();
                                          return 'Post scheduled!';
                                      },
                                      error: 'Failed to schedule'
                                  }
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
  )
}

function StatusBadge({ status }: { status: string }) {
   if (status === "approved") {
      return <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/20">Approved</span>
   }
   if (status === "published") {
      return <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">Published</span>
   }
   if (status === "rejected") {
      return <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 border border-red-500/20">Rejected</span>
   }
   return <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">Review</span>
}


