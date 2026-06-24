import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, CheckCircle2, Users } from "lucide-react";
import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
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

type PendingLeaveRequest = {
  id: string;
  employeeId: string;
  employeeName: string;
  designation: string;
  stationName: string;
  fromDate: string;
  toDate: string;
  days: number;
  leaveType: string;
  status: "Pending";
  employeesAlreadyOnLeave: number;
  recentLeave: null | {
    fromDate: string;
    toDate: string;
    leaveType: string;
    days: number;
    status: "Approved" | "Rejected";
  };
};

type OnLeaveRow = {
  employeeId: string;
  employeeName: string;
  stationName: string;
  designation: string;
  fromDate: string;
  toDate: string;
  days: number;
};

type DashboardCache = {
  stats?: DashboardStats;
  selectedDate?: string;
  onLeaveRows?: OnLeaveRow[];
  onLeaveCount?: number;
  sickLeavesCount?: number;
  pendingRequests?: PendingLeaveRequest[];
};

const DASHBOARD_CACHE_KEY = "railway-dashboard-cache-v1";

const emptyStats: DashboardStats = {
  totalStations: 0,
  totalEmployees: 0,
  employeesOnLeaveToday: 0,
  pendingLeaveRequests: 0,
  recentlyApprovedLeaves: [],
};

