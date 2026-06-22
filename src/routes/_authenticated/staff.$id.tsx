import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { DUTY_STATUSES, POSTING_TYPES, TRANSFER_KINDS, labelOf } from "@/lib/constants";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated/staff/$id")({
  ssr: false,
  component: StaffDetail,
});

function StaffDetail() {
  const { id } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["staff-detail", id],
    queryFn: async () => {
      const [{ data: s }, refs, { data: tr }] = await Promise.all([
        supabase.from("staff").select("*").eq("id", id).maybeSingle(),
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
        supabase.from("transfers").select("*").eq("staff_id", id).order("order_date", { ascending: false }),
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

  if (!data?.staff) return <div className="p-6 text-muted-foreground">Loading…</div>;
  const s = data.staff;
  const refs = data.refs!;

  const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-medium">{value ?? "—"}</div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl">
      <Button asChild variant="ghost" size="sm"><Link to="/staff"><ArrowLeft className="h-4 w-4 mr-1" />Back to Staff</Link></Button>

      <div className="card-elevated p-6 flex gap-6 items-start">
        <div className="h-24 w-24 rounded-lg bg-muted overflow-hidden shrink-0 grid place-items-center text-2xl font-bold text-muted-foreground">
          {photoUrl ? <img src={photoUrl} alt={s.full_name} className="h-full w-full object-cover" /> : s.full_name.slice(0,2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold truncate">{s.full_name}</h1>
          <p className="text-muted-foreground">{refs.desigs.get(s.designation_id ?? "") ?? "—"} • BPS-{s.bps ?? "—"}</p>
          <div className="mt-4 grid sm:grid-cols-3 gap-4 text-sm">
            <Field label="Father" value={s.father_name} />
            <Field label="CNIC" value={s.cnic} />
            <Field label="Mobile" value={s.mobile} />
            <Field label="Employee ID" value={s.employee_id} />
            <Field label="Service Number" value={s.service_number} />
            <Field label="Cadre" value={s.cadre} />
            <Field label="Date of Birth" value={s.date_of_birth} />
            <Field label="Date of Joining" value={s.date_of_joining} />
            <Field label="Duty Status" value={labelOf(DUTY_STATUSES, s.duty_status)} />
            <Field label="District" value={refs.districts.get(s.district_id)} />
            <Field label="Circle" value={refs.circles.get(s.circle_id ?? "")} />
            <Field label="Police Station" value={refs.stations.get(s.police_station_id ?? "")} />
            <Field label="Posting Type" value={labelOf(POSTING_TYPES, s.posting_type)} />
            <Field label="Current Posting" value={s.current_posting} />
            <Field label="Previous Posting" value={s.previous_posting} />
            <Field label="Attachment" value={s.attachment_details} />
          </div>
          {s.remarks && (
            <div className="mt-4">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Remarks</div>
              <p className="text-sm">{s.remarks}</p>
            </div>
          )}
        </div>
      </div>

      <div className="card-elevated p-4">
        <h2 className="font-semibold mb-3">Transfer / Posting History</h2>
        {data.transfers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transfers recorded.</p>
        ) : (
          <ol className="relative border-s border-border ml-2 space-y-4">
            {data.transfers.map((t) => (
              <li key={t.id} className="ms-4">
                <div className="absolute w-2 h-2 bg-primary rounded-full -start-1 mt-2" />
                <div className="text-sm font-semibold">{labelOf(TRANSFER_KINDS, t.transfer_kind)}</div>
                <div className="text-xs text-muted-foreground">{t.order_date} • Order #{t.order_number ?? "—"}</div>
                <div className="text-sm mt-1">
                  {refs.districts.get(t.from_district_id ?? "") ?? "—"} → {refs.districts.get(t.to_district_id)} ({labelOf(POSTING_TYPES, t.to_posting_type)})
                </div>
                {t.remarks && <div className="text-xs mt-1 text-muted-foreground">{t.remarks}</div>}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
