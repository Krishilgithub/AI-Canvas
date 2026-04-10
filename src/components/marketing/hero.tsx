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
      .from(
        ".hero-heading",
        {
          y: 40,
          opacity: 0,
          duration: 0.8,
          stagger: 0.2,
        },
        "-=0.3"
      )
      .from(
        ".hero-subtext",
        {
          y: 20,
          opacity: 0,
          duration: 0.6,
        },
        "-=0.5"
      )
      .from(
        ".hero-platforms",
        {
          y: 20,
          opacity: 0,
          duration: 0.6,
        },
        "-=0.4"
      )
      .from(
        ".hero-actions",
        {
          y: 20,
          opacity: 0,
          duration: 0.6,
        },
        "-=0.4"
      );
  }, { scope: container });

  return (
    <section
      ref={container}
      className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden"
    >
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl -z-10 pointer-events-none">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-primary/10 blur-[120px] rounded-full opacity-50 mix-blend-multiply dark:mix-blend-normal" />
      </div>

      <div className="container px-4 md:px-6 mx-auto flex flex-col items-center text-center">

        {/* Beta badge */}
        <div className="hero-badge mb-6 inline-flex items-center rounded-full border border-primary/10 bg-primary/5 px-3 py-1 text-sm font-medium text-primary backdrop-blur-sm">
          <span className="flex h-2 w-2 rounded-full bg-primary/80 mr-2 animate-pulse" />
          Now in Public Beta
        </div>

        {/* Headline */}
        <h1 className="hero-heading max-w-4xl text-5xl md:text-7xl font-bold font-heading tracking-tight text-foreground mb-6">
          AI-Powered Content for <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-b from-primary to-primary/60">
            Every Major Platform
          </span>
        </h1>

        {/* Subtext */}
        <p className="hero-subtext max-w-2xl text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
          Stop guessing what to post. AI Canvas scans trends across{" "}
          <span className="font-semibold text-foreground">LinkedIn</span>,{" "}
          <span className="font-semibold text-foreground">Twitter/X</span>, and{" "}
          <span className="font-semibold text-foreground">Reddit</span> — then
          generates platform-native content that sounds like you, not a robot.
        </p>

        {/* Platform Pills */}
        <div className="hero-platforms flex flex-wrap items-center justify-center gap-3 mb-10">
          {/* LinkedIn */}
          <span className="inline-flex items-center gap-2 rounded-full bg-[#0077b5]/10 border border-[#0077b5]/20 px-4 py-1.5 text-sm font-semibold text-[#0077b5] dark:text-blue-400">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.37V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.26 2.37 4.26 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zm1.78 13.02H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45C23.2 24 24 23.23 24 22.27V1.73C24 .77 23.2 0 22.22 0z" />
            </svg>
            LinkedIn
          </span>
          {/* Twitter/X */}
          <span className="inline-flex items-center gap-2 rounded-full bg-foreground/10 border border-foreground/20 px-4 py-1.5 text-sm font-semibold text-foreground">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
            </svg>
            Twitter / X
          </span>
          {/* Reddit */}
          <span className="inline-flex items-center gap-2 rounded-full bg-[#FF4500]/10 border border-[#FF4500]/20 px-4 py-1.5 text-sm font-semibold text-[#FF4500] dark:text-orange-400">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
            </svg>
            Reddit
          </span>
        </div>

        {/* CTA Buttons */}
        <div className="hero-actions flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
          <Button
            size="lg"
            className="h-12 px-8 text-base w-full sm:w-auto shadow-lg shadow-primary/20"
          >
            Start Automating Free <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-12 px-8 text-base w-full sm:w-auto group bg-background/50 backdrop-blur-sm border-primary/10"
          >
            <PlayCircle className="mr-2 h-4 w-4 group-hover:text-primary transition-colors" />{" "}
            Watch Demo
          </Button>
        </div>
      </div>
    </section>
  );
}
