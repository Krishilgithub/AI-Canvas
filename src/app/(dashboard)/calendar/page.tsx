"use client";
import { useState, useEffect } from "react";
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { fetcher, puter } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Clock, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CreatePostModal } from "@/components/dashboard/create-post-modal";

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedPost, setSelectedPost] = useState<any | undefined>(undefined);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
     loadPosts();
  }, [currentDate]);

  const loadPosts = async () => {
    setLoading(true);
    try {
        const res = await fetcher('/posts?limit=100');
        const list = res.data || res;
        setPosts(Array.isArray(list) ? list : []);
    } catch (e) {
        toast.error("Failed to load schedule");
    } finally {
        setLoading(false);
    }
  };
  
  const getDaysInMonth = (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const days = [];
      
      for (let i = 0; i < firstDay.getDay(); i++) {
          days.push(null);
      }
      
      for (let i = 1; i <= lastDay.getDate(); i++) {
          days.push(new Date(year, month, i));
      }
      
      return days;
  };

  const days = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  const getPostsForDay = (date: Date) => {
      return posts.filter(p => {
          if (!p.scheduled_time) return false;
          const d = new Date(p.scheduled_time);
          return d.getDate() === date.getDate() && 
                 d.getMonth() === date.getMonth() && 
                 d.getFullYear() === date.getFullYear();
      });
  };

  const handleDayClick = (day: Date) => {
      setSelectedDate(day);
      setSelectedPost(undefined);
      setIsModalOpen(true);
  };

  const handlePostClick = (e: React.MouseEvent, post: any) => {
      e.stopPropagation();
      setSelectedPost(post);
      setSelectedDate(undefined);
      setIsModalOpen(true);
  };

  const handleDragStart = (event: any) => {
      setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over || active.id === over.id) return;

      const postId = active.id as string;
      const targetDateStr = over.id as string;

      try {
          // Parse the target date
          const [year, month, day] = targetDateStr.split('-').map(Number);
          const targetDate = new Date(year, month, day);
          
          // Get the post
          const post = posts.find(p => p.id === postId);
          if (!post) return;

          // Keep the same time, just change the date
          const currentTime = new Date(post.scheduled_time);
          targetDate.setHours(currentTime.getHours(), currentTime.getMinutes(), 0, 0);

          // Update via API
          await puter(`/posts/${postId}`, {
              scheduled_time: targetDate.toISOString()
          });

          toast.success("Post rescheduled!");
          loadPosts();
      } catch (e) {
          toast.error("Failed to reschedule post");
      }
  };

  const activePost = activeId ? posts.find(p => p.id === activeId) : null;

  return (
    <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
    >
      <div className="space-y-6 animate-in fade-in duration-500">
         <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
               <h1 className="text-3xl font-bold font-heading">Content Calendar</h1>
               <p className="text-muted-foreground">Schedule and manage your upcoming posts. Drag posts to reschedule.</p>
            </div>
            <div className="flex items-center gap-2 bg-card p-1 rounded-lg border shadow-sm">
               <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
               <span className="w-40 text-center font-medium">{monthName}</span>
               <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
            </div>
         </div>

         <div className="grid grid-cols-7 gap-4 mb-2 text-center text-sm font-medium text-muted-foreground uppercase tracking-wider">
            <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
         </div>

         <div className="grid grid-cols-7 gap-4">
            {days.map((day, i) => (
               <CalendarDay 
                   key={i}
                   day={day}
                   posts={day ? getPostsForDay(day) : []}
                   onDayClick={handleDayClick}
                   onPostClick={handlePostClick}
               />
            ))}
         </div>

          <CreatePostModal 
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              initialDate={selectedDate}
              postToEdit={selectedPost}
              onSuccess={() => {
                  loadPosts();
              }}
          />
      </div>

      <DragOverlay>
          {activePost ? (
              <div className="p-2 bg-card border border-primary rounded-md shadow-xl cursor-grabbing opacity-90">
                  <div className="flex items-center gap-1 text-xs mb-1 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(activePost.scheduled_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                  <div className="text-xs truncate">{activePost.content}</div>
              </div>
          ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function CalendarDay({ day, posts, onDayClick, onPostClick }: any) {
    const dayId = day ? `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}` : null;

    if (!day) {
        return <div className="min-h-[120px] invisible"></div>;
    }

    return (
        <div 
            id={dayId || undefined}
            data-droppable={dayId}
            className={cn(
                "min-h-[120px] rounded-xl border bg-card p-3 relative group transition-all hover:shadow-md"
            )}
        >
            <div className="flex justify-between items-start mb-2">
                <span className={cn(
                    "text-sm font-medium block h-7 w-7 rounded-full flex items-center justify-center",
                    day.toDateString() === new Date().toDateString() ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                )}>
                    {day.getDate()}
                </span>
                
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onDayClick(day)}
                >
                    <Plus className="h-3 w-3" />
                </Button>
            </div>
            
            <div className="space-y-2">
                {posts.map((post: any) => (
                    <DraggablePost key={post.id} post={post} onClick={onPostClick} />
                ))}
            </div>
        </div>
    );
}

function DraggablePost({ post, onClick }: any) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: post.id,
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            onClick={(e) => onClick(e, post)}
            className={cn(
                "text-xs p-2 rounded-md border truncate cursor-grab hover:scale-105 transition-transform shadow-sm",
                post.status === 'published' ? "bg-green-500/10 border-green-500/20 text-green-700" :
                post.status === 'scheduled' ? "bg-blue-500/10 border-blue-500/20 text-blue-700" :
                "bg-secondary text-foreground",
                isDragging && "opacity-50"
            )}
        >
            <div className="flex items-center gap-1 mb-0.5 opacity-70">
                <Clock className="h-3 w-3" />
                {new Date(post.scheduled_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </div>
            {post.content}
        </div>
    );
}

// Hook imports
import { useDraggable, useDroppable } from '@dnd-kit/core';

// Update CalendarDay to be droppable
function DroppableCalendarDay({ day, posts, onDayClick, onPostClick }: any) {
    const dayId = day ? `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}` : null;
    
    const { setNodeRef, isOver } = useDroppable({
        id: dayId || 'empty',
        disabled: !day,
    });

    if (!day) {
        return <div className="min-h-[120px] invisible"></div>;
    }

    return (
        <div 
            ref={setNodeRef}
            className={cn(
                "min-h-[120px] rounded-xl border bg-card p-3 relative group transition-all hover:shadow-md",
                isOver && "ring-2 ring-primary bg-primary/5"
            )}
        >
            <div className="flex justify-between items-start mb-2">
                <span className={cn(
                    "text-sm font-medium block h-7 w-7 rounded-full flex items-center justify-center",
                    day.toDateString() === new Date().toDateString() ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                )}>
                    {day.getDate()}
                </span>
                
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onDayClick(day)}
                >
                    <Plus className="h-3 w-3" />
                </Button>
            </div>
            
            <div className="space-y-2">
                {posts.map((post: any) => (
                    <DraggablePost key={post.id} post={post} onClick={onPostClick} />
                ))}
            </div>
        </div>
    );
}
