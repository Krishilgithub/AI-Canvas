import { Star } from "lucide-react";
import { Card } from "@/components/ui/card";

const testimonials = [
  { name: "Sarah Jenkins", role: "Growth Marketer", text: "Finally an AI tool that doesn't sound like a robot. My engagement is up 400% in just two weeks." },
  { name: "David Lin", role: "SaaS Founder", text: "I used to spend 10 hours/week on Content. Now I spend 30 mins approving high-quality drafts." },
  { name: "Alex Rivera", role: "Management Consultant", text: "The trend detection is scary good. It finds topics before they go mainstream, giving me first-mover advantage." }
];

export function SocialProof() {
  return (
    <section className="py-24 bg-secondary/10">
      <div className="container px-4 mx-auto">
         <div className="grid md:grid-cols-3 gap-8 mb-20 text-center border-b border-border/50 pb-16">
            <div>
               <div className="text-4xl md:text-5xl font-bold font-heading mb-2 text-primary">2M+</div>
               <div className="text-muted-foreground font-medium">Posts Analyzed</div>
            </div>
            <div>
               <div className="text-4xl md:text-5xl font-bold font-heading mb-2 text-primary">50k+</div>
               <div className="text-muted-foreground font-medium">Hours Saved</div>
            </div>
            <div>
               <div className="text-4xl md:text-5xl font-bold font-heading mb-2 text-primary">400%</div>
               <div className="text-muted-foreground font-medium">Avg. Engagement Boost</div>
            </div>
         </div>
         
         <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t,i) => (
              <Card key={i} className="p-8 border bg-background/50 shadow-sm hover:shadow-lg transition-shadow duration-300">
                 <div className="flex gap-1 text-orange-500 mb-6">
                    {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 fill-current" />)}
                 </div>
                 <p className="text-lg mb-6 text-foreground font-medium leading-relaxed">&quot;{t.text}&quot;</p>
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-muted-foreground">
                        {t.name[0]}
                    </div>
                    <div>
                        <div className="font-bold text-sm">{t.name}</div>
                        <div className="text-sm text-muted-foreground">{t.role}</div>
                    </div>
                 </div>
              </Card>
            ))}
         </div>
      </div>
    </section>
  )
}
