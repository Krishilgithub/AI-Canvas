import { Navbar } from "@/components/marketing/navbar";
import { Hero } from "@/components/marketing/hero";
import { ProblemSection } from "@/components/marketing/problem";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { PlatformFocus } from "@/components/marketing/platforms";
import { HumanLoop } from "@/components/marketing/human-loop";
import { SocialProof } from "@/components/marketing/social-proof";
import { CTA } from "@/components/marketing/cta";
import { Footer } from "@/components/marketing/footer";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-background selection:bg-primary/10 selection:text-primary">
       <Navbar />
       <Hero />
       <ProblemSection />
       <HowItWorks />
       <PlatformFocus />
       <HumanLoop />
       <SocialProof />
       <CTA />
       <Footer />
    </main>
  );
}
