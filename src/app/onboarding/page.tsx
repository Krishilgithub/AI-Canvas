import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { Sparkles } from "lucide-react";

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 sm:p-8 font-sans">
      
      {/* Subtle background decoration */}
      <div className="absolute top-0 w-full h-[300px] bg-gradient-to-b from-primary/5 via-primary/5 to-transparent pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/20 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute top-40 -left-40 w-72 h-72 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none" />

      {/* Header Logo */}
      <div className="flex items-center gap-2 mb-8 z-10 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-lg shadow-primary/20">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-bold font-heading tracking-tight text-xl">
          AI Canvas
        </span>
      </div>

      <div className="w-full max-w-4xl z-10">
        <OnboardingWizard />
      </div>

    </div>
  );
}
