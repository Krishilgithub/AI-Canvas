"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
    });

    setLoading(false);

    if (error) {
        toast.error("Error sending reset email", { description: error.message });
    } else {
        setSubmitted(true);
        toast.success("Password reset link sent!");
    }
  };

  if (submitted) {
      return (
          <div className="flex h-screen w-screen items-center justify-center bg-secondary/5">
              <div className="w-full max-w-md space-y-8 p-8 bg-card rounded-xl border shadow-lg text-center">
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <Mail className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold">Check your email</h2>
                  <p className="text-muted-foreground">
                      We've sent a password reset link to <span className="font-medium text-foreground">{email}</span>.
                  </p>
                  <Button asChild variant="outline" className="w-full">
                      <Link href="/login">Back to Login</Link>
                  </Button>
              </div>
          </div>
      );
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-secondary/5">
      <div className="w-full max-w-md space-y-8 p-8 bg-card rounded-xl border shadow-lg">
        <div>
          <h2 className="text-2xl font-bold font-heading">Reset Password</h2>
          <p className="text-muted-foreground mt-2">Enter your email to receive a recovery link.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                   id="email" 
                   type="email" 
                   placeholder="you@example.com" 
                   value={email} 
                   onChange={(e) => setEmail(e.target.value)}
                   required
                />
            </div>
            
            <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending link..." : "Send Reset Link"}
            </Button>
        </form>

        <div className="text-center">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center">
                <ArrowLeft className="mr-2 h-3 w-3" /> Back to Login
            </Link>
        </div>
      </div>
    </div>
  );
}
