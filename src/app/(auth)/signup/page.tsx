import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

export default function SignupPage() {
  return (
    <div className="flex flex-col gap-8">
       <div className="flex items-center justify-center gap-2">
           <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
               <Sparkles className="h-4 w-4 text-primary-foreground" />
           </div>
           <span className="text-xl font-bold font-heading">AI Canvas</span>
       </div>
       
       <Card className="border-border shadow-lg">
          <CardHeader className="space-y-1">
             <CardTitle className="text-2xl text-center">Create an account</CardTitle>
             <CardDescription className="text-center">Start building your authority autopilot today</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
             <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                   <label htmlFor="first-name" className="text-sm font-medium">First name</label>
                   <Input id="first-name" placeholder="Max" />
                </div>
                <div className="grid gap-2">
                   <label htmlFor="last-name" className="text-sm font-medium">Last name</label>
                   <Input id="last-name" placeholder="Robinson" />
                </div>
             </div>
             <div className="grid gap-2">
                <label htmlFor="email" className="text-sm font-medium">Email</label>
                <Input id="email" type="email" placeholder="m@example.com" />
             </div>
             <div className="grid gap-2">
                <label htmlFor="password" className="text-sm font-medium">Password</label>
                <Input id="password" type="password" />
             </div>
             <Button className="w-full">Create account</Button>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
             <div className="relative w-full">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or continue with</span></div>
             </div>
             <Button variant="outline" className="w-full">Sign up with Google</Button>
             <div className="text-center text-sm text-muted-foreground">
                Already have an account? <Link href="/login" className="text-primary hover:underline font-medium">Sign in</Link>
             </div>
          </CardFooter>
       </Card>
    </div>
  )
}
