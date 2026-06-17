import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, UserCheck, UserX, Clock, ArrowRight, Plus, Download, CalendarDays } from "lucide-react";
import { AppLayout, StatusBadge } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — Railway LMS" }] }),
  component: Dashboard,
});

function Dashboard() {
  const [stats, setStats] = useState({
    totalWorkers: 0,
    presentToday: 0,
    onLeaveToday: 0,
    pendingRequests: 0,
    approvedThisMonth: 0,
    rejectedThisMonth: 0,
  });
  const [onLeaveTodayList, setOnLeaveTodayList] = useState<any[]>([]);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const dashRes = await fetch(apiUrl("/api/dashboard"));
        if (dashRes.ok) {
          const data = await dashRes.json();
          if (!ignore) setStats(data);
        }

        const leavesRes = await fetch(apiUrl("/api/leave-requests?status=approved"));
        const leaves = leavesRes.ok ? await leavesRes.json() : [];
        const empRes = await fetch(apiUrl("/api/employees"));
        const emps = empRes.ok ? await empRes.json() : [];

        const today = new Date().toISOString().slice(0, 10);
        const onLeave = (leaves || [])
          .filter((r: any) => r.fromDate <= today && r.toDate >= today)
          .map((r: any) => ({ ...r, emp: emps.find((e: any) => e.id === r.employeeId) }));

        if (!ignore) setOnLeaveTodayList(onLeave.slice(0, 10));
      } catch (err) {
        console.warn("Failed to load dashboard data", err);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <AppLayout
      title="Dashboard"
      subtitle="Overview of leave activity across all departments"
      actions={<Button size="sm" className="hidden sm:inline-flex"><Download className="h-4 w-4 mr-2" />Export</Button>}
    >
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard label="Total Workers" value={stats.totalWorkers} icon={Users} tone="primary" />
        <StatCard label="Present Today" value={stats.presentToday} icon={UserCheck} tone="success" trend={`${stats.totalWorkers ? Math.round((stats.presentToday / stats.totalWorkers) * 100) : 0}% attendance`} />
        <StatCard label="On Leave Today" value={stats.onLeaveToday} icon={UserX} tone="warning" />
      </div>

      <div className="mt-6">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="font-display text-lg font-bold mb-4">On Leave Today</h2>
          <div className="space-y-3">
            {onLeaveTodayList.length === 0 && <p className="text-sm text-muted-foreground">No workers on leave today.</p>}
            {onLeaveTodayList.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40">
                <Avatar className="h-9 w-9 shrink-0"><AvatarFallback className="bg-primary/10 text-primary text-xs">{String(r.employeeName || "").split(" ").map((s: string) => s[0]).slice(0, 2).join("")}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{r.employeeName}</div>
                  <div className="text-xs text-muted-foreground truncate">{r.emp?.department} · until {r.toDate}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function apiUrl(path: string) {
  const apiBase = import.meta.env?.VITE_API_BASE ?? "";
  return apiBase ? `${apiBase.replace(/\/$/, "")}${path}` : path;
}
