import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/stat-card";
import { Users, Building2, Shield, UserCheck, UserX, Briefcase, AlertCircle, BadgeCheck } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  head: () => ({ meta: [{ title: "Dashboard — Special Branch Sheikhupura" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [{ data: staff }, { data: districts }, { data: designations }] = await Promise.all([
        supabase.from("staff").select("id, district_id, designation_id, duty_status, posting_type"),
        supabase.from("districts").select("id, name, kind, display_order").order("display_order"),
        supabase.from("designations").select("id, name"),
      ]);
      return { staff: staff ?? [], districts: districts ?? [], designations: designations ?? [] };
    },
  });

  if (isLoading || !data) return <div className="p-6 text-muted-foreground">Loading…</div>;

  const { staff, districts, designations } = data;
  const designMap = new Map(designations.map((d) => [d.id, d.name]));
  const districtMap = new Map(districts.map((d) => [d.id, d]));
  const region = districts.find((d) => d.kind === "region");

  const countDistrict = (id: string) => staff.filter((s) => s.district_id === id).length;
  const countStatus = (status: string) => staff.filter((s) => s.duty_status === status).length;
  const countPosting = (p: string) => staff.filter((s) => s.posting_type === p).length;
  const countDesig = (name: string) =>
    staff.filter((s) => designMap.get(s.designation_id ?? "") === name).length;

  const totalStaff = staff.length;
  const vacant = countStatus("vacant");
  const attached = countStatus("attached");
  const osd = countStatus("osd");
  const hq = countStatus("headquarters");

  const districtChart = districts.map((d) => ({ name: d.name.replace(/^District\s+/, "").replace(/Regional Office /, ""), count: countDistrict(d.id) }));
  const rankChart = ["Inspector","Sub Inspector (SI)","Assistant Sub Inspector (ASI)","Head Constable","Constable","Intelligence Officer","Intelligence Operator"]
    .map((r) => ({ name: r.replace(/\s*\(.*\)/,""), count: countDesig(r) }));

  const statusChart = [
    { name: "Active", value: countStatus("active") },
    { name: "Attached", value: attached },
    { name: "OSD", value: osd },
    { name: "HQ", value: hq },
    { name: "Leave", value: countStatus("leave") },
    { name: "Vacant", value: vacant },
  ].filter((x) => x.value > 0);

  const COLORS = ["var(--chart-1)","var(--chart-2)","var(--chart-3)","var(--chart-4)","var(--chart-5)","var(--destructive)"];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Region-wide staff strength (Nafri) overview</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatCard label="Total Staff" value={totalStaff} icon={Users} tone="primary" />
        {region && <StatCard label="Regional Office" value={countDistrict(region.id)} icon={Building2} tone="info" />}
        {districts.filter((d) => d.kind === "district").map((d) => (
          <StatCard key={d.id} label={d.name.replace(/^District\s+/, "")} value={countDistrict(d.id)} icon={Shield} tone="success" />
        ))}
        <StatCard label="Attached" value={attached} icon={Briefcase} tone="warning" />
        <StatCard label="OSD" value={osd} icon={UserX} tone="warning" />
        <StatCard label="HQ Duty" value={hq} icon={BadgeCheck} tone="info" />
        <StatCard label="Vacant Posts" value={vacant} icon={AlertCircle} tone="destructive" />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">By Rank</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          <StatCard label="Inspectors" value={countDesig("Inspector")} icon={UserCheck} />
          <StatCard label="SI" value={countDesig("Sub Inspector (SI)")} icon={UserCheck} />
          <StatCard label="ASI" value={countDesig("Assistant Sub Inspector (ASI)")} icon={UserCheck} />
          <StatCard label="Head Constables" value={countDesig("Head Constable")} icon={UserCheck} />
          <StatCard label="Constables" value={countDesig("Constable")} icon={UserCheck} />
          <StatCard label="Intel Officers" value={countDesig("Intelligence Officer")} icon={UserCheck} />
          <StatCard label="Intel Operators" value={countDesig("Intelligence Operator")} icon={UserCheck} />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card-elevated p-4">
          <h3 className="font-semibold mb-3">Staff per District</h3>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={districtChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" fontSize={11} stroke="var(--muted-foreground)" />
                <YAxis fontSize={11} stroke="var(--muted-foreground)" allowDecimals={false} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="count" fill="var(--chart-1)" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card-elevated p-4">
          <h3 className="font-semibold mb-3">Duty Status</h3>
          <div className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={statusChart} dataKey="value" nameKey="name" outerRadius={90} label>
                  {statusChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card-elevated p-4 lg:col-span-2">
          <h3 className="font-semibold mb-3">By Rank</h3>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={rankChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" fontSize={11} stroke="var(--muted-foreground)" interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis fontSize={11} stroke="var(--muted-foreground)" allowDecimals={false} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="count" fill="var(--chart-2)" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      {/* avoid unused var warning */}
      <span className="hidden">{districtMap.size}</span>
    </div>
  );
}
