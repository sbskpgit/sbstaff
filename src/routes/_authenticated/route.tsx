import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { user, loading, roles } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (!loading && !user) nav({ to: "/auth", replace: true }); }, [user, loading, nav]);
  if (loading || !user) return null;

  const noRole = roles.length === 0;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 sticky top-0 z-30 flex items-center gap-2 border-b bg-background/80 backdrop-blur px-3">
            <SidebarTrigger />
            <div className="ml-2 min-w-0">
              <div className="text-sm font-semibold truncate">Special Branch Sheikhupura Region</div>
              <div className="text-[11px] text-muted-foreground truncate">Staff (Nafri) Management System</div>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1">
            {noRole ? (
              <div className="max-w-2xl mx-auto mt-12 p-6 card-elevated">
                <h2 className="text-xl font-bold">Account pending authorization</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your account ({user.email}) has been created but no role has been assigned yet.
                  Please ask the Super Admin (Regional Office) to grant you access as
                  District Admin or Read-Only User.
                </p>
                <p className="mt-3 text-xs text-muted-foreground">User ID: <code className="font-mono">{user.id}</code></p>
              </div>
            ) : (
              <Outlet />
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
