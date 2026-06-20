import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, CheckCircle2, Users } from "lucide-react";
import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { useEffect, useState } from "react";
import { AppLayout, StatusBadge } from "@/components/AppLayout";
import { apiUrl } from "@/lib/api";
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
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [onLeaveCount, setOnLeaveCount] = useState(0);
  const [sickLeavesCount, setSickLeavesCount] = useState(0);
  const [showSickModal, setShowSickModal] = useState(false);
  const [sickRows, setSickRows] = useState<any[]>([]);

  async function loadOnLeaveDetailsForDate(date: string) {
    try {
      const r = await fetch(apiUrl(`/api/dashboard/on-leave?date=${date}`), { cache: "no-store" });
      if (!r.ok) return;
      const list = await r.json();
      setOnLeaveRows(list);
      setOnLeaveCount(list.length);
    } catch (e) {
      console.warn("Failed to load on-leave list", e);
    }
  }

  async function loadSickCountForDate(date: string) {
    try {
      const r = await fetch(apiUrl(`/api/dashboard/sick-leaves?date=${date}`), { cache: "no-store" });
      if (!r.ok) return;
      const list = await r.json();
      setSickLeavesCount(list.length);
    } catch (e) {
      console.warn("Failed to load sick leaves", e);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const response = await fetch(apiUrl("/api/dashboard/stats"), { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (!ignore) {
          setStats({
            totalStations: data.totalStations,
            totalEmployees: data.totalEmployees,
            employeesOnLeaveToday: data.onLeaveToday,
            pendingLeaveRequests: data.pendingRequests,
            recentlyApprovedLeaves: [],
          });
          console.log("Dashboard total employees:", data.totalEmployees);
        }
      } catch (error) {
        console.warn("Failed to load dashboard data", error);
      }
    }

    async function loadOnLeaveDetails() {
      await loadOnLeaveDetailsForDate(selectedDate);
    }

    async function loadSickCount() {
      await loadSickCountForDate(selectedDate);
    }

    load();
    loadOnLeaveDetails();
    loadSickCount();
    const refreshEvents = ["leave:approved", "leave:rejected", "leave:created"];
    function onRefresh() {
      load();
      loadOnLeaveDetailsForDate(selectedDate);
      loadSickCountForDate(selectedDate);
    }
    window.addEventListener("focus", onRefresh);
    window.addEventListener("focus", loadOnLeaveDetails);
    refreshEvents.forEach((ev) => window.addEventListener(ev, onRefresh as EventListener));
    // listen for server import refresh event
    function onAppRefresh() {
      onRefresh();
    }
    window.addEventListener("app:refresh", onAppRefresh as EventListener);
    return () => {
      ignore = true;
      window.removeEventListener("focus", onRefresh);
      window.removeEventListener("focus", loadOnLeaveDetails);
      refreshEvents.forEach((ev) => window.removeEventListener(ev, onRefresh as EventListener));
      window.removeEventListener("app:refresh", onAppRefresh as EventListener);
    };
  }, []);

  // refetch when selectedDate changes
  useEffect(() => {
    let ignore = false;
    async function refreshForDate() {
      try {
        const r = await fetch(apiUrl(`/api/dashboard/on-leave?date=${selectedDate}`), { cache: "no-store" });
        if (r.ok) {
          const list = await r.json();
          if (!ignore) {
            setOnLeaveRows(list);
            setOnLeaveCount(list.length);
          }
        }
      } catch (e) {
        console.warn(e);
      }
      try {
        const s = await fetch(apiUrl(`/api/dashboard/sick-leaves?date=${selectedDate}`), { cache: "no-store" });
        if (s.ok) {
          const sl = await s.json();
          if (!ignore) setSickLeavesCount(sl.length);
        }
      } catch (e) {
        console.warn(e);
      }
    }
    refreshForDate();
    return () => { ignore = true; };
  }, [selectedDate]);

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
          label={`On Leave`}
          value={onLeaveCount}
          icon={CheckCircle2}
          tone="warning"
        />
        <div
          onClick={async () => {
            try {
              const r = await fetch(apiUrl(`/api/dashboard/sick-leaves?date=${selectedDate}`), { cache: "no-store" });
              if (!r.ok) return;
              const list = await r.json();
              setSickRows(list);
              setShowSickModal(true);
            } catch (e) {
              console.warn("Failed to load sick leaves for modal", e);
            }
          }}
        >
          <StatCard
            label={`Sick Leaves Today`}
            value={sickLeavesCount}
            icon={CheckCircle2}
            tone="destructive"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="text-sm font-medium">Selected Date:</div>
        <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="font-display text-lg font-bold">WHO IS ON LEAVE ON {formatShortDate(selectedDate)}</h2>
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
                    No employees are on leave on this date.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AlertDialog open={showSickModal} onOpenChange={(open) => !open && setShowSickModal(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Employees On Sick Leave</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Employee ID</th>
                  <th className="text-left px-5 py-3 font-medium">Employee Name</th>
                  <th className="text-left px-5 py-3 font-medium">Station</th>
                  <th className="text-left px-5 py-3 font-medium">Designation</th>
                  <th className="text-left px-5 py-3 font-medium">From Date</th>
                  <th className="text-left px-5 py-3 font-medium">To Date</th>
                  <th className="text-left px-5 py-3 font-medium">Days</th>
                  <th className="text-left px-5 py-3 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {sickRows.map((r, idx) => (
                  <tr key={`${r.employeeId}-${idx}`} className="border-t border-border hover:bg-muted/30">
                    <td className="px-5 py-3 font-mono text-xs">{r.employeeId}</td>
                    <td className="px-5 py-3">{r.employeeName}</td>
                    <td className="px-5 py-3">{r.stationName}</td>
                    <td className="px-5 py-3">{r.designation}</td>
                    <td className="px-5 py-3 whitespace-nowrap">{formatShortDate(r.fromDate)}</td>
                    <td className="px-5 py-3 whitespace-nowrap">{formatShortDate(r.toDate)}</td>
                    <td className="px-5 py-3 font-semibold">{r.days}</td>
                    <td className="px-5 py-3">{r.reason}</td>
                  </tr>
                ))}
                {sickRows.length === 0 && (
                  <tr>
                    <td className="px-5 py-5 text-muted-foreground" colSpan={8}>No sick leaves on this date.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowSickModal(false)}>Close</AlertDialogCancel>
            <AlertDialogAction onClick={() => setShowSickModal(false)}>Done</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
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
