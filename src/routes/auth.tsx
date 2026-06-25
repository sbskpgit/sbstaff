import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import logoAsset from "@/assets/special-branch-logo.png.asset.json";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "Sign In — Special Branch Sheikhupura" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  useEffect(() => {
    if (!loading && user) nav({ to: "/dashboard", replace: true });
  }, [user, loading, nav]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Welcome back"); nav({ to: "/dashboard", replace: true }); }
  };
  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Account created. You can sign in now."); setTab("signin"); }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotBusy(false);
    if (error) toast.error(error.message);
    else setForgotSent(true);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex gradient-hero p-12 flex-col justify-between text-sidebar-foreground">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-white p-1 ring-2 ring-white/30 overflow-hidden">
            <img src={logoAsset.url} alt="Special Branch Punjab seal" className="h-full w-full object-contain rounded-full" />
          </div>
          <div>
            <div className="text-lg font-bold">Special Branch</div>
            <div className="text-sm opacity-80">Sheikhupura Region</div>
          </div>
        </div>
        <div>
          <h1 className="text-4xl font-extrabold leading-tight">Nafri Management System</h1>
          <p className="mt-4 max-w-md opacity-85">
            Region-wide staff strength and posting records for Regional Office, District Sheikhupura,
            District Kasur and District Nankana Sahib.
          </p>
          <ul className="mt-8 space-y-2 text-sm opacity-90">
            <li>• Complete profile, posting & transfer history</li>
            <li>• District-isolated access with regional oversight</li>
            <li>• PDF & Excel reports, dashboards, audit log</li>
          </ul>
        </div>
        <div className="text-xs opacity-70">Government of Punjab • Police Department</div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-6 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-white p-0.5 ring-1 ring-border overflow-hidden">
              <img src={logoAsset.url} alt="Special Branch Punjab seal" className="h-full w-full object-contain rounded-full" />
            </div>
            <div>
              <div className="font-bold">Special Branch Sheikhupura</div>
              <div className="text-xs text-muted-foreground">Nafri Management</div>
            </div>
          </div>
          <h2 className="text-2xl font-bold">Sign in to your account</h2>
          <p className="mt-1 text-sm text-muted-foreground">Authorized personnel only.</p>

          <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")} className="mt-6">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={signIn} className="space-y-3 mt-4">
                <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></div>
                <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /></div>
                <Button type="submit" disabled={busy} className="w-full">{busy ? "Signing in..." : "Sign In"}</Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={signUp} className="space-y-3 mt-4">
                <div><Label>Full Name</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
                <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></div>
                <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" /></div>
                <Button type="submit" disabled={busy} className="w-full">{busy ? "Creating..." : "Create Account"}</Button>
                <p className="text-xs text-muted-foreground">New accounts have no permissions until a Super Admin assigns a role.</p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
