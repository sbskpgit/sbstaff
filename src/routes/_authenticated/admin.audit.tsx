import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  ssr: false,
  head: () => ({ meta: [{ title: "Audit Log — Special Branch Sheikhupura" }] }),
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data } = await supabase.rpc("is_super_admin", { _user_id: u.user.id });
    if (!data) throw redirect({ to: "/dashboard" });
  },
  component: AuditPage,
});

function AuditPage() {
  const { data } = useQuery({
    queryKey: ["audit"],
    queryFn: async () => (await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500)).data ?? [],
  });
  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-sm text-muted-foreground">Recent activity by all users.</p>
      </div>
      <div className="card-elevated overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data ?? []).length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">No activity yet.</TableCell></TableRow>}
            {data?.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="text-xs whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</TableCell>
                <TableCell className="text-sm">{l.actor_email ?? l.actor_id}</TableCell>
                <TableCell><Badge variant="outline">{l.action}</Badge></TableCell>
                <TableCell className="text-sm">{l.entity}</TableCell>
                <TableCell className="text-xs text-muted-foreground font-mono max-w-md truncate">{JSON.stringify(l.details)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
