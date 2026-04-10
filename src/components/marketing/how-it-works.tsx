"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScanSearch, BrainCircuit, PenTool, UserCheck, Send } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    icon: ScanSearch,
    title: "1. Trend Detection",
    desc: "AI scans LinkedIn, Twitter/X, and Reddit 24/7 for rising topics in your niche."
  },
  {
    icon: BrainCircuit,
    title: "2. Pattern Analysis",
    desc: "Deconstructs viral posts to understand hooks and structure."
  },
  {
    icon: PenTool,
    title: "3. Content Generation",
    desc: "Generates 10+ high-quality drafts tailored to your voice."
  },
  {
    icon: UserCheck,
    title: "4. Human Approval",
    desc: "You review, edit, or approve. Nothing goes live without you."
  },
  {
    icon: Send,
    title: "5. Auto Publishing",
    desc: "Scheduled posting at peak engagement times."
  }
];

export function HowItWorks() {
  const container = useRef(null);
  
  useGSAP(() => {
    const items = gsap.utils.toArray('.process-item');
    
    items.forEach((item: any, i) => {
       gsap.fromTo(item, 
         { opacity: 0, x: -50 },
         {
           opacity: 1, 
           x: 0,
           duration: 0.8,
           ease: "power3.out",
           scrollTrigger: {
              trigger: item,
              start: "top 75%",
              toggleActions: "play none none reverse"
           }
         }
       );
    });

  }, { scope: container });

  return (
    <section ref={container} className="py-32 bg-background relative overflow-hidden" id="how-it-works">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="text-center mb-24">
           <h2 className="text-3xl md:text-5xl font-bold font-heading mb-6">Automate without losing your soul</h2>
           <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
             A complete end-to-end pipeline that respects your creative control.
           </p>
        </div>

        <div className="max-w-4xl mx-auto relative">
           {/* Connecting Line Background */}
           <div className="absolute left-8 top-8 bottom-0 w-0.5 bg-border -ml-[1px] hidden md:block" />

           {steps.map((step, i) => (
             <div key={i} className="process-item flex gap-8 mb-16 relative md:pl-0">
               <div className="hidden md:flex flex-col items-center shrink-0 z-10">
                  <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center shadow-sm">
                    <step.icon className="w-7 h-7 text-primary/80" />
                  </div>
               </div>
               
               {/* Mobile Icon */}
               <div className="md:hidden absolute -left-2 top-0">
                  <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center shadow-sm">
                    <step.icon className="w-5 h-5 text-primary/80" />
                  </div>
               </div>

               <div className="pl-14 md:pl-0 pt-1 md:pt-3">
                 <h3 className="text-2xl font-bold font-heading mb-3">{step.title}</h3>
                 <p className="text-muted-foreground text-lg leading-relaxed max-w-xl">{step.desc}</p>
               </div>
             </div>
           ))}
        </div>
      </div>
    </section>
  );
}
