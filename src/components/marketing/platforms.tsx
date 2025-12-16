import { Linkedin, Twitter, Youtube, MessageSquare } from "lucide-react";

export function PlatformFocus() {
  return (
    <section className="py-32 border-y border-border/50 bg-secondary/20">
       <div className="container mx-auto px-4 text-center"> 
          <h2 className="text-3xl md:text-5xl font-bold font-heading mb-6">Built for LinkedIn First</h2>
          <p className="text-muted-foreground mb-16 max-w-lg mx-auto">
            We prioritize the professional network where authority matters most, while syndicating to others.
          </p>
          
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20">
             {/* Secondaries Left */}
             <div className="flex flex-col items-center gap-3 opacity-40 hover:opacity-100 transition-opacity duration-300 cursor-default">
                 <div className="w-16 h-16 rounded-2xl bg-card border flex items-center justify-center">
                    <Twitter className="w-8 h-8" />
                 </div>
                 <span className="font-medium text-sm text-muted-foreground">Twitter / X</span>
             </div>

             {/* LinkedIn Primary */}
             <div className="flex flex-col items-center gap-4 scale-110 relative z-10">
                <div className="w-24 h-24 rounded-3xl bg-[#0077b5] flex items-center justify-center shadow-lg shadow-blue-900/20 ring-4 ring-background">
                   <Linkedin className="w-12 h-12 text-white fill-current" />
                </div>
                <span className="font-bold text-lg text-foreground">LinkedIn</span>
                <span className="absolute -top-6 -right-8 bg-foreground text-background text-[10px] font-bold px-2 py-1 rounded-full">PRIMARY</span>
             </div>
             
             {/* Secondaries Right */}
             <div className="flex flex-col items-center gap-3 opacity-40 hover:opacity-100 transition-opacity duration-300 cursor-default">
                 <div className="w-16 h-16 rounded-2xl bg-card border flex items-center justify-center">
                     <MessageSquare className="w-8 h-8" />
                 </div>
                 <span className="font-medium text-sm text-muted-foreground">Reddit</span>
             </div>
             <div className="flex flex-col items-center gap-3 opacity-40 hover:opacity-100 transition-opacity duration-300 cursor-default">
                 <div className="w-16 h-16 rounded-2xl bg-card border flex items-center justify-center">
                     <Youtube className="w-8 h-8" />
                 </div>
                 <span className="font-medium text-sm text-muted-foreground">YouTube</span>
             </div>
          </div>
       </div>
    </section>
  )
}
