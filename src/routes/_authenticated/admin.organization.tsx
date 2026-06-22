import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/organization")({
  ssr: false,
  head: () => ({ meta: [{ title: "Organization — Special Branch Sheikhupura" }] }),
  beforeLoad: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw redirect({ to: "/auth" });
    const { data } = await supabase.rpc("is_super_admin", { _user_id: u.user.id });
    if (!data) throw redirect({ to: "/dashboard" });
  },
  component: OrgAdmin,
});

function OrgAdmin() {
  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Organization</h1>
        <p className="text-sm text-muted-foreground">Manage circles, police stations and designations.</p>
      </div>
      <Tabs defaultValue="circles">
        <TabsList>
          <TabsTrigger value="circles">Circles</TabsTrigger>
          <TabsTrigger value="stations">Police Stations</TabsTrigger>
          <TabsTrigger value="designations">Designations</TabsTrigger>
        </TabsList>
        <TabsContent value="circles"><CirclesPanel /></TabsContent>
        <TabsContent value="stations"><StationsPanel /></TabsContent>
        <TabsContent value="designations"><DesignationsPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

function CirclesPanel() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [districtId, setDistrictId] = useState("");
  const { data } = useQuery({
    queryKey: ["org-circles"],
    queryFn: async () => {
      const [c, d] = await Promise.all([
        supabase.from("circles").select("id, name, district_id").order("name"),
        supabase.from("districts").select("id, name").order("display_order"),
      ]);
      return { circles: c.data ?? [], districts: d.data ?? [], dMap: new Map((d.data ?? []).map((x) => [x.id, x.name])) };
    },
  });
  const add = async () => {
    if (!name || !districtId) return toast.error("Name and district required");
    const { error } = await supabase.from("circles").insert({ name, district_id: districtId } as never);
    if (error) toast.error(error.message); else { setName(""); toast.success("Added"); qc.invalidateQueries({ queryKey: ["org-circles"] }); }
  };
  const del = async (id: string) => {
    if (!confirm("Delete circle? Its police stations will be removed.")) return;
    const { error } = await supabase.from("circles").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["org-circles"] }); }
  };
  return (
    <div className="space-y-3 mt-4">
      <div className="card-elevated p-3 grid sm:grid-cols-3 gap-2">
        <div><Label className="text-xs text-muted-foreground">District</Label>
          <Select value={districtId} onValueChange={setDistrictId}><SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{data?.districts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs text-muted-foreground">Circle Name</Label><Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. City Circle" /></div>
        <div className="flex items-end"><Button onClick={add}><Plus className="h-4 w-4 mr-1" />Add Circle</Button></div>
      </div>
      <div className="card-elevated overflow-x-auto"><Table>
        <TableHeader><TableRow><TableHead>Circle</TableHead><TableHead>District</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>{data?.circles.map((c) => (<TableRow key={c.id}><TableCell className="font-medium">{c.name}</TableCell><TableCell>{data.dMap.get(c.district_id) ?? "—"}</TableCell><TableCell className="text-right"><Button size="icon" variant="ghost" onClick={() => del(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell></TableRow>))}</TableBody>
      </Table></div>
    </div>
  );
}

function StationsPanel() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [circleId, setCircleId] = useState("");
  const { data } = useQuery({
    queryKey: ["org-stations"],
    queryFn: async () => {
      const [p, c, d] = await Promise.all([
        supabase.from("police_stations").select("id, name, circle_id, district_id").order("name"),
        supabase.from("circles").select("id, name, district_id"),
        supabase.from("districts").select("id, name"),
      ]);
      return {
        stations: p.data ?? [],
        circles: c.data ?? [],
        cMap: new Map((c.data ?? []).map((x) => [x.id, x])),
        dMap: new Map((d.data ?? []).map((x) => [x.id, x.name])),
      };
    },
  });
  const add = async () => {
    if (!name || !circleId) return toast.error("Name and circle required");
    const circle = data?.cMap.get(circleId);
    if (!circle) return;
    const { error } = await supabase.from("police_stations").insert({ name, circle_id: circleId, district_id: circle.district_id } as never);
    if (error) toast.error(error.message); else { setName(""); toast.success("Added"); qc.invalidateQueries({ queryKey: ["org-stations"] }); }
  };
  const del = async (id: string) => {
    if (!confirm("Delete police station?")) return;
    const { error } = await supabase.from("police_stations").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["org-stations"] }); }
  };
  return (
    <div className="space-y-3 mt-4">
      <div className="card-elevated p-3 grid sm:grid-cols-3 gap-2">
        <div><Label className="text-xs text-muted-foreground">Circle</Label>
          <Select value={circleId} onValueChange={setCircleId}><SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{data?.circles.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} • {data.dMap.get(c.district_id) ?? ""}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs text-muted-foreground">Police Station Name</Label><Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. PS Saddar" /></div>
        <div className="flex items-end"><Button onClick={add}><Plus className="h-4 w-4 mr-1" />Add Station</Button></div>
      </div>
      <div className="card-elevated overflow-x-auto"><Table>
        <TableHeader><TableRow><TableHead>Police Station</TableHead><TableHead>Circle</TableHead><TableHead>District</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>{data?.stations.map((p) => (<TableRow key={p.id}><TableCell className="font-medium">{p.name}</TableCell><TableCell>{data.cMap.get(p.circle_id)?.name ?? "—"}</TableCell><TableCell>{data.dMap.get(p.district_id) ?? "—"}</TableCell><TableCell className="text-right"><Button size="icon" variant="ghost" onClick={() => del(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell></TableRow>))}</TableBody>
      </Table></div>
    </div>
  );
}

function DesignationsPanel() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [bps, setBps] = useState("");
  const { data } = useQuery({
    queryKey: ["org-designations"],
    queryFn: async () => (await supabase.from("designations").select("*").order("display_order")).data ?? [],
  });
  const add = async () => {
    if (!name) return toast.error("Name required");
    const { error } = await supabase.from("designations").insert({ name, category: category || null, bps: bps ? Number(bps) : null } as never);
    if (error) toast.error(error.message); else { setName(""); setCategory(""); setBps(""); toast.success("Added"); qc.invalidateQueries({ queryKey: ["org-designations"] }); }
  };
  const del = async (id: string) => {
    if (!confirm("Delete designation?")) return;
    const { error } = await supabase.from("designations").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["org-designations"] }); }
  };
  return (
    <div className="space-y-3 mt-4">
      <div className="card-elevated p-3 grid sm:grid-cols-4 gap-2">
        <div><Label className="text-xs text-muted-foreground">Designation</Label><Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label className="text-xs text-muted-foreground">Category / Cadre</Label><Input className="mt-1" value={category} onChange={(e) => setCategory(e.target.value)} /></div>
        <div><Label className="text-xs text-muted-foreground">BPS</Label><Input className="mt-1" type="number" value={bps} onChange={(e) => setBps(e.target.value)} /></div>
        <div className="flex items-end"><Button onClick={add}><Plus className="h-4 w-4 mr-1" />Add</Button></div>
      </div>
      <div className="card-elevated overflow-x-auto"><Table>
        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>BPS</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>{data?.map((d) => (<TableRow key={d.id}><TableCell className="font-medium">{d.name}</TableCell><TableCell>{d.category ?? "—"}</TableCell><TableCell>{d.bps ?? "—"}</TableCell><TableCell className="text-right"><Button size="icon" variant="ghost" onClick={() => del(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell></TableRow>))}</TableBody>
      </Table></div>
    </div>
  );
}
