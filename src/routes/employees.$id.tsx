import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Building2, Phone, User } from "lucide-react";
import { useEffect, useState } from "react";
import { AppLayout, StatusBadge } from "@/components/AppLayout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Route = createFileRoute("/employees/$id")({
  head: () => ({ meta: [{ title: "Employee Profile - Railway LMS" }] }),
  component: EmployeeProfile,
});

type LeaveStatus = "Pending" | "Approved" | "Rejected";
type LeaveHistory = {
  id: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
};

type EmployeeProfileData = {
  employeeId: string;
  name: string;
  phone: string;
  designation: string;
  stationName: string;
  leavesUsedThisMonth: number;
  remainingLeaves: number;
  lastLeaveDate: string | null;
  monthlyLeaveLimitExceeded: boolean;
  leaveHistory: LeaveHistory[];
};

function EmployeeProfile() {
  const { id } = Route.useParams();
  const [employee, setEmployee] = useState<EmployeeProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const response = await fetch(apiUrl(`/api/employees/${id}`), { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (!ignore) setEmployee(data);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [id]);

  if (loading) {
    return (
      <AppLayout title="Employee Profile">
        <p className="text-sm text-muted-foreground">Loading employee...</p>
      </AppLayout>
    );
  }

  if (!employee) {
    return (
      <AppLayout title="Not Found">
        <p>Employee not found</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={employee.name} subtitle={employee.stationName}>
      <Link
        to="/employees"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back to employees
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-border bg-card shadow-sm p-6 text-center">
          <Avatar className="h-24 w-24 mx-auto">
            <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold">
              {initials(employee.name)}
            </AvatarFallback>
          </Avatar>
          <h2 className="font-display text-xl font-bold mt-4">{employee.name}</h2>
          <p className="text-sm font-mono text-muted-foreground">{employee.employeeId}</p>
          <div className="mt-5 space-y-3 text-left">
            <Row icon={Phone} label="Phone Number" value={employee.phone} />
            <Row icon={User} label="Designation" value={employee.designation} />
            <Row icon={Building2} label="Station" value={employee.stationName} />
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat label="Used This Month" value={employee.leavesUsedThisMonth} />
            <Stat
              label="Remaining Leaves"
              value={employee.remainingLeaves}
              tone={employee.remainingLeaves >= 0 ? "success" : "destructive"}
            />
            <Stat label="Monthly Limit" value={4} />
            <Stat label="Last Leave Date" value={employee.lastLeaveDate ?? "-"} small />
          </div>

          {employee.monthlyLeaveLimitExceeded && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
              Monthly Leave Limit Exceeded
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="p-5 border-b border-border">
              <h3 className="font-display text-lg font-bold">Leave History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium">From Date</th>
                    <th className="text-left px-5 py-3 font-medium">To Date</th>
                    <th className="text-left px-5 py-3 font-medium">Days</th>
                    <th className="text-left px-5 py-3 font-medium">Reason</th>
                    <th className="text-left px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {employee.leaveHistory.map((leave) => (
                    <tr key={leave.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-5 py-3 whitespace-nowrap">{leave.fromDate}</td>
                      <td className="px-5 py-3 whitespace-nowrap">{leave.toDate}</td>
                      <td className="px-5 py-3 font-semibold">{leave.days}</td>
                      <td className="px-5 py-3 text-muted-foreground">{leave.reason}</td>
                      <td className="px-5 py-3">
                        <StatusBadge status={leave.status} />
                      </td>
                    </tr>
                  ))}
                  {employee.leaveHistory.length === 0 && (
                    <tr>
                      <td className="px-5 py-5 text-muted-foreground" colSpan={5}>
                        No leave history.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function Row({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  small,
}: {
  label: string;
  value: number | string;
  tone?: "success" | "destructive";
  small?: boolean;
}) {
  const className =
    tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : "";
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`font-display font-bold mt-1 ${small ? "text-lg" : "text-3xl"} ${className}`}>
        {value}
      </p>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
}

function apiUrl(path: string) {
  const apiBase = import.meta.env?.VITE_API_BASE ?? "";
  return apiBase ? `${apiBase.replace(/\/$/, "")}${path}` : path;
}
