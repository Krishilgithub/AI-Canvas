'use client'

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { signup, signInWithOAuth } from "@/lib/supabase/actions";
import { useState } from "react";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    setLoading(true);
    
    // Combine first and last name into full name
    const firstName = formData.get('first-name') as string;
    const lastName = formData.get('last-name') as string;
    const fullName = `${firstName} ${lastName}`.trim();
    
    // Create new FormData with fullName
    const authFormData = new FormData();
    authFormData.append('email', formData.get('email') as string);
    authFormData.append('password', formData.get('password') as string);
    authFormData.append('fullName', fullName);
    
    const result = await signup(authFormData);
    
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError(null);
    setLoading(true);
    
    const result = await signInWithOAuth('google');
    
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  };

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
             {error && (
               <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                 {error}
               </div>
             )}
             <form action={handleSubmit} className="grid gap-4">
               <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                     <label htmlFor="first-name" className="text-sm font-medium">First name</label>
                     <Input id="first-name" name="first-name" placeholder="Max" required disabled={loading} />
                  </div>
                  <div className="grid gap-2">
                     <label htmlFor="last-name" className="text-sm font-medium">Last name</label>
                     <Input id="last-name" name="last-name" placeholder="Robinson" required disabled={loading} />
                  </div>
               </div>
               <div className="grid gap-2">
                  <label htmlFor="email" className="text-sm font-medium">Email</label>
                  <Input id="email" name="email" type="email" placeholder="m@example.com" required disabled={loading} />
               </div>
               <div className="grid gap-2">
                  <label htmlFor="password" className="text-sm font-medium">Password</label>
                  <Input id="password" name="password" type="password" required minLength={6} disabled={loading} />
                  <p className="text-xs text-muted-foreground">Password must be at least 6 characters</p>
               </div>
               <Button type="submit" className="w-full" disabled={loading}>
                 {loading ? "Creating account..." : "Create account"}
               </Button>
             </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
             <div className="relative w-full">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or continue with</span></div>
             </div>
             <Button variant="outline" className="w-full" onClick={handleGoogleSignUp} disabled={loading}>
               {loading ? "Loading..." : "Sign up with Google"}
             </Button>
             <div className="text-center text-sm text-muted-foreground">
                Already have an account? <Link href="/login" className="text-primary hover:underline font-medium">Sign in</Link>
             </div>
          </CardFooter>
       </Card>
    </div>
  )
}
