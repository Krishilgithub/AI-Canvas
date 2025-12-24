import { Sidebar } from "@/components/dashboard/sidebar";
import { OnboardingModal } from "@/components/onboarding/onboarding-modal";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-secondary/5 font-sans" suppressHydrationWarning>
       <aside className="sticky top-0 h-screen hidden md:block">
          <Sidebar />
       </aside>
       {/* Mobile sidebar handling would go here, or Sidebar handles it internally */}
       
       <div className="flex-1 flex flex-col min-h-screen">
          {/* Main Content Area - Flows naturally with window scroll */}
          <main className="flex-1 p-4 md:p-8 pb-20">
             <div className="max-w-6xl mx-auto space-y-8">
                {children}
             </div>
          </main>
       </div>
       <OnboardingModal />
    </div>
  )
}
