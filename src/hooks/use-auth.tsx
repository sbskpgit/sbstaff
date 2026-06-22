import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "super_admin" | "district_admin" | "read_only";
export type RoleRow = { role: AppRole; district_id: string | null };

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: RoleRow[];
  isSuperAdmin: boolean;
  isDistrictAdmin: boolean;
  isReadOnly: boolean;
  districtId: string | null;
  canEdit: boolean;
  refreshRoles: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<RoleRow[]>([]);

  const loadRoles = async (uid: string | undefined) => {
    if (!uid) { setRoles([]); return; }
    const { data } = await supabase.from("user_roles").select("role, district_id").eq("user_id", uid);
    setRoles((data as RoleRow[]) ?? []);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setTimeout(() => loadRoles(s?.user?.id), 0);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      loadRoles(data.session?.user?.id).finally(() => setLoading(false));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const isSuperAdmin = roles.some((r) => r.role === "super_admin");
  const isDistrictAdmin = roles.some((r) => r.role === "district_admin");
  const isReadOnly = roles.some((r) => r.role === "read_only");
  const districtId = roles.find((r) => r.role === "district_admin")?.district_id ?? null;
  const canEdit = isSuperAdmin || isDistrictAdmin;

  const value: AuthState = {
    user, session, loading, roles, isSuperAdmin, isDistrictAdmin, isReadOnly, districtId, canEdit,
    refreshRoles: () => loadRoles(user?.id),
    signOut: async () => { await supabase.auth.signOut(); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside provider");
  return v;
}
