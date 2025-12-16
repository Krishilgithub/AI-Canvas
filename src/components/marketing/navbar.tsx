import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";

export function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold font-heading tracking-tight">AI Canvas</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
            Features
          </Link>
          <Link href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
            How it Works
          </Link>
          <Link href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
            Pricing
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/login" className="hidden sm:block">
             <Button variant="ghost" size="sm">Log in</Button>
          </Link>
          <Link href="/signup">
            <Button size="sm" className="hidden sm:inline-flex">
              Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
