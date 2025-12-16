import { XCircle, Clock, ZapOff } from "lucide-react";
import { Card } from "@/components/ui/card";

const problems = [
  {
    icon: XCircle,
    title: "Generic Content Fatigue",
    description: "Most AI tools sound exactly like AI. Your audience scrolls past generic ChatGPT content instantly.",
  },
  {
    icon: Clock,
    title: "Research Paralysis",
    description: "Spending hours analyzing viral posts manually effectively kills your actual production time.",
  },
  {
    icon: ZapOff,
    title: "Inconsistent Growth",
    description: "Posting at random times with random topics guarantees you never build true domain authority.",
  }
];

export function ProblemSection() {
  return (
    <section className="py-24 bg-secondary/30">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="text-center mb-16">
           <h2 className="text-3xl md:text-5xl font-bold font-heading mb-4 tracking-tight">Why your LinkedIn growth is stuck</h2>
           <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
             The old way of personal branding is manual, slow, and unscalable.
           </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {problems.map((problem, i) => (
            <Card key={i} className="p-6 md:p-8 border shadow-sm bg-background/50 hover:bg-background transition-colors duration-300 hover:shadow-md hover:-translate-y-1">
               <div className="h-12 w-12 bg-red-500/10 rounded-xl flex items-center justify-center mb-6 text-red-600 dark:text-red-400">
                 <problem.icon className="h-6 w-6" />
               </div>
               <h3 className="text-xl font-semibold mb-3 font-heading">{problem.title}</h3>
               <p className="text-muted-foreground leading-relaxed">
                 {problem.description}
               </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
