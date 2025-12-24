"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
      // Ensure we have a session (handled by auto-login via link)
      const checkSession = async () => {
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
              // Usually the link handles this, but if expired:
              toast.error("Invalid or expired session. Please request a new link.");
              router.push('/forgot-password');
          }
      };
      checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
        toast.error("Update failed", { description: error.message });
    } else {
        toast.success("Password updated successfully!");
        router.push('/dashboard');
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-secondary/5">
      <div className="w-full max-w-md space-y-8 p-8 bg-card rounded-xl border shadow-lg">
        <div>
          <h2 className="text-2xl font-bold font-heading">Set New Password</h2>
          <p className="text-muted-foreground mt-2">Please enter your new password below.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input 
                   id="password" 
                   type="password" 
                   value={password} 
                   onChange={(e) => setPassword(e.target.value)}
                   required
                   minLength={6}
                />
            </div>
            
            <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
            </Button>
        </form>
      </div>
    </div>
  );
}
