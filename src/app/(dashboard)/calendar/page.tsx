import { CalendarView } from "@/components/calendar/calendar-view";

export default function CalendarPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Content Calendar</h2>
        <div className="flex items-center space-x-2">
          {/* Action buttons could go here */}
        </div>
      </div>
      <CalendarView />
    </div>
  );
}
