import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { leaveRequests, monthlyStats, departmentStats, topLeaveTakers } from "@/lib/mockData";
import { FileText, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — Railway LMS" }] }),
  component: ReportsPage,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--primary)"];

function ReportsPage() {
  const total = leaveRequests.length;
  const approved = leaveRequests.filter(r => r.status === "approved").length;
  const rejected = leaveRequests.filter(r => r.status === "rejected").length;
  const pending = leaveRequests.filter(r => r.status === "pending").length;

  return (
    <AppLayout title="Reports & Analytics" subtitle="Leave insights across departments and time">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Requests" value={total} icon={FileText} tone="primary" />
        <StatCard label="Approved" value={approved} icon={CheckCircle2} tone="success" />
        <StatCard label="Rejected" value={rejected} icon={XCircle} tone="destructive" />
        <StatCard label="Pending" value={pending} icon={Clock} tone="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold mb-4">Monthly Leave Trends</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyStats}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                <Area type="monotone" dataKey="approved" stroke="var(--chart-1)" fill="url(#g1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold mb-4">Most Frequent Leave Takers</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topLeaveTakers} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={110} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="leaves" fill="var(--chart-2)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm lg:col-span-2">
          <h2 className="font-display text-lg font-bold mb-4">Department-wise Leave Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={departmentStats} dataKey="leaves" nameKey="department" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3}>
                    {departmentStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {departmentStats.map((d, i) => (
                <div key={d.department} className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-3 w-3 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-sm font-medium truncate">{d.department}</span>
                  </div>
                  <span className="font-display text-lg font-bold">{d.leaves}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
