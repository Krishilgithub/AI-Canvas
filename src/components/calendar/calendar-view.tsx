"use client";

import { useState, useEffect } from "react";
import { fetcher } from "@/lib/api-client";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DndContext, useDraggable, useDroppable, DragEndEvent } from "@dnd-kit/core";
import { toast } from "sonner";
import { CSS } from "@dnd-kit/utilities";

interface Post {
  id: string;
  content: string;
  status: string;
  scheduled_for: string;
  platforms: string[];
}

function DraggablePost({ post }: { post: Post }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: post.id,
    data: post,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`text-xs p-1.5 rounded-md truncate cursor-grab active:cursor-grabbing transition-colors
        ${isDragging ? "opacity-50 ring-2 ring-primary z-50 shadow-lg relative" : "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"}
      `}
      title={post.content}
    >
      {format(new Date(post.scheduled_for), "h:mm a")} - {post.status}
    </div>
  );
}

function DroppableDayCell({ day, isCurrentMonth, isToday, idx, children }: any) {
  const { setNodeRef, isOver } = useDroppable({
    id: day.toISOString(),
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[120px] p-2 border-border transition-colors border-t border-l
        ${!isCurrentMonth ? "bg-secondary/5 text-muted-foreground" : "bg-card"}
        ${isOver ? "bg-primary/5 ring-inset ring-2 ring-primary" : ""}
        ${idx % 7 === 0 ? "border-l-0" : ""}
      `}
    >
      <div className="flex justify-between items-start mb-2">
        <span
          className={`text-sm font-medium h-7 w-7 flex items-center justify-center rounded-full
            ${isToday ? "bg-primary text-primary-foreground" : ""}
          `}
        >
          {format(day, "d")}
        </span>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPosts() {
      try {
        setLoading(true);
        const response: any = await fetcher("/posts");
        if (response && Array.isArray(response.data)) {
           setPosts(response.data.filter((p: Post) => p.scheduled_for));
        } else if (Array.isArray(response)) {
           setPosts(response.filter((p: Post) => p.scheduled_for));
        } else {
           setPosts([]);
        }
      } catch (error) {
        console.error("Failed to load posts for calendar", error);
      } finally {
        setLoading(false);
      }
    }
    loadPosts();
  }, [currentDate]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday start
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const today = () => setCurrentDate(new Date());

  const getPostsForDay = (day: Date) => {
    return posts.filter((post) => isSameDay(new Date(post.scheduled_for), day));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    
    const newDateStr = over.id as string;
    const postId = active.id as string;
    
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    
    const oldDate = new Date(post.scheduled_for);
    const newDay = new Date(newDateStr);
    
    newDay.setHours(oldDate.getHours());
    newDay.setMinutes(oldDate.getMinutes());
    newDay.setSeconds(oldDate.getSeconds());
    
    const isoString = newDay.toISOString();
    
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, scheduled_for: isoString } : p))
    );
    
    try {
       await fetcher(`/posts/${postId}`, {
         method: "PUT",
         body: JSON.stringify({ scheduled_for: isoString }),
       });
       toast.success("Post rescheduled to " + format(newDay, "MMM d"));
    } catch(e) {
       toast.error("Failed to reschedule post.");
       // Revert on error could be implemented here
    }
  };

  return (
    <div className="bg-background rounded-xl border border-border shadow-sm overflow-hidden flex flex-col h-[750px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold w-48 font-heading">
            {format(currentDate, "MMMM yyyy")}
          </h2>
        </div>
        <div className="flex items-center gap-1 bg-secondary/30 p-1 rounded-md">
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-background" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 px-3 font-medium hover:bg-background" onClick={today}>
            Today
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-background" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Grid Header */}
      <div className="grid grid-cols-7 bg-secondary/20">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-y-auto">
        <DndContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-7 h-full auto-rows-[minmax(130px,1fr)]">
            {days.map((day, idx) => {
              const dayPosts = getPostsForDay(day);
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isToday = isSameDay(day, new Date());

              return (
                <DroppableDayCell
                  key={day.toString()}
                  day={day}
                  isCurrentMonth={isCurrentMonth}
                  isToday={isToday}
                  idx={idx}
                >
                  {dayPosts.map((post) => (
                    <DraggablePost key={post.id} post={post} />
                  ))}
                </DroppableDayCell>
              );
            })}
          </div>
        </DndContext>
      </div>
    </div>
  );
}
