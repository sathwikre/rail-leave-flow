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

  const [onLeaveRows, setOnLeaveRows] = useState<
    {
      employeeId: string;
      employeeName: string;
      stationName: string;
      designation: string;
      fromDate: string;
      toDate: string;
      days: number;
    }[]
  >([]);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const response = await fetch(apiUrl("/api/dashboard"), { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (!ignore) {
          setStats(data);
          console.log("Dashboard total employees:", data.totalEmployees);
        }
      } catch (error) {
        console.warn("Failed to load dashboard data", error);
      }
    }

    async function loadOnLeaveDetails() {
      try {
        const r = await fetch(apiUrl("/api/dashboard/on-leave-today"), { cache: "no-store" });
        if (!r.ok) return;
        const list = await r.json();
        if (!ignore) setOnLeaveRows(list);
      } catch (e) {
        console.warn("Failed to load on-leave list", e);
      }
    }

    load();
    loadOnLeaveDetails();
    window.addEventListener("focus", load);
    window.addEventListener("focus", loadOnLeaveDetails);
    return () => {
      ignore = true;
      window.removeEventListener("focus", load);
      window.removeEventListener("focus", loadOnLeaveDetails);
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
          value={onLeaveRows.length}
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
          <h2 className="font-display text-lg font-bold">WHO IS ON LEAVE TODAY</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3 font-medium">Employee ID</th>
                <th className="text-left px-5 py-3 font-medium">Employee Name</th>
                <th className="text-left px-5 py-3 font-medium">Station</th>
                <th className="text-left px-5 py-3 font-medium">Designation</th>
                <th className="text-left px-5 py-3 font-medium">From</th>
                <th className="text-left px-5 py-3 font-medium">To</th>
                <th className="text-left px-5 py-3 font-medium">Days</th>
              </tr>
            </thead>
            <tbody>
              {onLeaveRows.map((r, idx) => (
                <tr key={`${r.employeeId}-${idx}`} className="border-t border-border hover:bg-muted/30">
                  <td className="px-5 py-3 font-mono text-xs">{r.employeeId}</td>
                  <td className="px-5 py-3">{r.employeeName}</td>
                  <td className="px-5 py-3">{r.stationName}</td>
                  <td className="px-5 py-3">{r.designation}</td>
                  <td className="px-5 py-3 whitespace-nowrap">{formatShortDate(r.fromDate)}</td>
                  <td className="px-5 py-3 whitespace-nowrap">{formatShortDate(r.toDate)}</td>
                  <td className="px-5 py-3 font-semibold">{r.days}</td>
                </tr>
              ))}
              {onLeaveRows.length === 0 && (
                <tr>
                  <td className="px-5 py-5 text-muted-foreground" colSpan={7}>
                    No employees are on leave today
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

function formatShortDate(dateStr: string) {
  // dateStr expected in YYYY-MM-DD
  try {
    const d = new Date(dateStr + "T00:00:00Z");
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
  } catch (e) {
    return dateStr;
  }
}
