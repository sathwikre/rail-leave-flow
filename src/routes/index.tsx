import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, UserCheck, UserX, Clock, CheckCircle2, XCircle, ArrowRight, Plus, Download, CalendarDays } from "lucide-react";
import { AppLayout, StatusBadge } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { getDashboardStats, leaveRequests, monthlyStats, employees } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — Railway LMS" }] }),
  component: Dashboard,
});

function Dashboard() {
  const stats = getDashboardStats();
  const recent = leaveRequests.slice(0, 6);
  const onLeaveToday = leaveRequests
    .filter(r => r.status === "approved")
    .slice(0, 5)
    .map(r => ({ ...r, emp: employees.find(e => e.id === r.employeeId)! }));

  return (
    <AppLayout
      title="Dashboard"
      subtitle="Overview of leave activity across all departments"
      actions={
        <Button size="sm" className="hidden sm:inline-flex"><Download className="h-4 w-4 mr-2" />Export</Button>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Total Workers" value={stats.totalWorkers} icon={Users} tone="primary" trend="+2 this month" />
        <StatCard label="Present Today" value={stats.presentToday} icon={UserCheck} tone="success" trend={`${Math.round(stats.presentToday / stats.totalWorkers * 100)}% attendance`} />
        <StatCard label="On Leave Today" value={stats.onLeaveToday} icon={UserX} tone="warning" />
        <StatCard label="Pending Requests" value={stats.pendingRequests} icon={Clock} tone="warning" trend="Needs review" />
        <StatCard label="Approved (Month)" value={stats.approvedThisMonth} icon={CheckCircle2} tone="success" />
        <StatCard label="Rejected (Month)" value={stats.rejectedThisMonth} icon={XCircle} tone="destructive" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-lg font-bold">Monthly Leave Statistics</h2>
              <p className="text-xs text-muted-foreground">Approved vs rejected requests across the year</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="approved" fill="var(--chart-3)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="rejected" fill="var(--chart-5)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="pending" fill="var(--chart-4)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <Link to="/leave-requests" className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors group">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground"><Clock className="h-4 w-4" /></div>
                <div><div className="text-sm font-semibold">Review Pending</div><div className="text-xs text-muted-foreground">{stats.pendingRequests} awaiting</div></div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/employees" className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors group">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-success text-success-foreground"><Users className="h-4 w-4" /></div>
                <div><div className="text-sm font-semibold">Manage Workers</div><div className="text-xs text-muted-foreground">{stats.totalWorkers} active</div></div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/attendance" className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors group">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-chart-2 text-primary-foreground"><CalendarDays className="h-4 w-4" /></div>
                <div><div className="text-sm font-semibold">Attendance Log</div><div className="text-xs text-muted-foreground">View calendar</div></div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="w-full flex items-center justify-between p-3 rounded-xl border border-dashed border-border hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Plus className="h-4 w-4" /><span className="text-sm font-medium">Add Manual Leave</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="font-display text-lg font-bold">Recent Leave Requests</h2>
            <Link to="/leave-requests" className="text-xs font-medium text-primary hover:underline">View all</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr><th className="text-left px-5 py-3 font-medium">Employee</th><th className="text-left px-5 py-3 font-medium">Dates</th><th className="text-left px-5 py-3 font-medium">Days</th><th className="text-left px-5 py-3 font-medium">Status</th><th></th></tr>
              </thead>
              <tbody>
                {recent.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-medium truncate">{r.employeeName}</div>
                      <div className="text-xs text-muted-foreground">{r.employeeId}</div>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-xs">{r.fromDate} → {r.toDate}</td>
                    <td className="px-5 py-3"><span className="font-semibold">{r.days}</span></td>
                    <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-5 py-3 text-right">
                      <Link to="/leave-requests/$id" params={{ id: r.id }} className="text-xs font-medium text-primary hover:underline">Details</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="font-display text-lg font-bold mb-4">On Leave Today</h2>
          <div className="space-y-3">
            {onLeaveToday.length === 0 && <p className="text-sm text-muted-foreground">No workers on leave today.</p>}
            {onLeaveToday.map(r => (
              <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40">
                <Avatar className="h-9 w-9 shrink-0"><AvatarFallback className="bg-primary/10 text-primary text-xs">{r.employeeName.split(" ").map(s => s[0]).slice(0, 2).join("")}</AvatarFallback></Avatar>
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
