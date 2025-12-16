import { Sidebar } from "@/components/dashboard/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-secondary/5 font-sans">
       <Sidebar />
       <div className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto p-4 md:p-8 relative scroll-smooth">
             <div className="max-w-6xl mx-auto space-y-8 pb-20">
                {children}
             </div>
          </main>
       </div>
    </div>
  )
}
