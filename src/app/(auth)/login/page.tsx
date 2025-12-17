'use client'

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { login, signInWithOAuth } from "@/lib/supabase/actions";
import { useState } from "react";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    setLoading(true);
    
    const result = await login(formData);
    
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
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
             <CardTitle className="text-2xl text-center">Welcome back</CardTitle>
             <CardDescription className="text-center">Enter your email to sign in to your account</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
             {error && (
               <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                 {error}
               </div>
             )}
             <form action={handleSubmit} className="grid gap-4">
               <div className="grid gap-2">
                  <label htmlFor="email" className="text-sm font-medium">Email</label>
                  <Input id="email" name="email" type="email" placeholder="m@example.com" required disabled={loading} />
               </div>
               <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                      <label htmlFor="password" className="text-sm font-medium">Password</label>
                      <Link href="#" className="text-sm text-primary hover:underline">Forgot password?</Link>
                  </div>
                  <Input id="password" name="password" type="password" required disabled={loading} />
               </div>
               <Button type="submit" className="w-full" disabled={loading}>
                 {loading ? "Signing in..." : "Sign in"}
               </Button>
             </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
             <div className="relative w-full">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or continue with</span></div>
             </div>
             <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={loading}>
               {loading ? "Loading..." : "Google"}
             </Button>
             <div className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account? <Link href="/signup" className="text-primary hover:underline font-medium">Sign up</Link>
             </div>
          </CardFooter>
       </Card>
    </div>
  )
}