function Dashboard() {
  const cachedDashboard = readDashboardCache();
  const initialSelectedDate = todayInputDate();
  const canUseDateCache = cachedDashboard.selectedDate === initialSelectedDate;
  const [stats, setStats] = useState<DashboardStats>(cachedDashboard.stats ?? emptyStats);

  const [onLeaveRows, setOnLeaveRows] = useState<OnLeaveRow[]>(canUseDateCache ? cachedDashboard.onLeaveRows ?? [] : []);
  const [selectedDate, setSelectedDate] = useState(() => {
    return initialSelectedDate;
  });
  const selectedDateRef = useRef(selectedDate);
  const [onLeaveCount, setOnLeaveCount] = useState(canUseDateCache ? cachedDashboard.onLeaveCount ?? cachedDashboard.onLeaveRows?.length ?? 0 : 0);
  const [sickLeavesCount, setSickLeavesCount] = useState(canUseDateCache ? cachedDashboard.sickLeavesCount ?? 0 : 0);
  const [pendingRequests, setPendingRequests] = useState<PendingLeaveRequest[]>(canUseDateCache ? cachedDashboard.pendingRequests ?? [] : []);
  const [statsLoaded, setStatsLoaded] = useState(Boolean(cachedDashboard.stats));
  const [onLeaveLoaded, setOnLeaveLoaded] = useState(canUseDateCache && Boolean(cachedDashboard.onLeaveRows));
  const [sickLeavesLoaded, setSickLeavesLoaded] = useState(canUseDateCache && typeof cachedDashboard.sickLeavesCount === "number");
  const [pendingRequestsLoaded, setPendingRequestsLoaded] = useState(canUseDateCache && Boolean(cachedDashboard.pendingRequests));
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [showSickModal, setShowSickModal] = useState(false);
  const [sickRows, setSickRows] = useState<any[]>([]);

  async function loadDashboardStats() {
    try {
      const response = await fetch(apiUrl("/api/dashboard/stats"), { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      const nextStats = {
        totalStations: data.totalStations,
        totalEmployees: data.totalEmployees,
        employeesOnLeaveToday: data.onLeaveToday,
        pendingLeaveRequests: data.pendingRequests,
        recentlyApprovedLeaves: [],
      };
      setStats(nextStats);
      writeDashboardCache({ stats: nextStats });
      setStatsLoaded(true);
      console.log("Dashboard total employees:", data.totalEmployees);
    } catch (error) {
      console.warn("Failed to load dashboard data", error);
    }
  }

  async function loadOnLeaveDetailsForDate(date: string) {
    try {
      const r = await fetch(apiUrl(`/api/dashboard/on-leave?date=${date}`), { cache: "no-store" });
      if (!r.ok) return;
      const list = await r.json();
      setOnLeaveRows(list);
      setOnLeaveCount(list.length);
      setOnLeaveLoaded(true);
      writeDashboardCache({ selectedDate: date, onLeaveRows: list, onLeaveCount: list.length });
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
      setSickLeavesLoaded(true);
      writeDashboardCache({ selectedDate: date, sickLeavesCount: list.length });
    } catch (e) {
      console.warn("Failed to load sick leaves", e);
    }
  }

  async function loadPendingRequests(date: string) {
    try {
      const r = await fetch(apiUrl(`/api/leave-requests/pending?date=${encodeURIComponent(date)}`), { cache: "no-store" });
      if (!r.ok) return;
      const list = await r.json();
      setPendingRequests(list);
      setPendingRequestsLoaded(true);
      writeDashboardCache({ selectedDate: date, pendingRequests: list });
    } catch (e) {
      console.warn("Failed to load pending requests", e);
    }
  }

  async function refreshDashboard(date = selectedDateRef.current) {
    await Promise.all([
      loadDashboardStats(),
      loadOnLeaveDetailsForDate(date),
      loadSickCountForDate(date),
      loadPendingRequests(date),
    ]);
  }

  async function approvePendingRequest(request: PendingLeaveRequest) {
    setProcessingRequestId(request.id);
    try {
      const analysisResponse = await fetch(apiUrl(`/api/leave/${request.id}/analysis`), { cache: "no-store" });
      if (!analysisResponse.ok) {
        toast.error("Unable to fetch leave analysis");
        return;
      }

      const analysis = await analysisResponse.json();
      const force = analysis.totalAfterApproval > 4;
      const response = await fetch(apiUrl(`/api/leave/${request.id}/approve${force ? "?force=true" : ""}`), {
        method: "PATCH",
      });
      if (!response.ok) {
        toast.error("Unable to approve leave request");
        return;
      }

      toast.success("Leave approved");
      window.dispatchEvent(new CustomEvent("leave:approved", { detail: { employeeId: request.employeeId } }));
      await refreshDashboard();
    } catch (e) {
      console.warn("Failed to approve leave request", e);
      toast.error("Unable to approve leave request");
    } finally {
      setProcessingRequestId(null);
    }
  }

  async function rejectPendingRequest(request: PendingLeaveRequest) {
    setProcessingRequestId(request.id);
    try {
      const response = await fetch(apiUrl(`/api/leave/${request.id}/reject`), { method: "PATCH" });
      if (!response.ok) {
        toast.error("Unable to reject leave request");
        return;
      }

      toast.success("Leave rejected");
      window.dispatchEvent(new CustomEvent("leave:rejected", { detail: { employeeId: request.employeeId } }));
      await refreshDashboard();
    } catch (e) {
      console.warn("Failed to reject leave request", e);
      toast.error("Unable to reject leave request");
    } finally {
      setProcessingRequestId(null);
    }
  }

  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  useEffect(() => {
    let ignore = false;

    async function loadOnLeaveDetails() {
      await loadOnLeaveDetailsForDate(selectedDate);
    }

    async function loadSickCount() {
      await loadSickCountForDate(selectedDate);
    }

    loadDashboardStats();
    loadOnLeaveDetails();
    loadSickCount();
    loadPendingRequests(selectedDate);
    const refreshEvents = ["leave:approved", "leave:rejected", "leave:created", "leave:deleted"];
    function onRefresh() {
      const currentDate = selectedDateRef.current;
      refreshDashboard(currentDate);
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
            setOnLeaveLoaded(true);
            writeDashboardCache({ selectedDate, onLeaveRows: list, onLeaveCount: list.length });
          }
        }
      } catch (e) {
        console.warn(e);
      }
      try {
        const s = await fetch(apiUrl(`/api/dashboard/sick-leaves?date=${selectedDate}`), { cache: "no-store" });
        if (s.ok) {
          const sl = await s.json();
          if (!ignore) {
            setSickLeavesCount(sl.length);
            setSickLeavesLoaded(true);
            writeDashboardCache({ selectedDate, sickLeavesCount: sl.length });
          }
        }
      } catch (e) {
        console.warn(e);
      }
      if (!ignore) await loadPendingRequests(selectedDate);
    }
    refreshForDate();
    return () => { ignore = true; };
  }, [selectedDate]);

  return (
    <AppLayout
      title="Dashboard"
      subtitle={`Leave tracking across ${stats.totalStations} railway stations`}
      actions={
        <Button asChild size="sm">
          <Link to="/leave-requests">New Leave Request</Link>
        </Button>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Stations" value={statsLoaded ? stats.totalStations : "..."} icon={Building2} tone="primary" />
        <StatCard label="Total Employees" value={statsLoaded ? stats.totalEmployees : "..."} icon={Users} tone="success" />
        <StatCard
          label={`On Leave`}
          value={onLeaveLoaded ? onLeaveCount : "..."}
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
            value={sickLeavesLoaded ? sickLeavesCount : "..."}
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
          <h2 className="font-display text-lg font-bold">
            PENDING REQUESTS ON SELECTED DATE ({pendingRequestsLoaded ? pendingRequests.length : "..."})
          </h2>
        </div>
        <div className="p-5">
          {pendingRequests.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {pendingRequests.map((request) => (
                <div key={request.id} className="rounded-lg border border-border bg-background p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="font-display text-base font-bold">{request.employeeName}</div>
                      <div className="mt-1 text-xs font-mono text-muted-foreground">{request.employeeId}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {request.designation} - {request.stationName}
                      </div>
                    </div>
                    <StatusBadge status={request.status} />
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="rounded-md border border-border bg-muted/20 p-3">
                      <div className="text-xs uppercase text-muted-foreground">Leave</div>
                      <div className="mt-1 font-semibold">
                        {formatShortDate(request.fromDate)} to {formatShortDate(request.toDate)}
                      </div>
                      <div className="mt-1 text-muted-foreground">
                        {request.days} Days - {request.leaveType}
                      </div>
                    </div>
                    <div className="rounded-md border border-border bg-muted/20 p-3">
                      <div className="text-xs uppercase text-muted-foreground">Employees Already On Leave</div>
                      <div className="mt-1 font-display text-2xl font-bold">{request.employeesAlreadyOnLeave}</div>
                    </div>
                    <div className="rounded-md border border-border bg-muted/20 p-3">
                      <div className="text-xs uppercase text-muted-foreground">Actions</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => approvePendingRequest(request)}
                          disabled={processingRequestId === request.id}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rejectPendingRequest(request)}
                          disabled={processingRequestId === request.id}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-md border border-border p-3 text-sm">
                    <div className="text-xs uppercase text-muted-foreground">Recent Leave Taken By This Employee</div>
                    {request.recentLeave ? (
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span className="font-semibold">
                          {formatShortDate(request.recentLeave.fromDate)} to {formatShortDate(request.recentLeave.toDate)}
                        </span>
                        <span>{request.recentLeave.leaveType}</span>
                        <span>{request.recentLeave.days} Days</span>
                        <StatusBadge status={request.recentLeave.status} />
                      </div>
                    ) : (
                      <div className="mt-2 text-muted-foreground">No previous leave history.</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4 text-sm text-muted-foreground">
              {pendingRequestsLoaded ? "No pending requests." : "Loading pending requests..."}
            </div>
          )}
        </div>
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
                    {onLeaveLoaded ? "No employees are on leave on this date." : "Loading leave details..."}
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

function todayInputDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readDashboardCache(): DashboardCache {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(DASHBOARD_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function writeDashboardCache(partial: DashboardCache) {
  if (typeof window === "undefined") return;

  try {
    const current = readDashboardCache();
    window.localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify({ ...current, ...partial }));
  } catch (e) {
    // Ignore cache write failures. Fresh API data still renders normally.
  }
}
