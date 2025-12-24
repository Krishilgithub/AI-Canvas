"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Linkedin, Settings, Workflow, LogOut, Sparkles, Layers, Calendar, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signout } from "@/lib/supabase/actions";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/linkedin", label: "LinkedIn Automation", icon: Linkedin },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/automation", label: "Control Center", icon: Workflow },
  { href: "/logs", label: "System Logs", icon: FileText },
  { href: "/integrations", label: "Integrations", icon: Layers },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signout();
  };

  return (
    <aside className="w-64 border-r border-border bg-card hidden md:flex flex-col h-screen sticky top-0">
      <div className="p-6 flex items-center gap-2 border-b border-border/50">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
             <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-xl font-bold font-heading tracking-tight">AI Canvas</span>
      </div>
      
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
         <div className="mb-4 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Platform</div>
         {navItems.slice(0, 4).map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                 <span className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors mb-1",
                    isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                 )}>
                    <item.icon className="h-4 w-4" />
                    {item.label}
                 </span>
              </Link>
            )
         })}
         
         <div className="mt-8 mb-4 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Management</div>
         {navItems.slice(4).map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                 <span className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors mb-1",
                    isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                 )}>
                    <item.icon className="h-4 w-4" />
                    {item.label}
                 </span>
              </Link>
            )
         })}
      </nav>
      
      <div className="p-4 border-t border-border/50 bg-secondary/10">
         <div className="flex items-center gap-3 mb-4 px-2">
            <div 
           variant="ghost" 
           size="sm" 
           className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
           onClick={handleSignOut}
           disabled={isSigningOut}
         >
            <LogOut className="mr-2 h-4 w-4" /> {isSigningOut ? "Signing Out..." : "Sign Out"}
               <p className="text-sm font-medium truncate">Krishil Agrawal</p>
               <p className="text-xs text-muted-foreground truncate">Enterprise Plan</p>
            </div>
         </div>
         <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10">
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
         </Button>
      </div>
    </aside>
  )
}
