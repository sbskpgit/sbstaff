import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { POSTING_TYPES, TRANSFER_KINDS, labelOf } from "@/lib/constants";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ArrowRightLeft, Plus } from "lucide-react";
import { logAudit } from "@/lib/audit";

export const Route = createFileRoute("/_authenticated/transfers")({
  ssr: false,
  head: () => ({ meta: [{ title: "Transfers — Special Branch Sheikhupura" }] }),
  component: TransfersPage,
});

function TransfersPage() {
  const qc = useQueryClient();
  const { canEdit } = useAuth();
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["transfers"],
    queryFn: async () => {
      const [{ data: tr }, { data: st }, { data: dx }] = await Promise.all([
        supabase.from("transfers").select("*").order("order_date", { ascending: false }).limit(200),
        supabase.from("staff").select("id, full_name, service_number"),
        supabase.from("districts").select("id, name"),
      ]);
      return {
        transfers: tr ?? [],
        staffMap: new Map((st ?? []).map((x) => [x.id, x])),
        districtMap: new Map((dx ?? []).map((x) => [x.id, x.name])),
      };
    },
  });

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold">Transfers & Postings</h1>
          <p className="text-sm text-muted-foreground">Order log; each transfer updates the staff member's current posting.</p>
        </div>
        {canEdit && (
          <Button className="ml-auto" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />New Transfer Order
          </Button>
        )}
      </div>

      <div className="card-elevated overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Order #</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>From → To</TableHead>
              <TableHead>Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.transfers ?? []).length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">No transfers recorded.</TableCell></TableRow>
            )}
            {data?.transfers.map((t) => {
              const s = data.staffMap.get(t.staff_id);
              return (
                <TableRow key={t.id}>
                  <TableCell className="text-sm">{t.order_date}</TableCell>
                  <TableCell className="text-sm">{t.order_number ?? "—"}</TableCell>
                  <TableCell className="text-sm">
                    <div className="font-medium">{s?.full_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{s?.service_number ?? ""}</div>
                  </TableCell>
                  <TableCell className="text-sm">{labelOf(TRANSFER_KINDS, t.transfer_kind)}</TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span>{data.districtMap.get(t.from_district_id ?? "") ?? "—"}</span>
                      <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{data.districtMap.get(t.to_district_id)}</span>
                      <span className="text-xs text-muted-foreground">({labelOf(POSTING_TYPES, t.to_posting_type)})</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{t.remarks ?? ""}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <TransferDialog open={open} onOpenChange={setOpen} onSaved={() => qc.invalidateQueries({ queryKey: ["transfers"] })} />
    </div>
  );
}

function TransferDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const [staffId, setStaffId] = useState("");
  const [staffSearch, setStaffSearch] = useState("");
  const [kind, setKind] = useState("between_districts");
  const [orderNo, setOrderNo] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0,10));
  const [toDistrict, setToDistrict] = useState("");
  const [toCircle, setToCircle] = useState("");
  const [toStation, setToStation] = useState("");
  const [toPosting, setToPosting] = useState("district_office");
  const [attachmentEnd, setAttachmentEnd] = useState("");
  const [remarks, setRemarks] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: refs } = useQuery({
    queryKey: ["tr-refs"],
    queryFn: async () => {
      const [s, d, c, p] = await Promise.all([
        supabase.from("staff").select("id, full_name, service_number, district_id, circle_id, police_station_id, posting_type").order("full_name"),
        supabase.from("districts").select("id, name").order("display_order"),
        supabase.from("circles").select("id, name, district_id"),
        supabase.from("police_stations").select("id, name, circle_id"),
      ]);
      return { staff: s.data ?? [], districts: d.data ?? [], circles: c.data ?? [], stations: p.data ?? [] };
    },
  });

  const filteredStaff = useMemo(() => {
    const t = staffSearch.toLowerCase().trim();
    if (!t) return refs?.staff.slice(0, 50) ?? [];
    return (refs?.staff ?? []).filter((x) => x.full_name?.toLowerCase().includes(t) || x.service_number?.toLowerCase().includes(t)).slice(0, 50);
  }, [refs, staffSearch]);

  const circles = useMemo(() => (refs?.circles ?? []).filter((c) => c.district_id === toDistrict), [refs, toDistrict]);
  const stations = useMemo(() => (refs?.stations ?? []).filter((p) => p.circle_id === toCircle), [refs, toCircle]);
  const fromStaff = refs?.staff.find((s) => s.id === staffId);

  const save = async () => {
    if (!staffId || !toDistrict || !toPosting) { toast.error("Staff, destination district and posting are required"); return; }
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const payload = {
      staff_id: staffId,
      transfer_kind: kind,
      order_number: orderNo || null,
      order_date: orderDate,
      from_district_id: fromStaff?.district_id ?? null,
      from_circle_id: fromStaff?.circle_id ?? null,
      from_police_station_id: fromStaff?.police_station_id ?? null,
      from_posting_type: fromStaff?.posting_type ?? null,
      to_district_id: toDistrict,
      to_circle_id: toCircle || null,
      to_police_station_id: toStation || null,
      to_posting_type: toPosting,
      attachment_end_date: attachmentEnd || null,
      remarks: remarks || null,
      created_by: u.user?.id ?? null,
    };
    const { data, error } = await supabase.from("transfers").insert(payload as never).select("id").single();
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    await logAudit({ action: "transfer", entity: "transfer", entity_id: data?.id, details: { staff_id: staffId, kind } });
    toast.success("Transfer recorded; staff posting updated.");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Transfer Order</DialogTitle></DialogHeader>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Staff Member *</Label>
            <Input placeholder="Search by name or service #" value={staffSearch} onChange={(e) => setStaffSearch(e.target.value)} className="mt-1" />
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger className="mt-2"><SelectValue placeholder="Select staff" /></SelectTrigger>
              <SelectContent>{filteredStaff.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name} {s.service_number ? `• ${s.service_number}` : ""}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Transfer Type *</Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{TRANSFER_KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs text-muted-foreground">Order Number</Label><Input className="mt-1" value={orderNo} onChange={(e) => setOrderNo(e.target.value)} /></div>
          <div><Label className="text-xs text-muted-foreground">Order Date</Label><Input className="mt-1" type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} /></div>

          <div>
            <Label className="text-xs text-muted-foreground">To District *</Label>
            <Select value={toDistrict} onValueChange={(v) => { setToDistrict(v); setToCircle(""); setToStation(""); }}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{refs?.districts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">To Posting Type *</Label>
            <Select value={toPosting} onValueChange={setToPosting}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{POSTING_TYPES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">To Circle</Label>
            <Select value={toCircle} onValueChange={(v) => { setToCircle(v); setToStation(""); }}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{circles.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">To Police Station</Label>
            <Select value={toStation} onValueChange={setToStation}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{stations.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {kind === "attachment" && (
            <div><Label className="text-xs text-muted-foreground">Attachment End Date</Label><Input className="mt-1" type="date" value={attachmentEnd} onChange={(e) => setAttachmentEnd(e.target.value)} /></div>
          )}
          <div className="sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Remarks</Label>
            <Textarea className="mt-1" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={busy}>{busy ? "Saving..." : "Record Transfer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
