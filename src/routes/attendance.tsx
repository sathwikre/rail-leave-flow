import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { employees, leaveHistoryFor } from "@/lib/mockData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/attendance")({
  head: () => ({ meta: [{ title: "Attendance — Railway LMS" }] }),
  component: AttendancePage,
});

type Status = "present" | "leave" | "absent" | "off";

function AttendancePage() {
  const [empId, setEmpId] = useState(employees[0].id);
  const [date, setDate] = useState(new Date());
  const year = date.getFullYear();
  const month = date.getMonth();

  const emp = employees.find(e => e.id === empId)!;
  const history = leaveHistoryFor(empId);
  const leaveDays = new Set(history.map(h => h.date));

  const days = useMemo(() => {
    const first = new Date(year, month, 1);
    const startDay = first.getDay();
    const total = new Date(year, month + 1, 0).getDate();
    const cells: { date: Date | null; status?: Status }[] = [];
    for (let i = 0; i < startDay; i++) cells.push({ date: null });
    for (let d = 1; d <= total; d++) {
      const dt = new Date(year, month, d);
      const iso = dt.toISOString().slice(0, 10);
      const dow = dt.getDay();
      let status: Status = "present";
      if (dow === 0) status = "off";
      else if (leaveDays.has(iso)) status = "leave";
      else if ((d * 7) % 23 === 0) status = "absent";
      cells.push({ date: dt, status });
    }
    return cells;
  }, [year, month, empId]);

  const monthName = date.toLocaleString("default", { month: "long", year: "numeric" });
  const counts = days.reduce((acc, c) => { if (c.status) acc[c.status] = (acc[c.status] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <AppLayout title="Attendance" subtitle="Calendar view of daily worker attendance">
      <div className="flex flex-col lg:flex-row gap-3 mb-6">
        <Select value={empId} onValueChange={setEmpId}>
          <SelectTrigger className="w-full lg:w-72"><SelectValue /></SelectTrigger>
          <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name} ({e.id})</SelectItem>)}</SelectContent>
        </Select>
        <div className="flex items-center gap-2 lg:ml-auto">
          <Button variant="outline" size="icon" onClick={() => setDate(new Date(year, month - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="px-4 py-2 rounded-lg bg-card border border-border min-w-[180px] text-center font-semibold">{monthName}</div>
          <Button variant="outline" size="icon" onClick={() => setDate(new Date(year, month + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Legend label="Present" count={counts.present || 0} className="bg-success/15 text-success border-success/30" />
        <Legend label="Leave" count={counts.leave || 0} className="bg-warning/15 text-warning-foreground border-warning/30" />
        <Legend label="Absent" count={counts.absent || 0} className="bg-destructive/15 text-destructive border-destructive/30" />
        <Legend label="Off Days" count={counts.off || 0} className="bg-muted text-muted-foreground border-border" />
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm p-4 sm:p-6">
        <p className="text-sm text-muted-foreground mb-4">Showing for <span className="font-semibold text-foreground">{emp.name}</span> · {emp.department}</p>
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>
          ))}
          {days.map((c, i) => (
            <div key={i} className={cn(
              "aspect-square rounded-lg border flex flex-col items-center justify-center text-sm transition-transform hover:scale-105",
              !c.date && "border-transparent",
              c.status === "present" && "bg-success/10 border-success/30 text-success",
              c.status === "leave" && "bg-warning/15 border-warning/30 text-warning-foreground",
              c.status === "absent" && "bg-destructive/10 border-destructive/30 text-destructive",
              c.status === "off" && "bg-muted/40 border-border text-muted-foreground",
            )}>
              {c.date && <span className="font-semibold">{c.date.getDate()}</span>}
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

function Legend({ label, count, className }: { label: string; count: number; className: string }) {
  return (
    <div className={cn("rounded-xl border px-4 py-3 flex items-center justify-between", className)}>
      <span className="text-sm font-semibold">{label}</span>
      <span className="font-display text-xl font-bold">{count}</span>
    </div>
  );
}
