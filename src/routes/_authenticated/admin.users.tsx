import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, UserPlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users")({
  ssr: false,
  head: () => ({ meta: [{ title: "Users & Roles — Special Branch Sheikhupura" }] }),
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data } = await supabase.rpc("is_super_admin", { _user_id: u.user.id });
    if (!data) throw redirect({ to: "/dashboard" });
  },
  component: UsersAdmin,
});

function UsersAdmin() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<"super_admin" | "district_admin" | "read_only">("read_only");
  const [districtId, setDistrictId] = useState<string>("");

  const { data } = useQuery({
    queryKey: ["users-roles"],
    queryFn: async () => {
      const [{ data: roles }, { data: profiles }, { data: districts }] = await Promise.all([
        supabase.from("user_roles").select("*"),
        supabase.from("profiles").select("id, email, full_name"),
        supabase.from("districts").select("id, name"),
      ]);
      return {
        roles: roles ?? [],
        profileMap: new Map((profiles ?? []).map((p) => [p.id, p])),
        districtMap: new Map((districts ?? []).map((d) => [d.id, d.name])),
        districts: districts ?? [],
        profiles: profiles ?? [],
      };
    },
  });

  const grant = async () => {
    if (!userId) { toast.error("Select a user"); return; }
    if (role === "district_admin" && !districtId) { toast.error("Pick a district for district admin"); return; }
    const payload = { user_id: userId, role, district_id: role === "district_admin" ? districtId : null };
    const { error } = await supabase.from("user_roles").insert(payload as never);
    if (error) toast.error(error.message);
    else {
      toast.success("Role granted");
      setUserId(""); setDistrictId("");
      qc.invalidateQueries({ queryKey: ["users-roles"] });
    }
  };
  const revoke = async (id: string) => {
    if (!confirm("Revoke this role?")) return;
    const { error } = await supabase.from("user_roles").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Revoked"); qc.invalidateQueries({ queryKey: ["users-roles"] }); }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Users & Roles</h1>
        <p className="text-sm text-muted-foreground">Grant Super Admin, District Admin or Read-Only access.</p>
      </div>

      <div className="card-elevated p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2"><UserPlus className="h-4 w-4" />Grant role</h3>
        <div className="grid sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <Label className="text-xs text-muted-foreground">User</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select user" /></SelectTrigger>
              <SelectContent>
                {data?.profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name ?? p.email} ({p.email})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="district_admin">District Admin</SelectItem>
                <SelectItem value="read_only">Read Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">District (district admin)</Label>
            <Select value={districtId} onValueChange={setDistrictId} disabled={role !== "district_admin"}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{data?.districts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-3"><Button onClick={grant}>Grant</Button></div>
        <p className="mt-2 text-xs text-muted-foreground">Users must sign up first via the login screen. Their account then appears in this list.</p>
      </div>

      <div className="card-elevated overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>District</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.roles ?? []).length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No roles granted yet.</TableCell></TableRow>
            )}
            {data?.roles.map((r) => {
              const p = data.profileMap.get(r.user_id);
              return (
                <TableRow key={r.id}>
                  <TableCell><div className="font-medium">{p?.full_name ?? p?.email ?? r.user_id}</div><div className="text-xs text-muted-foreground">{p?.email}</div></TableCell>
                  <TableCell><Badge>{r.role}</Badge></TableCell>
                  <TableCell className="text-sm">{r.district_id ? (data.districtMap.get(r.district_id) ?? "—") : "—"}</TableCell>
                  <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => revoke(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
