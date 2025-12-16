import { CheckCircle2, ShieldCheck, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HumanLoop() {
  return (
    <section className="py-32 overflow-hidden bg-background">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
           <div className="order-2 md:order-1 relative">
              {/* Mock UI Card */}
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent blur-[80px] rounded-full" />
              <div className="relative bg-card border border-border rounded-2xl p-8 shadow-2xl md:rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
                 {/* Mock Content */}
                 <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
                    <div className="flex items-center gap-3">
                       <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <UserCheck className="h-4 w-4 text-primary" />
                       </div>
                       <span className="text-sm font-semibold">Approval Required</span>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">ID: #8291</span>
                 </div>
                 <div className="space-y-3 mb-8">
                    <div className="h-4 bg-muted/50 rounded w-11/12" />
                    <div className="h-4 bg-muted/50 rounded w-full" />
                    <div className="h-4 bg-muted/50 rounded w-10/12" />
                    <div className="h-4 bg-muted/50 rounded w-full" />
                 </div>
                 <div className="flex gap-3">
                    <button className="flex-1 h-10 bg-primary rounded-md flex items-center justify-center text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors">
                        Approve & Schedule
                    </button>
                    <button className="h-10 px-4 border border-input rounded-md flex items-center justify-center font-medium text-sm hover:bg-secondary transition-colors">
                        Reject
                    </button>
                 </div>
              </div>
           </div>

           <div className="order-1 md:order-2">
              <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary mb-6">
                 <ShieldCheck className="w-4 h-4 mr-2" />
                 Safety First
              </div>
              <h2 className="text-3xl md:text-5xl font-bold font-heading mb-6">You are the Editor-in-Chief.</h2>
              <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                Most AI tools post garbage automatically. We don&apos;t. 
                Our &quot;Human-in-the-Loop&quot; workflow ensures nothing goes live 
                without your explicit one-click approval.
              </p>
              
              <ul className="space-y-4 mb-8">
                {["100% Control over tone and voice", "One-click Edit & Approve", "Prevent AI hallucinations"].map((item, i) => (
                   <li key={i} className="flex items-center gap-3">
                      <div className="bg-primary/10 p-1 rounded-full">
                         <CheckCircle2 className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-foreground font-medium">{item}</span>
                   </li>
                ))}
              </ul>
           </div>
        </div>
      </div>
    </section>
  )
}
