import { createFileRoute, Link } from "@tanstack/react-router";
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

const designationOptions = [
  "DY SS",
  "SS",
  "SM",
  "SMR",
  "APM",
  "P/MAN",
  "P/WOMAN",
  "CTNC",
  "SR.CLERK",
  "S/MASTER",
  "Other",
];

function EmployeeProfile() {
  const params = Route.useParams();
  const id = (params as any).id as string | undefined;

  const [employee, setEmployee] = useState<EmployeeProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [designationChoice, setDesignationChoice] = useState("");
  const [customDesignation, setCustomDesignation] = useState("");
  const [savingDesignation, setSavingDesignation] = useState(false);

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
      await loadEmployee();
    }
    run();
    return () => {
      ignore = true;
    };
  }, [id]);

  function openDesignationEditor() {
    if (!employee) return;
    const known = designationOptions.includes(employee.designation);
    setDesignationChoice(known ? employee.designation : "Other");
    setCustomDesignation(known ? "" : employee.designation);
    setEditOpen(true);
  }

  async function saveDesignation() {
    if (!employee) return;
    const nextDesignation = designationChoice === "Other" ? customDesignation.trim() : designationChoice;
    if (!nextDesignation) {
      toast.error("Please select or enter a designation");
      return;
    }

    setSavingDesignation(true);
    try {
      const response = await fetch(apiUrl(`/api/employees/${employee.employeeId}/designation`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ designation: nextDesignation }),
      });

      if (!response.ok) {
        toast.error(`Failed to update designation: ${await response.text()}`);
        return;
      }

      const updated = await response.json();
      setEmployee((current) => current ? { ...current, designation: updated.designation } : current);
      setEditOpen(false);
      toast.success("Designation updated successfully.");
      await loadEmployee({ silent: true });
      window.dispatchEvent(new CustomEvent("app:refresh", {
        detail: { pages: ["dashboard", "stations", "employees", "reports"] },
      }));
    } finally {
      setSavingDesignation(false);
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
          <Button className="mt-5 w-full" onClick={openDesignationEditor}>
            Edit Designation
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Designation</DialogTitle>
            <DialogDescription>
              Update only the designation for {employee.name}. Employee ID and station remain unchanged.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
              Current Designation: <strong>{employee.designation}</strong>
            </div>
            <Select value={designationChoice} onValueChange={setDesignationChoice}>
              <SelectTrigger>
                <SelectValue placeholder="Select designation" />
              </SelectTrigger>
              <SelectContent>
                {designationOptions.map((designation) => (
                  <SelectItem key={designation} value={designation}>
                    {designation}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {designationChoice === "Other" && (
              <Input
                value={customDesignation}
                onChange={(event) => setCustomDesignation(event.target.value)}
                placeholder="Enter designation"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={savingDesignation}>
              Cancel
            </Button>
            <Button onClick={saveDesignation} disabled={savingDesignation}>
              {savingDesignation ? "Saving..." : "Save"}
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
