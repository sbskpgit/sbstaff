import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logoAsset from "@/assets/special-branch-logo.png.asset.json";
import { getAssetUrl } from "@/lib/utils";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({ meta: [{ title: "Reset Password — Special Branch Sheikhupura" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    if (params.get("type") !== "recovery") {
      toast.error("Invalid or expired password reset link.");
      nav({ to: "/auth", replace: true });
      return;
    }
    setValid(true);
  }, [nav]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated. Please sign in.");
      nav({ to: "/auth", replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 sm:p-12 bg-background">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-white p-0.5 ring-1 ring-border overflow-hidden">
            <img src={getAssetUrl(logoAsset.url)} alt="Special Branch Punjab seal" className="h-full w-full object-contain rounded-full" />
          </div>
          <div>
            <div className="font-bold">Special Branch Sheikhupura</div>
            <div className="text-xs text-muted-foreground">Nafri Management</div>
          </div>
        </div>
        <h2 className="text-2xl font-bold">Reset your password</h2>
        <p className="mt-1 text-sm text-muted-foreground">Enter a new password below.</p>
        {valid && (
          <form onSubmit={handleSubmit} className="space-y-3 mt-4">
            <div>
              <Label>New Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
            </div>
            <div>
              <Label>Confirm New Password</Label>
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} autoComplete="new-password" />
            </div>
            <Button type="submit" disabled={busy} className="w-full">{busy ? "Updating..." : "Update Password"}</Button>
          </form>
        )}
      </div>
    </div>
  );
}
