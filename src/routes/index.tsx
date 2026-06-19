import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, CheckCircle2, Clock, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { AppLayout, StatusBadge } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard - Railway LMS" }] }),
  component: Dashboard,
});

type DashboardStats = {
  totalStations: number;
  totalEmployees: number;
  employeesOnLeaveToday: number;
  pendingLeaveRequests: number;
  recentlyApprovedLeaves: LeaveRequest[];
};

type LeaveRequest = {
  id: string;
  employeeId: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
};

function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalStations: 0,
    totalEmployees: 0,
    employeesOnLeaveToday: 0,
    pendingLeaveRequests: 0,
    recentlyApprovedLeaves: [],
  });

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const response = await fetch(apiUrl("/api/dashboard"), { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (!ignore) setStats(data);
      } catch (error) {
        console.warn("Failed to load dashboard data", error);
      }
    }

    load();
    window.addEventListener("focus", load);
    return () => {
      ignore = true;
      window.removeEventListener("focus", load);
    };
  }, []);

  return (
    <AppLayout
      title="Dashboard"
      subtitle="Leave tracking across 10 railway stations"
      actions={
        <Button asChild size="sm">
          <Link to="/leave-requests">New Leave Request</Link>
        </Button>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Stations" value={stats.totalStations} icon={Building2} tone="primary" />
        <StatCard label="Total Employees" value={stats.totalEmployees} icon={Users} tone="success" />
        <StatCard
          label="On Leave Today"
          value={stats.employeesOnLeaveToday}
          icon={CheckCircle2}
          tone="warning"
        />
        <StatCard
          label="Pending Requests"
          value={stats.pendingLeaveRequests}
          icon={Clock}
          tone="destructive"
        />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="font-display text-lg font-bold">Recently Approved Leaves</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3 font-medium">Employee ID</th>
                <th className="text-left px-5 py-3 font-medium">From</th>
                <th className="text-left px-5 py-3 font-medium">To</th>
                <th className="text-left px-5 py-3 font-medium">Days</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentlyApprovedLeaves.map((leave) => (
                <tr key={leave.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-5 py-3 font-mono text-xs">{leave.employeeId}</td>
                  <td className="px-5 py-3 whitespace-nowrap">{leave.fromDate}</td>
                  <td className="px-5 py-3 whitespace-nowrap">{leave.toDate}</td>
                  <td className="px-5 py-3 font-semibold">{leave.days}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={leave.status} />
                  </td>
                </tr>
              ))}
              {stats.recentlyApprovedLeaves.length === 0 && (
                <tr>
                  <td className="px-5 py-5 text-muted-foreground" colSpan={5}>
                    No recently approved leaves.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}

function apiUrl(path: string) {
  const apiBase = import.meta.env?.VITE_API_BASE ?? "";
  return apiBase ? `${apiBase.replace(/\/$/, "")}${path}` : path;
}
