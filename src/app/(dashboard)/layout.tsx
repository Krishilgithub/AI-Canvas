import { Sidebar, MobileSidebar } from "@/components/dashboard/sidebar";
import { OnboardingModal } from "@/components/onboarding/onboarding-modal";
import { Sparkles } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex min-h-screen bg-secondary/5 font-sans"
      suppressHydrationWarning
    >
      <Sidebar />

      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <div className="md:hidden p-4 flex items-center justify-between bg-card border-b border-border sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <MobileSidebar />
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
                <Sparkles className="h-3 w-3 text-primary-foreground" />
              </div>
              <span className="font-bold font-heading tracking-tight text-lg">
                AI Canvas
              </span>
            </div>
          </div>
        </div>

        {/* Main Content Area - Flows naturally with window scroll */}
        <main className="flex-1 p-4 md:p-8 pb-20">
          <div className="max-w-6xl mx-auto space-y-8">{children}</div>
        </main>
      </div>
      <OnboardingModal />
    </div>
  );
}
