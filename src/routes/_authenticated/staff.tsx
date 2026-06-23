import { createFileRoute } from "@tanstack/react-router";
import { StaffPreviewDialog } from "@/components/staff-preview-dialog";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Pencil, Trash2, Download, Eye } from "lucide-react";
import { DUTY_STATUSES, POSTING_TYPES, labelOf } from "@/lib/constants";
import { StaffFormDialog } from "@/components/staff-form-dialog";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { logAudit } from "@/lib/audit";

export const Route = createFileRoute("/_authenticated/staff")({
  ssr: false,
  head: () => ({ meta: [{ title: "Staff — Special Branch Sheikhupura" }] }),
  component: StaffPage,
});

function StaffPage() {
  const qc = useQueryClient();
  const { canEdit, isSuperAdmin } = useAuth();
  const [q, setQ] = useState("");
  const [districtFilter, setDistrictFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [postingFilter, setPostingFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const pageSize = 25;
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [open, setOpen] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const { data: refs } = useQuery({
    queryKey: ["staff-refs"],
    queryFn: async () => {
      const [d, dg, c, s] = await Promise.all([
        supabase.from("districts").select("id, name, display_order").order("display_order"),
        supabase.from("designations").select("id, name").order("display_order"),
        supabase.from("circles").select("id, name, district_id"),
        supabase.from("police_stations").select("id, name, circle_id"),
      ]);
      return {
        districts: d.data ?? [],
        designations: dg.data ?? [],
        designMap: new Map((dg.data ?? []).map((x) => [x.id, x.name])),
        districtMap: new Map((d.data ?? []).map((x) => [x.id, x.name])),
        circleMap: new Map((c.data ?? []).map((x) => [x.id, x.name])),
        stationMap: new Map((s.data ?? []).map((x) => [x.id, x.name])),
      };
    },
  });

  const { data: staff, refetch } = useQuery({
    queryKey: ["staff-list"],
    queryFn: async () => {
      const { data } = await supabase.from("staff").select("*").order("full_name");
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    let rows = staff ?? [];
    if (districtFilter !== "all") rows = rows.filter((r) => r.district_id === districtFilter);
    if (statusFilter !== "all") rows = rows.filter((r) => r.duty_status === statusFilter);
    if (postingFilter !== "all") rows = rows.filter((r) => r.posting_type === postingFilter);
    if (q.trim()) {
      const t = q.toLowerCase();
      rows = rows.filter((r) =>
        r.full_name?.toLowerCase().includes(t) ||
        r.cnic?.toLowerCase().includes(t) ||
        r.service_number?.toLowerCase().includes(t) ||
        r.employee_id?.toLowerCase().includes(t) ||
        r.mobile?.toLowerCase().includes(t),
      );
    }
    return rows;
  }, [staff, q, districtFilter, statusFilter, postingFilter]);

  const pageRows = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const del = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    const { error } = await supabase.from("staff").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      await logAudit({ action: "delete", entity: "staff", entity_id: id, details: { name } });
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["staff-list"] });
    }
  };

  const exportExcel = () => {
    const rows = filtered.map((r) => ({
      "Employee ID": r.employee_id,
      "Service No": r.service_number,
      Name: r.full_name,
      Father: r.father_name,
      CNIC: r.cnic,
      Mobile: r.mobile,
      Designation: refs?.designMap.get(r.designation_id ?? "") ?? "",
      Cadre: r.cadre,
      BPS: r.bps,
      District: refs?.districtMap.get(r.district_id) ?? "",
      Circle: refs?.circleMap.get(r.circle_id ?? "") ?? "",
      "Police Station": refs?.stationMap.get(r.police_station_id ?? "") ?? "",
      Posting: labelOf(POSTING_TYPES, r.posting_type),
      Status: labelOf(DUTY_STATUSES, r.duty_status),
      "DOB": r.date_of_birth, "DOJ": r.date_of_joining,
      Remarks: r.remarks,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Staff");
    XLSX.writeFile(wb, `staff-${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold">Staff (Nafri)</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} record{filtered.length === 1 ? "" : "s"}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={exportExcel}><Download className="h-4 w-4 mr-1" />Excel</Button>
          {canEdit && <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />Add Staff</Button>}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-2 card-elevated p-3">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Name, CNIC, service #…" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
        </div>
        <Select value={districtFilter} onValueChange={(v) => { setDistrictFilter(v); setPage(0); }}>
          <SelectTrigger><SelectValue placeholder="District" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All districts</SelectItem>
            {refs?.districts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger><SelectValue placeholder="Duty status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {DUTY_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={postingFilter} onValueChange={(v) => { setPostingFilter(v); setPage(0); }}>
          <SelectTrigger><SelectValue placeholder="Posting" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All postings</SelectItem>
            {POSTING_TYPES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="card-elevated overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Designation</TableHead>
              <TableHead className="hidden lg:table-cell">CNIC</TableHead>
              <TableHead>District</TableHead>
              <TableHead className="hidden md:table-cell">Posting</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">No staff found.</TableCell></TableRow>
            )}
            {pageRows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">
                  <div>{r.full_name}</div>
                  <div className="text-xs text-muted-foreground">{r.service_number ?? r.employee_id ?? ""}</div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm">{refs?.designMap.get(r.designation_id ?? "") ?? "—"}</TableCell>
                <TableCell className="hidden lg:table-cell text-sm">{r.cnic ?? "—"}</TableCell>
                <TableCell className="text-sm">{refs?.districtMap.get(r.district_id) ?? "—"}</TableCell>
                <TableCell className="hidden md:table-cell text-sm">{labelOf(POSTING_TYPES, r.posting_type)}</TableCell>
                <TableCell><StatusBadge status={r.duty_status} /></TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" title="Preview" onClick={() => { setPreviewId(r.id); setPreviewOpen(true); }}><Eye className="h-4 w-4" /></Button>
                  {canEdit && <Button variant="ghost" size="icon" onClick={() => { setEditing(r); setOpen(true); }} title="Edit"><Pencil className="h-4 w-4" /></Button>}
                  {isSuperAdmin && <Button variant="ghost" size="icon" onClick={() => del(r.id, r.full_name)} title="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="text-muted-foreground">Page {page + 1} of {totalPages}</div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>

      <StaffFormDialog open={open} onOpenChange={setOpen} initial={editing as never} onSaved={() => refetch()} />
      <StaffPreviewDialog staffId={previewId} open={previewOpen} onOpenChange={setPreviewOpen} />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-success/15 text-success border-success/30",
    attached: "bg-warning/25 text-warning-foreground border-warning/40",
    osd: "bg-warning/25 text-warning-foreground border-warning/40",
    headquarters: "bg-info/15 text-info border-info/30",
    leave: "bg-muted text-muted-foreground border-border",
    suspension: "bg-destructive/15 text-destructive border-destructive/30",
    retired: "bg-muted text-muted-foreground border-border",
    vacant: "bg-destructive/15 text-destructive border-destructive/30",
  };
  return <Badge variant="outline" className={map[status] ?? ""}>{labelOf(DUTY_STATUSES, status)}</Badge>;
}
