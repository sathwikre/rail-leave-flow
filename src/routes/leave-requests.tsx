import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppLayout, StatusBadge } from "@/components/AppLayout";
import { apiUrl } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/leave-requests")({
  head: () => ({ meta: [{ title: "Leave Requests - Railway LMS" }] }),
  component: LeaveRequestsPage,
});

type LeaveRequest = {
  id: string;
  employeeId: string;
  employeeName?: string;
  stationName?: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  source?: "Manual" | "Email";
};

type EmployeeOption = {
  employeeId: string;
  name: string;
  designation?: string;
  stationName?: string;
  phone?: string;
};

function LeaveRequestsPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employeeId: "", fromDate: "", toDate: "", reason: "", reasonType: "Casual Leave", customReason: "" });
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeSearchOpen, setEmployeeSearchOpen] = useState(false);
  const [employeeInfo, setEmployeeInfo] = useState<null | {
    name: string;
    designation: string;
    stationName?: string;
    lastLeaveDate?: string | null;
    leavesUsedThisMonth?: number;
    remainingLeaves?: number;
  }>(null);
  const [employeeNotFound, setEmployeeNotFound] = useState(false);
  const [analysis, setAnalysis] = useState<null | { latestLeaveDate?: string | null; currentLeaves: number; requestedDays: number; totalAfterApproval: number; exceeded?: boolean }>(null);
  const [warning, setWarning] = useState<null | {
    id: string;
    employeeName?: string;
    latestLeaveDate?: string | null;
    currentLeaves: number;
    requestedDays: number;
    totalAfterApproval: number;
    exceeded?: boolean;
  }>(null);
  const [deleteTarget, setDeleteTarget] = useState<LeaveRequest | null>(null);

  const calculatedDays = useMemo(() => {
    if (!form.fromDate || !form.toDate) return 0;
    const from = new Date(`${form.fromDate}T00:00:00.000Z`);
    const to = new Date(`${form.toDate}T00:00:00.000Z`);
    if (to < from) return 0;
    return Math.floor((to.getTime() - from.getTime()) / 86400000) + 1;
  }, [form.fromDate, form.toDate]);

  const employeeMatches = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase();
    if (!query) return employees.slice(0, 8);

    return employees
      .filter((employee) =>
        employee.name.toLowerCase().includes(query) ||
        employee.employeeId.toLowerCase().includes(query) ||
        (employee.stationName ?? "").toLowerCase().includes(query) ||
        (employee.phone ?? "").toLowerCase().includes(query),
      )
      .slice(0, 8);
  }, [employeeSearch, employees]);

  // fetch employee info when employeeId changes (debounced)
  useEffect(() => {
    setEmployeeInfo(null);
    setEmployeeNotFound(false);
    if (!form.employeeId) return;
    let ignore = false;
    const id = form.employeeId.trim();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(apiUrl(`/api/employees/${encodeURIComponent(id)}`), { cache: "no-store" });
        if (!res.ok) {
          if (!ignore) setEmployeeNotFound(true);
          return;
        }
        const data = await res.json();
        if (!ignore) {
          setEmployeeInfo({
            name: data.name,
            designation: data.designation,
            stationName: data.stationName,
            lastLeaveDate: data.lastLeaveDate,
            leavesUsedThisMonth: data.leavesUsedThisMonth,
            remainingLeaves: data.remainingLeaves,
          });
        }
      } catch (e) {
        if (!ignore) setEmployeeNotFound(true);
      }
    }, 450);
    return () => {
      ignore = true;
      clearTimeout(t);
    };
  }, [form.employeeId]);

  // call prospective analysis when we have employee and dates
  useEffect(() => {
    setAnalysis(null);
    if (!employeeInfo || !form.fromDate || !form.toDate) return;
    let ignore = false;
    const t = setTimeout(async () => {
      try {
        const days = calculatedDays;
        const res = await fetch(apiUrl("/api/leave/analysis"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employeeId: form.employeeId.trim(), days, fromDate: form.fromDate, toDate: form.toDate }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!ignore) setAnalysis({ latestLeaveDate: data.latestLeaveDate, currentLeaves: data.currentLeaves, requestedDays: data.requestedDays, totalAfterApproval: data.totalAfterApproval, exceeded: data.exceededLimit });
      } catch (e) {
        // ignore
      }
    }, 250);
    return () => {
      ignore = true;
      clearTimeout(t);
    };
  }, [employeeInfo, form.fromDate, form.toDate, calculatedDays, form.employeeId]);

  useEffect(() => {
    loadRequests();
    loadEmployees();
    const iv = setInterval(loadRequests, 30000);
    return () => clearInterval(iv);
  }, []);

  async function loadRequests() {
    const response = await fetch(apiUrl("/api/leave"), { cache: "no-store" });
    if (response.ok) setRequests(await response.json());
  }

  async function loadEmployees() {
    const response = await fetch(apiUrl("/api/employees"), { cache: "no-store" });
    if (!response.ok) return;

    const data = await response.json();
    setEmployees(
      Array.isArray(data)
        ? data
            .filter((employee) => employee?.employeeId && employee?.name)
            .map((employee) => ({
              employeeId: employee.employeeId,
              name: employee.name,
              designation: employee.designation,
              stationName: employee.stationName,
              phone: employee.phone,
            }))
        : [],
    );
  }

  function selectEmployee(employee: EmployeeOption) {
    setForm((current) => ({ ...current, employeeId: employee.employeeId }));
    setEmployeeSearch(`${employee.name} (${employee.employeeId})`);
    setEmployeeSearchOpen(false);
    setEmployeeNotFound(false);
  }

  function resetLeaveForm() {
    setForm({ employeeId: "", fromDate: "", toDate: "", reason: "", reasonType: "Casual Leave", customReason: "" });
    setEmployeeSearch("");
    setEmployeeSearchOpen(false);
    setEmployeeInfo(null);
    setEmployeeNotFound(false);
    setAnalysis(null);
  }

  async function createLeave() {
    if (!form.employeeId || !form.fromDate || !form.toDate || !form.reasonType) {
      toast.error("Employee name, dates and reason are required");
      return;
    }
    if (form.reasonType === "Others" && !form.customReason) {
      toast.error("Please enter custom reason for 'Others' option");
      return;
    }

    const payload = {
      employeeId: form.employeeId.trim(),
      fromDate: form.fromDate,
      toDate: form.toDate,
      reasonType: form.reasonType,
      customReason: form.customReason,
    };

    const response = await fetch(apiUrl("/api/leave"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      toast.error(`Failed to create leave request: ${await response.text()}`);
      return;
    }

    toast.success("Leave request created");
    resetLeaveForm();
    setShowForm(false);
    const created = await response.json();
    await loadRequests();
    if (created) window.dispatchEvent(new CustomEvent("leave:created", { detail: { employeeId: created.employeeId } }));
  }

  async function setStatus(id: string, action: "approve" | "reject") {
    if (action === "approve") {
      // fetch analysis first and show confirmation dialog
      const res = await fetch(apiUrl(`/api/leave/${id}/analysis`));
      if (!res.ok) {
        toast.error("Unable to fetch leave analysis");
        return;
      }
      const analysis = await res.json();
      const req = requests.find((r) => r.id === id);
      setWarning({
        id,
        employeeName: req?.employeeName || req?.employeeId,
        latestLeaveDate: analysis.latestLeaveDate,
        currentLeaves: analysis.currentLeaves,
        requestedDays: analysis.requestedDays,
        totalAfterApproval: analysis.totalAfterApproval,
        exceeded: analysis.exceededLimit,
      } as any);
      // store exceeded flag in the DOM via a dataset on the element? Instead, keep logic in approveAnyway by refetching analysis when approving.
      return;
    }

    // reject
    const response = await fetch(apiUrl(`/api/leave/${id}/reject`), { method: "PATCH" });
    if (!response.ok) {
      toast.error(`Unable to reject leave request`);
      return;
    }
    toast.success("Leave rejected");
    await loadRequests();
    const reqItem = requests.find((r) => r.id === id);
    if (reqItem) window.dispatchEvent(new CustomEvent("leave:rejected", { detail: { employeeId: reqItem.employeeId } }));
  }

  async function approveAnyway() {
    if (!warning) return;
    // re-fetch analysis to determine if exceeded
    const analysisRes = await fetch(apiUrl(`/api/leave/${warning.id}/analysis`));
    if (!analysisRes.ok) {
      toast.error("Unable to fetch leave analysis");
      return;
    }
    const analysis = await analysisRes.json();
    const force = analysis.totalAfterApproval > 4;
    const response = await fetch(apiUrl(`/api/leave/${warning.id}/approve${force ? "?force=true" : ""}`), {
      method: "PATCH",
    });
    if (!response.ok) {
      toast.error("Unable to approve leave request");
      return;
    }
    setWarning(null);
    toast.success("Leave approved");
    // notify other views to refresh employee data
    const reqItem = requests.find((r) => r.id === warning.id);
    if (reqItem) window.dispatchEvent(new CustomEvent("leave:approved", { detail: { employeeId: reqItem.employeeId } }));
    await loadRequests();
  }

  async function deleteLeave() {
    if (!deleteTarget) return;

    const response = await fetch(apiUrl(`/api/leave/${deleteTarget.id}`), { method: "DELETE" });
    if (!response.ok) {
      toast.error("Unable to delete leave request");
      return;
    }

    toast.success("Leave request deleted");
    const employeeId = deleteTarget.employeeId;
    setDeleteTarget(null);
    await loadRequests();
    window.dispatchEvent(new CustomEvent("leave:deleted", { detail: { employeeId } }));
  }

  return (
    <AppLayout
      title="Leave Requests"
        subtitle="Manual entries from worker WhatsApp requests"
      actions={
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => loadRequests()}>
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowForm((value) => !value)}>
            <Plus className="h-4 w-4 mr-2" /> New Request
          </Button>
        </div>
      }
    >
      {showForm && (
        <div className="mb-6 rounded-lg border border-border bg-card p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative">
              <Input
                placeholder="Type employee name..."
                value={employeeSearch}
                onChange={(event) => {
                  setEmployeeSearch(event.target.value);
                  setEmployeeSearchOpen(true);
                  setForm((current) => ({ ...current, employeeId: "" }));
                  setEmployeeInfo(null);
                  setAnalysis(null);
                  setEmployeeNotFound(false);
                }}
                onFocus={() => setEmployeeSearchOpen(true)}
                onBlur={() => window.setTimeout(() => setEmployeeSearchOpen(false), 120)}
              />
              {employeeSearchOpen && employeeSearch && (
                <div className="absolute left-0 right-0 top-11 z-20 max-h-72 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-lg">
                  {employeeMatches.length > 0 ? (
                    employeeMatches.map((employee) => (
                      <button
                        key={employee.employeeId}
                        type="button"
                        className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectEmployee(employee)}
                      >
                        <div className="font-semibold">{employee.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {employee.employeeId} · {employee.designation ?? "-"} · {employee.stationName ?? "-"}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-sm text-muted-foreground">No employees found.</div>
                  )}
                </div>
              )}
              <div className="mt-2 text-sm">
                {employeeInfo ? (
                  <div className="space-y-1 text-sm">
                    <div className="font-semibold">{employeeInfo.name}</div>
                    <div className="text-xs">Employee ID: <strong>{form.employeeId}</strong></div>
                    <div className="text-xs text-muted-foreground">{employeeInfo.designation} — {employeeInfo.stationName}</div>
                    <div className="text-xs">Latest Leave Taken: <strong>{employeeInfo.lastLeaveDate ?? "-"}</strong></div>
                    <div className="text-xs">Leaves Used This Month: <strong>{employeeInfo.leavesUsedThisMonth ?? 0}</strong></div>
                    <div className={`text-xs font-semibold ${ (employeeInfo.leavesUsedThisMonth ?? 0) > 4 ? "text-destructive" : "text-success" }`}>Remaining Leaves: <strong>{employeeInfo.remainingLeaves ?? 0}</strong></div>
                  </div>
                ) : employeeNotFound ? (
                  <div className="text-destructive font-semibold">Employee not found.</div>
                ) : (
                  <div className="text-xs text-muted-foreground">Search and select employee name</div>
                )}
              </div>
            </div>

            <Input
              type="date"
              value={form.fromDate}
              onChange={(event) => setForm({ ...form, fromDate: event.target.value })}
            />
            <Input
              type="date"
              value={form.toDate}
              onChange={(event) => setForm({ ...form, toDate: event.target.value })}
            />

            <div>
              <Select value={form.reasonType} onValueChange={(val) => setForm({ ...form, reasonType: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Casual Leave">CL</SelectItem>
                  <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                  <SelectItem value="LAP">LAP</SelectItem>
                  <SelectItem value="Others">Others</SelectItem>
                </SelectContent>
              </Select>
              {form.reasonType === "Others" && (
                <Input className="mt-2" placeholder="Enter custom reason" value={form.customReason} onChange={(e) => setForm({ ...form, customReason: e.target.value })} />
              )}
            </div>

            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
              Days: <span className="font-bold">{calculatedDays}</span>
            </div>
          </div>

          {/* Summary card */}
          <div className="mt-3 p-3 rounded-md border border-border bg-muted/20">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Employee Name: <strong>{employeeInfo?.name ?? "-"}</strong></div>
              <div>Employee ID: <strong>{form.employeeId || "-"}</strong></div>
              <div>Station: <strong>{employeeInfo?.stationName ?? "-"}</strong></div>
              <div>Latest Leave Date: <strong>{analysis?.latestLeaveDate ?? employeeInfo?.lastLeaveDate ?? "-"}</strong></div>
              <div>Leaves Used This Month: <strong>{analysis?.currentLeaves ?? employeeInfo?.leavesUsedThisMonth ?? 0}</strong></div>
              <div>Requested Days: <strong>{analysis?.requestedDays ?? calculatedDays}</strong></div>
              <div>Total After Approval: <strong className={`${(analysis?.totalAfterApproval ?? 0) > 4 ? "text-destructive font-semibold" : "text-success"}`}>{analysis?.totalAfterApproval ?? "-"}</strong></div>
              <div>Reason: <strong>{form.reasonType === "Others" ? form.customReason || "Others" : form.reasonType}</strong></div>
            </div>
            {(analysis?.totalAfterApproval ?? 0) > 4 && <div className="mt-2 text-destructive font-semibold">⚠ Monthly Leave Limit Exceeded</div>}
          </div>

          <div className="mt-3">
            <Button className="mr-2" onClick={createLeave} disabled={!form.employeeId || employeeNotFound || !form.fromDate || !form.toDate}>
              Create Pending Request
            </Button>
            <Button variant="outline" onClick={() => { setShowForm(false); resetLeaveForm(); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3 font-medium">Employee</th>
                  <th className="text-left px-5 py-3 font-medium">Source</th>
                <th className="text-left px-5 py-3 font-medium">From</th>
                <th className="text-left px-5 py-3 font-medium">To</th>
                <th className="text-left px-5 py-3 font-medium">Days</th>
                <th className="text-left px-5 py-3 font-medium">Reason</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-left px-5 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-5 py-3">
                    <Link to="/employees/$id" params={{ id: request.employeeId }} className="font-semibold">
                      {request.employeeName ?? request.employeeId}
                    </Link>
                    <div className="text-xs font-mono text-muted-foreground">{request.employeeId}</div>
                    {request.stationName && (
                      <div className="text-xs text-muted-foreground">{request.stationName}</div>
                    )}
                  </td>
                    <td className="px-5 py-3">
                      {request.source === "Email" ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100">
                          Email
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted/10 text-muted-foreground border-border">
                          Manual
                        </Badge>
                      )}
                    </td>
                  <td className="px-5 py-3 whitespace-nowrap">{request.fromDate}</td>
                  <td className="px-5 py-3 whitespace-nowrap">{request.toDate}</td>
                  <td className="px-5 py-3 font-semibold">{request.days}</td>
                  <td className="px-5 py-3 text-muted-foreground">{request.reason}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={request.status} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      {request.status === "Pending" && (
                        <>
                        <Button size="sm" onClick={() => setStatus(request.id, "approve")}>
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setStatus(request.id, "reject")}
                        >
                          Reject
                        </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleteTarget(request)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AlertDialog open={Boolean(warning)} onOpenChange={(open) => !open && setWarning(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Monthly Leave Limit Exceeded</AlertDialogTitle>
            <AlertDialogDescription>
              {warning ? (
                <div className="space-y-2 text-sm">
                  <div>Employee: <strong>{warning.employeeName}</strong></div>
                  <div>Latest Leave Taken: <strong>{warning.latestLeaveDate ?? "-"}</strong></div>
                  <div>Leaves Used This Month: <strong>{warning.currentLeaves} days</strong></div>
                  <div>Requested Days: <strong>{warning.requestedDays} days</strong></div>
                  <div>Total After Approval: <strong>{warning.totalAfterApproval} days</strong></div>
                  {warning.exceeded ? (
                    <div className="mt-2 text-destructive font-semibold">⚠ Monthly Leave Limit Exceeded</div>
                  ) : (
                    <div className="mt-2 text-muted-foreground">Do you want to approve?</div>
                  )}
                </div>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={approveAnyway}>{warning?.exceeded ? "Approve Anyway" : "Approve"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Leave Request</AlertDialogTitle>
            <AlertDialogDescription>
              Delete this leave request for{" "}
              <strong>{deleteTarget?.employeeName ?? deleteTarget?.employeeId}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteLeave}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
