import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, ArrowRightLeft, FileBarChart, ShieldCheck, Building2, ScrollText, LogOut,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import logoAsset from "@/assets/special-branch-logo.png.asset.json";
import { getAssetUrl } from "@/lib/utils";

const main = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Staff (Nafri)", url: "/staff", icon: Users },
  { title: "Transfers & Postings", url: "/transfers", icon: ArrowRightLeft },
  { title: "Reports", url: "/reports", icon: FileBarChart },
];

const admin = [
  { title: "Users & Roles", url: "/admin/users", icon: ShieldCheck },
  { title: "Organization", url: "/admin/organization", icon: Building2 },
  { title: "Audit Log", url: "/admin/audit", icon: ScrollText },
];

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { isSuperAdmin, signOut, user } = useAuth();
  const closeOnMobile = () => { if (isMobile) setOpenMobile(false); };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white p-0.5 ring-1 ring-sidebar-border overflow-hidden">
            <img src={logoAsset.url} alt="Special Branch Punjab seal" className="h-full w-full object-contain rounded-full" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-tight text-sidebar-foreground">Special Branch</div>
              <div className="text-[11px] text-sidebar-foreground/70 leading-tight">Sheikhupura Region</div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {main.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname === item.url || pathname.startsWith(item.url + "/")}>
                    <Link to={item.url} onClick={closeOnMobile} className="flex items-center gap-2">

                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {admin.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={pathname.startsWith(item.url)}>
                      <Link to={item.url} onClick={closeOnMobile} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3">
        {!collapsed && user && (
          <div className="mb-2 truncate text-[11px] text-sidebar-foreground/70">{user.email}</div>
        )}
        <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent" onClick={signOut}>
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sign out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
