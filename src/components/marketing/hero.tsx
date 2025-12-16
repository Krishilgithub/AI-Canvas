"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Button } from "@/components/ui/button";
import { ArrowRight, PlayCircle } from "lucide-react";

gsap.registerPlugin(useGSAP);

export function Hero() {
  const container = useRef(null);
  
  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    
    tl.from(".hero-badge", {
       y: 20,
       opacity: 0,
       duration: 0.6,
    })
    .from(".hero-heading", {
      y: 40,
      opacity: 0,
      duration: 0.8,
      stagger: 0.2
    }, "-=0.3")
    .from(".hero-subtext", {
      y: 20,
      opacity: 0,
      duration: 0.6
    }, "-=0.5")
     .from(".hero-actions", {
      y: 20,
      opacity: 0,
      duration: 0.6
    }, "-=0.4");
    
  }, { scope: container });

  return (
    <section ref={container} className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl -z-10 pointer-events-none">
         <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-primary/10 blur-[120px] rounded-full opacity-50 mix-blend-multiply dark:mix-blend-normal" />
      </div>

      <div className="container px-4 md:px-6 mx-auto flex flex-col items-center text-center">
        
        <div className="hero-badge mb-6 inline-flex items-center rounded-full border border-primary/10 bg-primary/5 px-3 py-1 text-sm font-medium text-primary backdrop-blur-sm">
          <span className="flex h-2 w-2 rounded-full bg-primary/80 mr-2 animate-pulse"></span>
          Now in Public Beta
        </div>

        <h1 className="hero-heading max-w-4xl text-5xl md:text-7xl font-bold font-heading tracking-tight text-foreground mb-6">
          Turn LinkedIn Trends into <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-b from-primary to-primary/60">
            Viral Authority
          </span>
        </h1>

        <p className="hero-subtext max-w-2xl text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed">
          Stop guessing what to post. AI Canvas analyzes top creators, 
          detects rising patterns, and generates platform-native content 
          that you actually own.
        </p>

        <div className="hero-actions flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
          <Button size="lg" className="h-12 px-8 text-base w-full sm:w-auto shadow-lg shadow-primary/20">
            Start Automating Free <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" className="h-12 px-8 text-base w-full sm:w-auto group bg-background/50 backdrop-blur-sm border-primary/10">
            <PlayCircle className="mr-2 h-4 w-4 group-hover:text-primary transition-colors" /> Watch Demo
          </Button>
        </div>

      </div>
    </section>
  );
}
