import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DUTY_STATUSES, POSTING_TYPES, labelOf } from "@/lib/constants";
import { FileDown, Printer, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/_authenticated/reports")({
  ssr: false,
  head: () => ({ meta: [{ title: "Reports — Special Branch Sheikhupura" }] }),
  component: ReportsPage,
});

type GroupBy = "district" | "circle" | "police_station" | "designation" | "duty_status" | "posting_type";

function ReportsPage() {
  const [groupBy, setGroupBy] = useState<GroupBy>("district");

  const { data } = useQuery({
    queryKey: ["report-data"],
    queryFn: async () => {
      const [st, d, dg, c, p] = await Promise.all([
        supabase.from("staff").select("*"),
        supabase.from("districts").select("id, name"),
        supabase.from("designations").select("id, name"),
        supabase.from("circles").select("id, name"),
        supabase.from("police_stations").select("id, name"),
      ]);
      return {
        staff: st.data ?? [],
        districtMap: new Map((d.data ?? []).map((x) => [x.id, x.name])),
        desigMap: new Map((dg.data ?? []).map((x) => [x.id, x.name])),
        circleMap: new Map((c.data ?? []).map((x) => [x.id, x.name])),
        stationMap: new Map((p.data ?? []).map((x) => [x.id, x.name])),
      };
    },
  });

  const groups = useMemo(() => {
    if (!data) return [] as { key: string; rows: typeof data.staff }[];
    const acc = new Map<string, typeof data.staff>();
    for (const s of data.staff) {
      let key = "—";
      switch (groupBy) {
        case "district": key = data.districtMap.get(s.district_id) ?? "—"; break;
        case "circle": key = data.circleMap.get(s.circle_id ?? "") ?? "—"; break;
        case "police_station": key = data.stationMap.get(s.police_station_id ?? "") ?? "—"; break;
        case "designation": key = data.desigMap.get(s.designation_id ?? "") ?? "—"; break;
        case "duty_status": key = labelOf(DUTY_STATUSES, s.duty_status); break;
        case "posting_type": key = labelOf(POSTING_TYPES, s.posting_type); break;
      }
      if (!acc.has(key)) acc.set(key, []);
      acc.get(key)!.push(s);
    }
    return Array.from(acc.entries()).map(([key, rows]) => ({ key, rows })).sort((a,b) => a.key.localeCompare(b.key));
  }, [data, groupBy]);

  const exportExcel = () => {
    const sheet = groups.flatMap((g) =>
      g.rows.map((r) => ({
        Group: g.key,
        Name: r.full_name,
        Designation: data?.desigMap.get(r.designation_id ?? "") ?? "",
        District: data?.districtMap.get(r.district_id) ?? "",
        Status: labelOf(DUTY_STATUSES, r.duty_status),
        Posting: labelOf(POSTING_TYPES, r.posting_type),
        CNIC: r.cnic, Mobile: r.mobile,
      })),
    );
    const ws = XLSX.utils.json_to_sheet(sheet);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `report-${groupBy}-${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const exportPdf = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Special Branch Sheikhupura Region — Staff Report", 14, 14);
    doc.setFontSize(10);
    doc.text(`Grouped by: ${groupBy.replace("_"," ")} • Generated: ${new Date().toLocaleString()}`, 14, 20);

    let y = 26;
    groups.forEach((g) => {
      autoTable(doc, {
        startY: y,
        head: [[`${g.key} (${g.rows.length})`, "Designation", "District", "Status", "Posting", "CNIC"]],
        body: g.rows.map((r) => [
          r.full_name,
          data?.desigMap.get(r.designation_id ?? "") ?? "",
          data?.districtMap.get(r.district_id) ?? "",
          labelOf(DUTY_STATUSES, r.duty_status),
          labelOf(POSTING_TYPES, r.posting_type),
          r.cnic ?? "",
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [31, 58, 46] },
        margin: { left: 14, right: 14 },
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
    });
    doc.save(`report-${groupBy}-${new Date().toISOString().slice(0,10)}.pdf`);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold">Reports & Summaries</h1>
          <p className="text-sm text-muted-foreground">Grouped staff strength reports with export.</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="district">Group by District</SelectItem>
              <SelectItem value="circle">Group by Circle</SelectItem>
              <SelectItem value="police_station">Group by Police Station</SelectItem>
              <SelectItem value="designation">Group by Rank/Designation</SelectItem>
              <SelectItem value="duty_status">Group by Duty Status</SelectItem>
              <SelectItem value="posting_type">Group by Posting Type</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportExcel}><FileSpreadsheet className="h-4 w-4 mr-1" />Excel</Button>
          <Button variant="outline" onClick={exportPdf}><FileDown className="h-4 w-4 mr-1" />PDF</Button>
          <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" />Print</Button>
        </div>
      </div>

      {groups.map((g) => (
        <div key={g.key} className="card-elevated">
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="font-semibold">{g.key}</h3>
            <span className="text-sm text-muted-foreground">{g.rows.length} staff</span>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>District</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Posting</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {g.rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.full_name}</TableCell>
                    <TableCell>{data?.desigMap.get(r.designation_id ?? "") ?? "—"}</TableCell>
                    <TableCell>{data?.districtMap.get(r.district_id) ?? "—"}</TableCell>
                    <TableCell>{labelOf(DUTY_STATUSES, r.duty_status)}</TableCell>
                    <TableCell>{labelOf(POSTING_TYPES, r.posting_type)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  );
}
