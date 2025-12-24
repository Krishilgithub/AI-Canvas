"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetcher, poster } from "@/lib/api-client";
import { toast } from "sonner";
import { Rocket, Target, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function OnboardingModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  const [formData, setFormData] = useState({
    role: "",
    niche: "",
    goals: [] as string[]
  });

  const GOALS = [
    "Increase Brand Awareness", 
    "Generate Leads", 
    "Thought Leadership", 
    "Recruitment", 
    "Sales"
  ];

  useEffect(() => {
    // Check if user is onboarded
    const checkOnboarding = async () => {
        try {
            const profile = await fetcher('/profile');
            // If profile exists but not onboarded
            if (profile && !profile.onboarding_completed) {
                setIsOpen(true);
            }
        } catch (e) {
            // Silently fail if extension blocks request or network error
            // This prevents the whole app from crashing due to non-essential onboarding check
            console.warn("Onboarding check skipped due to error:", e);
        } finally {
            setHasChecked(true);
        }
    };
    if (!hasChecked) checkOnboarding();
  }, [hasChecked]);

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const toggleGoal = (goal: string) => {
      setFormData(prev => ({
          ...prev,
          goals: prev.goals.includes(goal) 
            ? prev.goals.filter(g => g !== goal)
            : [...prev.goals, goal]
      }));
  };

  const calculateProgress = () => ((step / 3) * 100);

  const handleFinish = async () => {
      setLoading(true);
      try {
          await poster('/profile', {
              ...formData,
              onboarding_completed: true
          });
          toast.success("All set! Welcome to AI Canvas.");
          setIsOpen(false);
      } catch (e) {
          toast.error("Failed to save profile");
      } finally {
          setLoading(false);
      }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
       <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden gap-0">
           {/* Progress Bar */}
           <div className="h-1 w-full bg-secondary">
               <div 
                 className="h-full bg-primary transition-all duration-300 ease-in-out" 
                 style={{ width: `${calculateProgress()}%` }}
               />
           </div>

           <div className="p-6">
               <DialogHeader className="mb-6">
                   <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 text-primary">
                       {step === 1 && <User className="h-6 w-6" />}
                       {step === 2 && <Target className="h-6 w-6" />}
                       {step === 3 && <Rocket className="h-6 w-6" />}
                   </div>
                   <DialogTitle className="text-xl">
                       {step === 1 && "Tell us about yourself"}
                       {step === 2 && "What are your goals?"}
                       {step === 3 && "Ready for lift off!"}
                   </DialogTitle>
                   <DialogDescription>
                       {step === 1 && "Help us tailor your AI content strategy."}
                       {step === 2 && "Select up to 3 goals you want to achieve."}
                       {step === 3 && "We've customized your workspace."}
                   </DialogDescription>
               </DialogHeader>

               <div className="space-y-4 min-h-[200px]">
                   {step === 1 && (
                       <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                           <div className="space-y-2">
                               <Label>What best describes your role?</Label>
                               <Select onValueChange={(v) => setFormData({...formData, role: v})} defaultValue={formData.role}>
                                   <SelectTrigger>
                                       <SelectValue placeholder="Select a role" />
                                   </SelectTrigger>
                                   <SelectContent>
                                       <SelectItem value="founder">Founder / CEO</SelectItem>
                                       <SelectItem value="marketer">Marketing Manager</SelectItem>
                                       <SelectItem value="freelancer">Freelancer / Consultant</SelectItem>
                                       <SelectItem value="sales">Sales Professional</SelectItem>
                                   </SelectContent>
                               </Select>
                           </div>
                           <div className="space-y-2">
                               <Label>What is your industry / niche?</Label>
                               <Input 
                                   placeholder="e.g. SaaS, FinTech, Health..." 
                                   value={formData.niche}
                                   onChange={(e) => setFormData({...formData, niche: e.target.value})}
                               />
                           </div>
                       </div>
                   )}

                   {step === 2 && (
                       <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-right-4 duration-300">
                           {GOALS.map(goal => (
                               <div 
                                   key={goal}
                                   className={cn(
                                       "p-3 rounded-lg border cursor-pointer transition-all hover:border-primary",
                                       formData.goals.includes(goal) ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card"
                                   )}
                                   onClick={() => toggleGoal(goal)}
                               >
                                   <div className="text-sm font-medium">{goal}</div>
                               </div>
                           ))}
                       </div>
                   )}

                   {step === 3 && (
                       <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 text-center py-4">
                           <p className="text-muted-foreground">
                               Your AI agents are now tuned to <span className="text-foreground font-medium">{formData.niche}</span> trends 
                               and optimized for <span className="text-foreground font-medium">{formData.role}</span> personas.
                           </p>
                           <div className="p-4 bg-secondary/30 rounded-lg text-sm text-left border">
                               <div className="flex justify-between mb-1">
                                   <span>Role</span>
                                   <span className="font-medium">{formData.role}</span>
                               </div>
                               <div className="flex justify-between mb-1">
                                   <span>Niche</span>
                                   <span className="font-medium">{formData.niche}</span>
                               </div>
                               <div className="flex justify-between">
                                   <span>Goals</span>
                                   <span className="font-medium">{formData.goals.length} selected</span>
                               </div>
                           </div>
                       </div>
                   )}
               </div>

               <DialogFooter className="mt-8">
                   {step > 1 && (
                       <Button variant="ghost" onClick={handleBack} disabled={loading}>Back</Button>
                   )}
                   {step < 3 ? (
                       <Button onClick={handleNext} disabled={!formData.role || !formData.niche}>Next Step</Button>
                   ) : (
                       <Button onClick={handleFinish} disabled={loading}>
                           {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>}
                           Get Started
                       </Button>
                   )}
               </DialogFooter>
           </div>
       </DialogContent>
    </Dialog>
  );
}
