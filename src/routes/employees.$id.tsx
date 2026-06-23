import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Building2, Phone, User } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppLayout, StatusBadge } from "@/components/AppLayout";
import { apiUrl } from "@/lib/api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  source?: string;
};

type EmployeeProfileData = {
  employeeId: string;
  name: string;
  phone: string;
  designation: string;
  stationName: string;
  dob?: string | null;
  doa?: string | null;
  doj?: string | null;
  leavesUsedThisMonth?: number;
  remainingLeaves?: number;
  lastLeaveDate?: string | null;
  monthlyLeaveLimitExceeded?: boolean;
  leaveHistory?: LeaveHistory[];
  totalLeavesTaken?: number;
  currentStatus?: string;
};

type Station = { id: string; stationName: string };

function EmployeeProfile() {
  const params = Route.useParams();
  const navigate = useNavigate();
  const id = (params as any).id as string | undefined;

  const [employee, setEmployee] = useState<EmployeeProfileData | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [editForm, setEditForm] = useState({
    employeeId: "",
    name: "",
    phone: "",
    designation: "",
    stationId: "",
    dob: "",
    doa: "",
    doj: "",
  });

  async function loadEmployee(options?: { silent?: boolean }) {
    if (!id) return;
    if (!options?.silent) setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/employees/${id}`), { cache: "no-store" });
      if (!res.ok) {
        setEmployee(null);
        return;
      }
      const data = await res.json();
      setEmployee(data);
    } catch (err) {
      console.error("EmployeeDetails: error", err);
      setEmployee(null);
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;
    async function run() {
      if (ignore) return;
      const stationRes = await fetch(apiUrl("/api/stations"), { cache: "no-store" });
      if (!ignore && stationRes.ok) setStations(await stationRes.json());
      await loadEmployee();
    }
    run();
    return () => {
      ignore = true;
    };
  }, [id]);

  function openDetailsEditor() {
    if (!employee) return;
    const station = stations.find((item) => item.stationName === employee.stationName);
    setEditForm({
      employeeId: employee.employeeId,
      name: employee.name,
      phone: employee.phone ?? "",
      designation: employee.designation,
      stationId: station?.id ?? stations[0]?.id ?? "",
      dob: employee.dob ?? "",
      doa: employee.doa ?? "",
      doj: employee.doj ?? "",
    });
    setEditOpen(true);
  }

  async function saveDetails() {
    if (!employee) return;
    if (!editForm.employeeId.trim() || !editForm.name.trim() || !editForm.designation.trim() || !editForm.stationId) {
      toast.error("Employee ID, name, designation and station are required");
      return;
    }

    setSavingDetails(true);
    try {
      const response = await fetch(apiUrl(`/api/employees/${employee.employeeId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        toast.error(`Failed to update employee: ${await response.text()}`);
        return;
      }

      const updated = await response.json();
      setEmployee((current) => current ? { ...current, ...updated } : current);
      setEditOpen(false);
      toast.success("Employee details updated successfully.");
      if (updated.employeeId !== employee.employeeId) {
        navigate({ to: "/employees/$id", params: { id: updated.employeeId } });
      } else {
        await loadEmployee({ silent: true });
      }
      window.dispatchEvent(new CustomEvent("app:refresh", {
        detail: { pages: ["dashboard", "stations", "employees", "reports"] },
      }));
    } finally {
      setSavingDetails(false);
    }
  }

  if (loading) {
    return (
      <AppLayout title="Employee Profile">
        <p className="text-sm text-muted-foreground">Loading employee details...</p>
      </AppLayout>
    );
  }

  if (!employee) {
    return (
      <AppLayout title="Not Found">
        <p className="text-sm text-muted-foreground">Employee not found</p>
      </AppLayout>
    );
  }

  const leaveHistory = (employee.leaveHistory || []).slice().sort((a, b) => {
    const da = Date.parse(a.fromDate || "");
    const db = Date.parse(b.fromDate || "");
    return db - da;
  });

  const totalLeavesTaken = leaveHistory.length ? leaveHistory.reduce((s, l) => s + (l.days || 0), 0) : 0;
  const leavesThisMonth = employee.leavesUsedThisMonth ?? 0;
  const longestLeave = leaveHistory.length ? Math.max(...leaveHistory.map((l) => l.days || 0)) : 0;
  const latestLeaveDate = leaveHistory[0]?.toDate ?? employee.lastLeaveDate ?? "-";

  return (
    <AppLayout title={employee.name} subtitle={employee.stationName}>
      <Link to="/employees" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
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
            <Row icon={User} label="Employee ID" value={employee.employeeId} />
            <Row icon={User} label="Name" value={employee.name} />
            <Row icon={User} label="Current Designation" value={employee.designation} />
            <Row icon={Building2} label="Station" value={employee.stationName} />
            <Row icon={User} label="DOB" value={employee.dob ?? "-"} />
            <Row icon={User} label="DOJ" value={employee.doj ?? "-"} />
            <Row icon={User} label="DOA" value={employee.doa ?? "-"} />
            <Row icon={Phone} label="Phone Number" value={employee.phone} />
          </div>
          <Button className="mt-5 w-full" onClick={openDetailsEditor}>
            Edit Employee Details
          </Button>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat label="Total Leaves Taken" value={totalLeavesTaken} />
            <Stat label="Leaves Taken This Month" value={leavesThisMonth} />
            <Stat label="Latest Leave Date" value={latestLeaveDate ?? "-"} small />
            <Stat label="Longest Leave" value={longestLeave} />
            <Stat label="Current Status" value={employee.currentStatus ?? "Present"} tone={employee.currentStatus === "On Leave" ? "destructive" : "success"} />
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
                    <th className="text-left px-5 py-3 font-medium">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveHistory.map((leave: any) => (
                    <tr key={leave.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-5 py-3 whitespace-nowrap">{leave.fromDate}</td>
                      <td className="px-5 py-3 whitespace-nowrap">{leave.toDate}</td>
                      <td className="px-5 py-3 font-semibold">{leave.days}</td>
                      <td className="px-5 py-3 text-muted-foreground">{leave.reason}</td>
                      <td className="px-5 py-3"><StatusBadge status={leave.status} /></td>
                      <td className="px-5 py-3 text-muted-foreground">{leave.source ?? "Manual"}</td>
                    </tr>
                  ))}
                  {leaveHistory.length === 0 && (
                    <tr>
                      <td className="px-5 py-5 text-muted-foreground" colSpan={6}>No leave records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Employee Details</DialogTitle>
            <DialogDescription>
              Change employee ID, name, phone, designation, station and service dates.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              placeholder="Employee ID"
              value={editForm.employeeId}
              onChange={(event) => setEditForm({ ...editForm, employeeId: event.target.value })}
            />
            <Input
              placeholder="Employee name"
              value={editForm.name}
              onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
            />
            <Input
              placeholder="Phone number"
              value={editForm.phone}
              onChange={(event) => setEditForm({ ...editForm, phone: event.target.value })}
            />
            <Input
              placeholder="Designation"
              value={editForm.designation}
              onChange={(event) => setEditForm({ ...editForm, designation: event.target.value })}
            />
            <Select
              value={editForm.stationId}
              onValueChange={(value) => setEditForm({ ...editForm, stationId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Station" />
              </SelectTrigger>
              <SelectContent>
                {stations.map((station) => (
                  <SelectItem key={station.id} value={station.id}>
                    {station.stationName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={editForm.dob}
              onChange={(event) => setEditForm({ ...editForm, dob: event.target.value })}
            />
            <Input
              type="date"
              value={editForm.doj}
              onChange={(event) => setEditForm({ ...editForm, doj: event.target.value })}
            />
            <Input
              type="date"
              value={editForm.doa}
              onChange={(event) => setEditForm({ ...editForm, doa: event.target.value })}
            />
            {editForm.employeeId !== employee.employeeId && (
              <div className="sm:col-span-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                Leave history will be moved to the new employee ID automatically.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={savingDetails}>
              Cancel
            </Button>
            <Button onClick={saveDetails} disabled={savingDetails}>
              {savingDetails ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

function Stat({ label, value, tone, small, }: { label: string; value: number | string; tone?: "success" | "destructive"; small?: boolean; }) {
  const className = tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : "";
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`font-display font-bold mt-1 ${small ? "text-lg" : "text-3xl"} ${className}`}>{value}</p>
    </div>
  );
}

function initials(name: string) {
  return name ? name.split(" ").map((part) => part[0]).slice(0, 2).join("") : "";
}
