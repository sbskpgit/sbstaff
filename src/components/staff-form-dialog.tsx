import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DUTY_STATUSES, POSTING_TYPES } from "@/lib/constants";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { logAudit } from "@/lib/audit";

type StaffRow = {
  id?: string;
  employee_id?: string | null;
  service_number?: string | null;
  full_name: string;
  father_name?: string | null;
  cnic?: string | null;
  mobile?: string | null;
  designation_id?: string | null;
  cadre?: string | null;
  bps?: number | null;
  date_of_birth?: string | null;
  date_of_joining?: string | null;
  district_id: string;
  circle_id?: string | null;
  police_station_id?: string | null;
  posting_type: string;
  current_posting?: string | null;
  duty_status: string;
  attachment_details?: string | null;
  remarks?: string | null;
  photo_url?: string | null;
};

export function StaffFormDialog({
  open, onOpenChange, initial, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<StaffRow> | null;
  onSaved: () => void;
}) {
  const { isSuperAdmin, districtId } = useAuth();
  const [form, setForm] = useState<StaffRow>({
    full_name: "",
    district_id: "",
    posting_type: "district_office",
    duty_status: "active",
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: refs } = useQuery({
    queryKey: ["refs"],
    queryFn: async () => {
      const [d, c, p, dg] = await Promise.all([
        supabase.from("districts").select("id, name, display_order").order("display_order"),
        supabase.from("circles").select("id, name, district_id").order("name"),
        supabase.from("police_stations").select("id, name, circle_id, district_id").order("name"),
        supabase.from("designations").select("id, name, bps, category").order("display_order"),
      ]);
      return { districts: d.data ?? [], circles: c.data ?? [], stations: p.data ?? [], designations: dg.data ?? [] };
    },
  });

  useEffect(() => {
    if (open) {
      const defaultDistrict = !isSuperAdmin && districtId ? districtId : (refs?.districts[0]?.id ?? "");
      setForm({
        full_name: "",
        district_id: defaultDistrict,
        posting_type: "district_office",
        duty_status: "active",
        ...initial,
      } as StaffRow);
      setPhotoFile(null);
    }
  }, [open, initial, isSuperAdmin, districtId, refs]);

  const circles = useMemo(() => (refs?.circles ?? []).filter((c) => c.district_id === form.district_id), [refs, form.district_id]);
  const stations = useMemo(() => (refs?.stations ?? []).filter((p) => p.circle_id === form.circle_id), [refs, form.circle_id]);

  const set = <K extends keyof StaffRow>(k: K, v: StaffRow[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.full_name || !form.district_id) { toast.error("Name and District are required"); return; }
    setBusy(true);
    try {
      let photo_url = form.photo_url ?? null;
      if (photoFile) {
        const ext = photoFile.name.split(".").pop() ?? "jpg";
        const path = `${form.district_id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("staff-photos").upload(path, photoFile, { upsert: true });
        if (upErr) throw upErr;
        photo_url = path;
      }
      const payload = { ...form, photo_url };
      // normalize empty strings to null
      (Object.keys(payload) as (keyof StaffRow)[]).forEach((k) => {
        if (payload[k] === "") (payload[k] as unknown) = null;
      });
      if (form.id) {
        const { error } = await supabase.from("staff").update(payload as never).eq("id", form.id);
        if (error) throw error;
        await logAudit({ action: "update", entity: "staff", entity_id: form.id, details: { name: form.full_name } });
        toast.success("Staff updated");
      } else {
        const { data, error } = await supabase.from("staff").insert(payload as never).select("id").single();
        if (error) throw error;
        await logAudit({ action: "create", entity: "staff", entity_id: data?.id, details: { name: form.full_name } });
        toast.success("Staff added");
      }
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{form.id ? "Edit Staff" : "Add Staff"}</DialogTitle></DialogHeader>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Full Name *"><Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} /></Field>
          <Field label="Father Name"><Input value={form.father_name ?? ""} onChange={(e) => set("father_name", e.target.value)} /></Field>
          <Field label="Employee ID"><Input value={form.employee_id ?? ""} onChange={(e) => set("employee_id", e.target.value)} /></Field>
          <Field label="Service Number"><Input value={form.service_number ?? ""} onChange={(e) => set("service_number", e.target.value)} /></Field>
          <Field label="CNIC"><Input placeholder="35202-XXXXXXX-X" value={form.cnic ?? ""} onChange={(e) => set("cnic", e.target.value)} /></Field>
          <Field label="Mobile"><Input placeholder="03XX-XXXXXXX" value={form.mobile ?? ""} onChange={(e) => set("mobile", e.target.value)} /></Field>
          <Field label="Designation">
            <Select value={form.designation_id ?? ""} onValueChange={(v) => {
              const d = refs?.designations.find((x) => x.id === v);
              set("designation_id", v);
              if (d?.bps) set("bps", d.bps);
              if (d?.category) set("cadre", d.category);
            }}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{refs?.designations.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Cadre"><Input value={form.cadre ?? ""} onChange={(e) => set("cadre", e.target.value)} /></Field>
          <Field label="BPS"><Input type="number" value={form.bps ?? ""} onChange={(e) => set("bps", e.target.value ? Number(e.target.value) : null)} /></Field>
          <Field label="Date of Birth"><Input type="date" value={form.date_of_birth ?? ""} onChange={(e) => set("date_of_birth", e.target.value)} /></Field>
          <Field label="Date of Joining"><Input type="date" value={form.date_of_joining ?? ""} onChange={(e) => set("date_of_joining", e.target.value)} /></Field>

          <Field label="District *">
            <Select value={form.district_id} onValueChange={(v) => { set("district_id", v); set("circle_id", null); set("police_station_id", null); }} disabled={!isSuperAdmin && !!districtId}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{refs?.districts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Posting Type *">
            <Select value={form.posting_type} onValueChange={(v) => set("posting_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{POSTING_TYPES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Circle">
            <Select value={form.circle_id ?? ""} onValueChange={(v) => { set("circle_id", v); set("police_station_id", null); }}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{circles.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Police Station">
            <Select value={form.police_station_id ?? ""} onValueChange={(v) => set("police_station_id", v)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{stations.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Duty Status *">
            <Select value={form.duty_status} onValueChange={(v) => set("duty_status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DUTY_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Current Posting (text)"><Input value={form.current_posting ?? ""} onChange={(e) => set("current_posting", e.target.value)} /></Field>
          <Field label="Attachment Details" className="sm:col-span-2"><Input value={form.attachment_details ?? ""} onChange={(e) => set("attachment_details", e.target.value)} /></Field>
          <Field label="Remarks" className="sm:col-span-2"><Textarea value={form.remarks ?? ""} onChange={(e) => set("remarks", e.target.value)} /></Field>
          <Field label="Photograph" className="sm:col-span-2"><Input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={busy}>{busy ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
