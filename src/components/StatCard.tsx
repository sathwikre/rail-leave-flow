import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  tone?: "primary" | "success" | "warning" | "destructive" | "muted";
}

const toneMap = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning-foreground",
  destructive: "bg-destructive/10 text-destructive",
  muted: "bg-muted text-foreground",
};

export function StatCard({ label, value, icon: Icon, trend, tone = "primary" }: Props) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">{label}</p>
          <p className="font-display text-3xl font-bold mt-2 tracking-tight">{value}</p>
          {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
        </div>
        <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl transition-transform group-hover:scale-110", toneMap[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
