import Link from "next/link";
import { Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="py-12 border-t border-border/50 bg-background">
       <div className="container px-4 mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
             <div className="col-span-1 md:col-span-1">
                <Link href="/" className="flex items-center space-x-2 mb-4">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary">
                    <Sparkles className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <span className="text-lg font-bold font-heading tracking-tight">AI Canvas</span>
                </Link>
                <p className="text-sm text-muted-foreground leading-relaxed">
                   The intelligent content automation platform for professionals who value quality over quantity.
                </p>
             </div>
             
             <div>
                <h4 className="font-bold mb-4">Product</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                   <li><Link href="#" className="hover:text-foreground">Features</Link></li>
                   <li><Link href="#" className="hover:text-foreground">Pricing</Link></li>
                   <li><Link href="#" className="hover:text-foreground">Integrations</Link></li>
                   <li><Link href="#" className="hover:text-foreground">Roadmap</Link></li>
                </ul>
             </div>
             <div>
                <h4 className="font-bold mb-4">Company</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                   <li><Link href="#" className="hover:text-foreground">About</Link></li>
                   <li><Link href="#" className="hover:text-foreground">Blog</Link></li>
                   <li><Link href="#" className="hover:text-foreground">Careers</Link></li>
                   <li><Link href="#" className="hover:text-foreground">Contact</Link></li>
                </ul>
             </div>
             <div>
                <h4 className="font-bold mb-4">Legal</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                   <li><Link href="#" className="hover:text-foreground">Privacy Policy</Link></li>
                   <li><Link href="#" className="hover:text-foreground">Terms of Service</Link></li>
                   <li><Link href="#" className="hover:text-foreground">Cookie Policy</Link></li>
                </ul>
             </div>
          </div>
          
          <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-4">
             <p className="text-sm text-muted-foreground">© 2025 AI Canvas Inc. All rights reserved.</p>
             <div className="flex gap-6">
                <Link href="#" className="text-muted-foreground hover:text-foreground">
                   <span className="sr-only">Twitter</span>
                   X / Twitter
                </Link>
                <Link href="#" className="text-muted-foreground hover:text-foreground">
                   LinkedIn
                </Link>
                <Link href="#" className="text-muted-foreground hover:text-foreground">
                   GitHub
                </Link>
             </div>
          </div>
       </div>
    </footer>
  )
}
