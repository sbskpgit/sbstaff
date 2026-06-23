import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DUTY_STATUSES, POSTING_TYPES, TRANSFER_KINDS, labelOf } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

type Props = {
  staffId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function StaffPreviewDialog({ staffId, open, onOpenChange }: Props) {
  const { data, isLoading } = useQuery({
    enabled: open && !!staffId,
    queryKey: ["staff-preview", staffId],
    queryFn: async () => {
      const [{ data: s }, refs, { data: tr }] = await Promise.all([
        supabase.from("staff").select("*").eq("id", staffId!).maybeSingle(),
        Promise.all([
          supabase.from("districts").select("id, name"),
          supabase.from("designations").select("id, name"),
          supabase.from("circles").select("id, name"),
          supabase.from("police_stations").select("id, name"),
        ]).then(([d, dg, c, p]) => ({
          districts: new Map((d.data ?? []).map((x) => [x.id, x.name])),
          desigs: new Map((dg.data ?? []).map((x) => [x.id, x.name])),
          circles: new Map((c.data ?? []).map((x) => [x.id, x.name])),
          stations: new Map((p.data ?? []).map((x) => [x.id, x.name])),
        })),
        supabase.from("transfers").select("*").eq("staff_id", staffId!).order("order_date", { ascending: false }),
      ]);
      return { staff: s, refs, transfers: tr ?? [] };
    },
  });

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    const path = data?.staff?.photo_url;
    if (!path) { setPhotoUrl(null); return; }
    supabase.storage.from("staff-photos").createSignedUrl(path, 3600).then(({ data }) => setPhotoUrl(data?.signedUrl ?? null));
  }, [data?.staff?.photo_url]);

  const s = data?.staff;
  const refs = data?.refs;

  const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-medium text-sm truncate">{value ?? "—"}</div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Staff Preview</DialogTitle>
          <DialogDescription>Complete Nafri profile and posting history.</DialogDescription>
        </DialogHeader>

        {isLoading || !s || !refs ? (
          <div className="py-10 text-center text-muted-foreground text-sm">Loading…</div>
        ) : (
          <div className="space-y-6">
            <div className="flex gap-4 items-start">
              <div className="h-24 w-24 rounded-lg bg-muted overflow-hidden shrink-0 grid place-items-center text-2xl font-bold text-muted-foreground ring-1 ring-border">
                {photoUrl ? <img src={photoUrl} alt={s.full_name} className="h-full w-full object-cover" /> : (s.full_name?.slice(0,2).toUpperCase() ?? "—")}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold truncate">{s.full_name}</h2>
                <p className="text-sm text-muted-foreground">{refs.desigs.get(s.designation_id ?? "") ?? "—"} • BPS-{s.bps ?? "—"}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline">{labelOf(DUTY_STATUSES, s.duty_status)}</Badge>
                  <Badge variant="outline">{labelOf(POSTING_TYPES, s.posting_type)}</Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Field label="Father" value={s.father_name} />
              <Field label="CNIC" value={s.cnic} />
              <Field label="Mobile" value={s.mobile} />
              <Field label="Employee ID" value={s.employee_id} />
              <Field label="Service Number" value={s.service_number} />
              <Field label="Cadre" value={s.cadre} />
              <Field label="Date of Birth" value={s.date_of_birth} />
              <Field label="Date of Joining" value={s.date_of_joining} />
              <Field label="District" value={refs.districts.get(s.district_id)} />
              <Field label="Circle" value={refs.circles.get(s.circle_id ?? "")} />
              <Field label="Police Station" value={refs.stations.get(s.police_station_id ?? "")} />
              <Field label="Current Posting" value={s.current_posting} />
              <Field label="Previous Posting" value={s.previous_posting} />
              <Field label="Attachment" value={s.attachment_details} />
            </div>

            {s.remarks && (
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Remarks</div>
                <p className="text-sm">{s.remarks}</p>
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-2 text-sm">Transfer / Posting History</h3>
              {data.transfers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No transfers recorded.</p>
              ) : (
                <ol className="relative border-s border-border ml-2 space-y-3">
                  {data.transfers.map((t) => (
                    <li key={t.id} className="ms-4 relative">
                      <div className="absolute w-2 h-2 bg-primary rounded-full -start-[21px] mt-1.5" />
                      <div className="text-sm font-semibold">{labelOf(TRANSFER_KINDS, t.transfer_kind)}</div>
                      <div className="text-xs text-muted-foreground">{t.order_date} • Order #{t.order_number ?? "—"}</div>
                      <div className="text-sm mt-0.5">
                        {refs.districts.get(t.from_district_id ?? "") ?? "—"} → {refs.districts.get(t.to_district_id)} ({labelOf(POSTING_TYPES, t.to_posting_type)})
                      </div>
                      {t.remarks && <div className="text-xs mt-0.5 text-muted-foreground">{t.remarks}</div>}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
