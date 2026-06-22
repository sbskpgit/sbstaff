import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label, value, icon: Icon, tone = "default", hint,
}: {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  tone?: "default" | "primary" | "success" | "warning" | "info" | "destructive";
  hint?: string;
}) {
  const tones: Record<string, string> = {
    default: "bg-muted text-muted-foreground",
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning-foreground",
    info: "bg-info/15 text-info",
    destructive: "bg-destructive/10 text-destructive",
  };
  return (
    <div className="card-elevated p-4 flex items-start gap-3">
      {Icon && (
        <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-lg", tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">{value}</div>
        {hint && <div className="mt-1 text-[11px] text-muted-foreground truncate">{hint}</div>}
      </div>
    </div>
  );
}
