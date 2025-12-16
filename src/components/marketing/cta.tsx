import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CTA() {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
       {/* Ambient Background */}
       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] -z-10 pointer-events-none" />

       <div className="container px-4 mx-auto max-w-4xl text-center">
          <h2 className="text-4xl md:text-6xl font-bold font-heading mb-6 tracking-tight">Ready to dominate your niche?</h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
             Join 5,000+ professionals building authority on autopilot. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
             <Button size="lg" className="h-14 px-8 text-lg shadow-xl shadow-primary/20 hover:scale-105 transition-transform duration-200">
                Start Free Trial <ArrowRight className="ml-2 w-5 h-5" />
             </Button>
             <Button size="lg" variant="outline" className="h-14 px-8 text-lg bg-background hover:bg-secondary">
                Book a Demo
             </Button>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
             Free 14-day trial • Cancel anytime • No credit card required
          </p>
       </div>
    </section>
  )
}
